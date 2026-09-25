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
            # Un médecin ne voit que les ordonnances des consultations qu'il a effectuées
            queryset = queryset.filter(consultation__medecin=user)

        return queryset
