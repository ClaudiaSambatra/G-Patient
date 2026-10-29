from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from accounts.permissions import IsSecretaireOuMedecinOuAdmin
from .models import DemandeExamen, DemandeExamenHistorique
from .serializers import DemandeExamenSerializer


class IsStrictlyMedecin(BasePermission):
    """Accès réservé uniquement aux praticiens avec le rôle MEDECIN (actes médicaux de prescription)."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role == 'MEDECIN'
        )


class DemandeExamenViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion sécurisée des Demandes d'Examens Médicaux (Biologie & Imagerie externe).
    - Création / Modification / Annulation : Médecin prescripteur autorisé uniquement.
    - Consultation & Impression : Médecin, Secrétaire et Administrateur (orientation du patient).
    - Préservation médico-légale : Suppression physique interdite (annulation motivée requise).
    - Aucun flux de facturation interne : examens réalisés et réglés chez des prestataires externes.
    """
    queryset = DemandeExamen.objects.all().select_related(
        'consultation__patient',
        'consultation__medecin',
        'patient',
        'medecin'
    ).prefetch_related(
        'lignes',
        'historique__auteur'
    )
    serializer_class = DemandeExamenSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'numero',
        'patient__nom',
        'patient__prenom',
        'medecin__last_name',
        'medecin__first_name',
        'lignes__nom_examen',
        'renseignements_cliniques'
    ]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'annuler']:
            return [IsAuthenticated(), IsStrictlyMedecin()]
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        consultation_id = self.request.query_params.get('consultation')
        patient_id = self.request.query_params.get('patient')
        numero = self.request.query_params.get('numero')
        statut = self.request.query_params.get('statut')
        categorie = self.request.query_params.get('categorie')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if consultation_id:
            queryset = queryset.filter(consultation_id=consultation_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if numero:
            queryset = queryset.filter(numero__icontains=numero)
        if statut:
            queryset = queryset.filter(statut=statut)
        if categorie:
            queryset = queryset.filter(lignes__categorie=categorie).distinct()
        if date_debut:
            queryset = queryset.filter(date_creation__date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_creation__date__lte=date_fin)

        user = self.request.user
        if user.role == 'MEDECIN':
            from appointments.models import RendezVous
            from django.db.models import Q
            consult_origine_ids = RendezVous.objects.filter(
                medecin__utilisateur=user,
                type=RendezVous.Type.CONTROLE,
                consultation_origine__isnull=False
            ).values_list('consultation_origine_id', flat=True)
            queryset = queryset.filter(
                Q(medecin=user) | Q(consultation__medecin=user) | Q(consultation_id__in=consult_origine_ids)
            ).distinct()

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        consultation = serializer.validated_data.get('consultation')
        if consultation.medecin != user:
            raise PermissionDenied("Vous n'êtes pas le praticien responsable de cette consultation.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if serializer.instance.medecin != user:
            raise PermissionDenied("Vous n'êtes pas le praticien prescripteur de cette demande d'examens.")
        serializer.save()

    def perform_destroy(self, instance):
        raise ValidationError(
            {"detail": "La suppression physique d'une demande d'examen est interdite afin de préserver l'historique médico-légal. Veuillez procéder à une annulation motivée."}
        )

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        """Permet au praticien prescripteur d'annuler formellement une demande avec motif tracé."""
        instance = self.get_object()
        user = request.user
        if instance.medecin != user:
            raise PermissionDenied("Vous n'êtes pas le praticien prescripteur de cette demande d'examens.")

        if instance.statut == DemandeExamen.Statut.ANNULEE:
            return Response(
                {"detail": "Cette demande d'examens est déjà annulée."},
                status=status.HTTP_400_BAD_REQUEST
            )

        motif = request.data.get('motif', '').strip()
        if not motif:
            return Response(
                {"detail": "Le motif d'annulation est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.statut = DemandeExamen.Statut.ANNULEE
        instance.save(update_fields=['statut', 'date_modification'])

        DemandeExamenHistorique.objects.create(
            demande=instance,
            auteur=request.user,
            motif_correction=f"Annulation : {motif}",
            champs_modifies=['statut']
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)
