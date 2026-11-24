from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Medecin, Utilisateur
from accounts.permissions import IsSecretaireOuAdmin
from appointments.models import RendezVous
from config.parametres import param_date, param_identifiant
from .models import AbsenceMedecin, HoraireMedecin
from .serializers import AbsenceMedecinSerializer, HoraireMedecinSerializer, ReaffectationSerializer, nom_medecin
from .services import absence_du_jour, creneaux_libres, indisponibilite, rdv_a_reaffecter, remplacants_possibles


def gere_le_planning(user):
    return user.role in (Utilisateur.Role.SECRETAIRE, Utilisateur.Role.ADMIN) or user.is_superuser


class _PlanningMedecinMixin:
    """
    Lecture : tout utilisateur connecté (pour savoir quand un médecin consulte).
    Écriture : secrétaire et admin pour tous les médecins ; un médecin pour son propre planning.
    Filtre : ?medecin=<id>
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().select_related('medecin__utilisateur')
        medecin_id = param_identifiant(self.request, 'medecin')
        if medecin_id:
            queryset = queryset.filter(medecin_id=medecin_id)
        return queryset

    def _verifier_droit(self, medecin):
        user = self.request.user
        if gere_le_planning(user):
            return
        if getattr(user, 'medecin_profile', None) and user.medecin_profile.pk == medecin.pk:
            return
        raise PermissionDenied("Vous ne pouvez modifier que votre propre planning.")

    def perform_create(self, serializer):
        self._verifier_droit(serializer.validated_data['medecin'])
        serializer.save()

    def perform_update(self, serializer):
        self._verifier_droit(serializer.instance.medecin)
        self._verifier_droit(serializer.validated_data.get('medecin', serializer.instance.medecin))
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_droit(instance.medecin)
        instance.delete()


class HoraireMedecinViewSet(_PlanningMedecinMixin, viewsets.ModelViewSet):
    queryset = HoraireMedecin.objects.all()
    serializer_class = HoraireMedecinSerializer
    pagination_class = None


class AbsenceMedecinViewSet(_PlanningMedecinMixin, viewsets.ModelViewSet):
    """Absences planifiées. ?a_venir=1 : seulement celles qui ne sont pas terminées."""
    queryset = AbsenceMedecin.objects.all()
    serializer_class = AbsenceMedecinSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('a_venir') in ('1', 'true'):
            queryset = queryset.filter(date_fin__gte=timezone.localdate())
        # Les absences les plus récentes en haut de la liste
        return queryset.order_by('-date_debut', '-id')

    def perform_create(self, serializer):
        self._verifier_droit(serializer.validated_data['medecin'])
        serializer.save(creee_par=self.request.user)


class RdvAReaffecterViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Rendez-vous à venir dont le médecin n'est plus disponible (absence ou hors horaires).
    La secrétaire choisit pour chacun un remplaçant disponible, ou décale le RDV.
    """
    permission_classes = [IsAuthenticated, IsSecretaireOuAdmin]
    pagination_class = None

    def _rdv(self, pk):
        rdv = RendezVous.objects.select_related('medecin__utilisateur', 'patient').filter(pk=pk).first()
        if not rdv:
            return None
        return rdv

    @staticmethod
    def _serialiser(rdv, raison):
        return {
            'id': rdv.id,
            'date_heure': rdv.date_heure,
            'patient_id': rdv.patient_id,
            'patient_nom': f"{rdv.patient.nom} {rdv.patient.prenom}".strip(),
            'medecin_id': rdv.medecin_id,
            'medecin_nom': nom_medecin(rdv.medecin),
            'medecin_specialite': rdv.medecin.specialite,
            'type': rdv.type,
            'statut': rdv.statut,
            'motif': rdv.motif,
            'raison': raison,
        }

    def list(self, request):
        medecin = None
        medecin_id = param_identifiant(request, 'medecin')
        if medecin_id:
            medecin = Medecin.objects.filter(pk=medecin_id).first()
        return Response([self._serialiser(rdv, raison) for rdv, raison in rdv_a_reaffecter(medecin)])

    @action(detail=True, methods=['get'])
    def remplacants(self, request, pk=None):
        rdv = self._rdv(pk)
        if not rdv:
            return Response({"detail": "Rendez-vous introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response([
            {'id': m.id, 'nom': nom_medecin(m), 'specialite': m.specialite,
             'meme_specialite': (m.specialite or '').strip().lower() == (rdv.medecin.specialite or '').strip().lower()}
            for m in remplacants_possibles(rdv)
        ])

    @action(detail=True, methods=['post'])
    def reaffecter(self, request, pk=None):
        serializer = ReaffectationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            rdv = RendezVous.objects.select_for_update().filter(pk=pk).first()
            if not rdv:
                return Response({"detail": "Rendez-vous introuvable."}, status=status.HTTP_404_NOT_FOUND)
            if rdv.statut not in ('PLANIFIE', 'CONFIRME'):
                return Response({"detail": "Seul un rendez-vous planifié ou confirmé peut être réaffecté."},
                                status=status.HTTP_400_BAD_REQUEST)
            remplacant = Medecin.objects.select_related('utilisateur').filter(
                pk=serializer.validated_data['medecin']).first()
            if not remplacant:
                return Response({"medecin": "Médecin introuvable."}, status=status.HTTP_400_BAD_REQUEST)
            if remplacant.pk not in {m.pk for m in remplacants_possibles(rdv)}:
                raison = indisponibilite(remplacant, rdv.date_heure) or "Ce médecin a déjà un rendez-vous à cette heure."
                return Response({"medecin": raison}, status=status.HTTP_400_BAD_REQUEST)
            ancien = nom_medecin(rdv.medecin)
            rdv.medecin = remplacant
            note = f"Remplace {ancien}"
            rdv.motif = f"{rdv.motif} ({note})" if rdv.motif else note
            rdv.save(update_fields=['medecin', 'motif', 'date_modification'])
        return Response(self._serialiser(rdv, None))


class CreneauxLibresView(APIView):
    """
    GET /api/planning/creneaux/?medecin=<id>&date=AAAA-MM-JJ
    Créneaux de DUREE_RDV_MINUTES encore libres pour ce médecin ce jour-là (aide à la prise de RDV).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.conf import settings
        from rest_framework.exceptions import ValidationError

        medecin_id = param_identifiant(request, 'medecin')
        jour = param_date(request, 'date')
        if not medecin_id or not jour:
            raise ValidationError({"detail": "Les paramètres « medecin » et « date » sont obligatoires."})
        medecin = Medecin.objects.select_related('utilisateur').filter(pk=medecin_id).first()
        if not medecin:
            return Response({"medecin": "Médecin introuvable."}, status=status.HTTP_404_NOT_FOUND)
        absence = absence_du_jour(medecin, jour)
        return Response({
            'medecin': medecin.id,
            'date': jour,
            'duree_minutes': settings.DUREE_RDV_MINUTES,
            'horaires_definis': medecin.horaires.exists(),
            'absence': (absence.get_type_display() if absence.type != AbsenceMedecin.Type.AUTRE else "Absent")
            if absence else None,
            'creneaux': creneaux_libres(medecin, jour),
        })
