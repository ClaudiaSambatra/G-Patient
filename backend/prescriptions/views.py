from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from accounts.permissions import IsSecretaireOuMedecinOuAdmin
from .models import Ordonnance, OrdonnanceHistorique
from .serializers import OrdonnanceSerializer


class IsStrictlyMedecin(BasePermission):
    """Accès réservé uniquement aux praticiens avec le rôle MEDECIN (actes médicaux de prescription)."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role == 'MEDECIN'
        )


class OrdonnanceViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion sécurisée des Ordonnances Médicales.
    - Création/Modification/Annulation : Médecin prescripteur autorisé uniquement.
    - Lecture : Médecin (consultations propres/contrôles), Secrétaire et Admin (délivrance/facturation).
    - Protection stricte : interdiction de supprimer une ordonnance liée à une facture.
    """
    queryset = Ordonnance.objects.all().select_related(
        'consultation__patient',
        'consultation__medecin',
        'facture'
    ).prefetch_related(
        'lignes',
        'historique__auteur'
    )
    serializer_class = OrdonnanceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = [
        'numero',
        'consultation__patient__nom',
        'consultation__patient__prenom',
        'consultation__medecin__last_name',
        'consultation__medecin__first_name',
        'medicaments',
        'lignes__medicament'
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
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if consultation_id:
            queryset = queryset.filter(consultation_id=consultation_id)
        if patient_id:
            queryset = queryset.filter(consultation__patient_id=patient_id)
        if numero:
            queryset = queryset.filter(numero__icontains=numero)
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
                Q(consultation__medecin=user) | Q(consultation_id__in=consult_origine_ids)
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
        if serializer.instance.consultation.medecin != user:
            raise PermissionDenied("Vous n'êtes pas le praticien responsable de cette consultation.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.consultation.medecin != user:
            raise PermissionDenied("Vous n'êtes pas le praticien responsable de cette consultation.")
        if hasattr(instance, 'facture') and instance.facture:
            raise ValidationError(
                {"detail": "Impossible de supprimer une ordonnance ayant déjà fait l'objet d'une facture comptable."}
            )
        instance.delete()

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        """Permet au praticien d'annuler formellement une ordonnance avec motif tracé."""
        instance = self.get_object()
        user = request.user
        if instance.consultation.medecin != user:
            raise PermissionDenied("Vous n'êtes pas le praticien responsable de cette consultation.")

        if hasattr(instance, 'facture') and instance.facture and instance.facture.statut == 'PAYEE':
            return Response(
                {"detail": "Impossible d'annuler une ordonnance dont la facture a déjà été encaissée."},
                status=status.HTTP_400_BAD_REQUEST
            )

        motif = request.data.get('motif', '').strip()
        if not motif:
            return Response(
                {"detail": "Le motif d'annulation est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.statut = Ordonnance.Statut.ANNULEE
        instance.save(update_fields=['statut', 'date_modification'])

        OrdonnanceHistorique.objects.create(
            ordonnance=instance,
            auteur=request.user,
            motif_correction=f"Annulation : {motif}",
            champs_modifies=['statut']
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)
