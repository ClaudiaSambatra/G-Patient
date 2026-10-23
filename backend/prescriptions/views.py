from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsMedecin, IsSecretaireOuMedecinOuAdmin
from .models import Ordonnance
from .serializers import OrdonnanceSerializer


class OrdonnanceViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les Ordonnances.
    Création/Modification: Médecin uniquement.
    Lecture: Admin, Médecin, Secrétaire.
    """
    queryset = Ordonnance.objects.all().select_related('consultation__patient', 'consultation__medecin')
    serializer_class = OrdonnanceSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsMedecin()]
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        consultation_id = self.request.query_params.get('consultation')
        patient_id = self.request.query_params.get('patient')

        if consultation_id:
            queryset = queryset.filter(consultation_id=consultation_id)
        if patient_id:
            queryset = queryset.filter(consultation__patient_id=patient_id)

        user = self.request.user
        if user.role == 'MEDECIN':
            from appointments.models import RendezVous
            from django.db.models import Q
            consult_origine_ids = RendezVous.objects.filter(
                medecin__utilisateur=user,
                type=RendezVous.Type.CONTROLE,
                consultation_origine__isnull=False
            ).values_list('consultation_origine_id', flat=True)
            queryset = queryset.filter(Q(consultation__medecin=user) | Q(consultation_id__in=consult_origine_ids)).distinct()

        return queryset

    def perform_create(self, serializer):
        consultation = serializer.validated_data.get('consultation')
        if self.request.user.role == 'MEDECIN' and consultation.medecin != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez rédiger une ordonnance que pour vos propres consultations.")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role == 'MEDECIN' and serializer.instance.consultation.medecin != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez modifier que les ordonnances de vos propres consultations.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role == 'MEDECIN' and instance.consultation.medecin != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez supprimer que les ordonnances de vos propres consultations.")
        instance.delete()
