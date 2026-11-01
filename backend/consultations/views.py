from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from .models import Consultation, RetourSansRendezVous
from .serializers import ConsultationSerializer, RetourSansRendezVousSerializer
from .services import calculer_eligibilite_controle
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsMedecin
from patients.models import Patient
from appointments.models import RendezVous
from accounts.models import Medecin


class ConsultationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsAuteurMedecin(permissions.BasePermission):
    """
    Permission médicale :
    - En lecture : Secrétaires et Admins ont accès en lecture globale ;
      Le médecin a accès à ses consultations et à la consultation d'origine s'il effectue un contrôle.
    - En écriture (PUT/PATCH) : Réservée au médecin auteur de la consultation ou à l'administrateur.
    - En suppression (DELETE) : Réservée exclusivement aux administrateurs (interdit aux médecins et secrétaires).
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.role in ['MEDECIN', 'ADMIN'] or request.user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN' or request.user.is_superuser:
            return True

        if request.method in permissions.SAFE_METHODS:
            if request.user.role == 'MEDECIN':
                if obj.medecin == request.user:
                    return True
                return RendezVous.objects.filter(
                    medecin__utilisateur=request.user,
                    type=RendezVous.Type.CONTROLE,
                    consultation_origine=obj
                ).exists()
            return True

        # Modification réservée au médecin auteur
        if request.method in ['PUT', 'PATCH']:
            return request.user.role == 'MEDECIN' and obj.medecin == request.user

        # Suppression interdite aux médecins ordinaires
        return False


class ConsultationViewSet(viewsets.ModelViewSet):
    """
    CRUD sécurisé pour les consultations médicales.
    - Création : Médecin (sur RDV au statut CONFIRME). Clôture atomique du RDV à TERMINE.
    - Modification : Médecin auteur uniquement avec motif de correction obligatoire.
    - Suppression : Interdite aux praticiens ordinaires pour garantir la valeur probante du dossier médical.
    - Lecture : Cloisonnée selon le praticien.
    """
    serializer_class = ConsultationSerializer
    pagination_class = ConsultationPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom', 'diagnostic']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMedecin(), IsAuteurMedecin()]
        return [permissions.IsAuthenticated(), IsSecretaireOuMedecinOuAdmin(), IsAuteurMedecin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Consultation.objects.all().select_related(
            'patient', 'medecin', 'rendez_vous', 'constantes'
        ).prefetch_related('historique__auteur')

        if user.role == 'MEDECIN' and self.action == 'list':
            from django.db.models import Q
            consult_origine_ids = RendezVous.objects.filter(
                medecin__utilisateur=user,
                type=RendezVous.Type.CONTROLE,
                consultation_origine__isnull=False
            ).values_list('consultation_origine_id', flat=True)
            queryset = queryset.filter(Q(medecin=user) | Q(id__in=consult_origine_ids)).distinct()

        # Filtres via URL params
        rdv_id = self.request.query_params.get('rendez_vous')
        patient_id = self.request.query_params.get('patient')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if rdv_id:
            queryset = queryset.filter(rendez_vous_id=rdv_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if date_debut:
            queryset = queryset.filter(date_consultation__date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_consultation__date__lte=date_fin)

        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            rendez_vous_data = serializer.validated_data.get('rendez_vous')
            if not rendez_vous_data:
                raise ValidationError({"rendez_vous": "Le rendez-vous est obligatoire pour créer une consultation."})

            # Verrouillage pessimiste en base pour empêcher les conditions de course et doublons
            rdv = RendezVous.objects.select_for_update().get(pk=rendez_vous_data.pk)

            # Vérification de l'état du rendez-vous
            if rdv.statut != RendezVous.Statut.CONFIRME:
                raise ValidationError({"rendez_vous": "Le rendez-vous doit être au statut CONFIRME pour pouvoir être consulté."})

            # Vérification de l'existence d'une consultation déjà enregistrée
            if hasattr(rdv, 'consultation') and rdv.consultation:
                raise ValidationError({"rendez_vous": "Ce rendez-vous possède déjà une consultation."})

            # Détermination du médecin responsable
            if (self.request.user.role == 'ADMIN' or self.request.user.is_superuser) and rdv.medecin:
                medecin_user = rdv.medecin.utilisateur
            else:
                medecin_user = self.request.user

            extra_kwargs = {'medecin': medecin_user}
            if rdv.consultation_origine:
                extra_kwargs['consultation_origine'] = rdv.consultation_origine

            serializer.save(**extra_kwargs)

            # Clôture atomique du rendez-vous
            rdv.statut = RendezVous.Statut.TERMINE
            rdv.save(update_fields=['statut', 'date_modification'])


class RetourSansRendezVousViewSet(viewsets.ModelViewSet):
    """
    Gestion des signalements d'accueil pour les retours de patients sans rendez-vous.
    Permet à la secrétaire d'accueillir le patient, de vérifier l'éligibilité au contrôle gratuit
    (15 jours) sans jamais divulguer les informations médicales confidentielles (diagnostic, observations).
    """
    queryset = RetourSansRendezVous.objects.all().select_related(
        'patient', 'medecin_souhaite', 'signale_par', 'rendez_vous_cree'
    )
    serializer_class = RetourSansRendezVousSerializer
    permission_classes = [permissions.IsAuthenticated, IsSecretaireOuMedecinOuAdmin]
    pagination_class = ConsultationPagination

    def perform_create(self, serializer):
        serializer.save(signale_par=self.request.user)

    @action(detail=False, methods=['get'], url_path='verifier-eligibilite')
    def verifier_eligibilite(self, request):
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response(
                {"detail": "Le paramètre 'patient' est requis."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response(
                {"detail": "Patient introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )

        eligibilite = calculer_eligibilite_controle(patient)
        last_consult = Consultation.objects.filter(patient=patient).order_by('-date_consultation').first()

        dernier_passage = None
        if last_consult:
            dernier_passage = {
                'date': last_consult.date_consultation,
                'medecin_nom': f"Dr. {last_consult.medecin.last_name} {last_consult.medecin.first_name}".strip(),
                'type': last_consult.rendez_vous.type if last_consult.rendez_vous else 'CONSULTATION',
                'date_controle_recommandee': last_consult.date_controle_recommandee
            }

        return Response({
            'patient_id': patient.id,
            'patient_nom': f"{patient.nom} {patient.prenom}",
            'patient_contact': patient.contact,
            'patient_date_naissance': patient.date_naissance,
            'dernier_passage': dernier_passage,
            'eligibilite': eligibilite
        })

    @action(detail=True, methods=['post'], url_path='creer-rdv-jour')
    def creer_rdv_jour(self, request, pk=None):
        """
        Option A : Permet à la secrétaire de convertir l'accueil du retour sans RDV
        en un rendez-vous du jour immédiat (CONFIRME), type CONTROLE (si éligible) ou CONSULTATION,
        disponible immédiatement dans le flux du praticien.
        """
        retour = self.get_object()

        if retour.statut == RetourSansRendezVous.Statut.PRIS_EN_CHARGE and retour.rendez_vous_cree:
            return Response(
                {"detail": f"Un rendez-vous a déjà été créé pour ce signalement (RDV #{retour.rendez_vous_cree_id})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Déterminer le médecin
        medecin_id = request.data.get('medecin')
        medecin = None
        if medecin_id:
            medecin = Medecin.objects.filter(pk=medecin_id).first()
        elif retour.medecin_souhaite:
            medecin = Medecin.objects.filter(utilisateur=retour.medecin_souhaite).first()

        if not medecin:
            # Essayer de reprendre le praticien de la dernière consultation
            last_c = Consultation.objects.filter(patient=retour.patient).order_by('-date_consultation').first()
            if last_c and last_c.medecin:
                medecin = Medecin.objects.filter(utilisateur=last_c.medecin).first()

        if not medecin:
            medecin = Medecin.objects.first()

        if not medecin:
            return Response(
                {"detail": "Aucun praticien n'est disponible dans l'établissement pour créer le rendez-vous."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calcul d'éligibilité
        eligibilite = calculer_eligibilite_controle(retour.patient)
        est_controle_gratuit = eligibilite.get('est_gratuit', False)

        rdv_type = RendezVous.Type.CONTROLE if est_controle_gratuit else RendezVous.Type.CONSULTATION
        consultation_origine = None
        if est_controle_gratuit and eligibilite.get('consultation_origine_id'):
            consultation_origine = Consultation.objects.filter(pk=eligibilite['consultation_origine_id']).first()

        with transaction.atomic():
            rdv = RendezVous(
                patient=retour.patient,
                medecin=medecin,
                date_heure=timezone.now(),
                statut=RendezVous.Statut.CONFIRME,
                type=rdv_type,
                consultation_origine=consultation_origine,
                motif=retour.motif_administratif or "Retour sans rendez-vous"
            )
            rdv.save()

            retour.rendez_vous_cree = rdv
            retour.statut = RetourSansRendezVous.Statut.PRIS_EN_CHARGE
            retour.save(update_fields=['rendez_vous_cree', 'statut'])

        return Response({
            'detail': "Rendez-vous immédiat créé avec succès.",
            'rendez_vous_id': rdv.id,
            'type': rdv.type,
            'statut_paiement': rdv.statut_paiement,
            'statut': rdv.statut,
            'medecin_nom': f"Dr. {medecin.utilisateur.last_name} {medecin.utilisateur.first_name}".strip(),
            'explication_eligibilite': eligibilite.get('explication')
        }, status=status.HTTP_201_CREATED)
