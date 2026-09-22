from rest_framework import viewsets, filters, permissions
from .models import Consultation
from .serializers import ConsultationSerializer
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsMedecin

class ConsultationViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les consultations.
    - Création/Modification : Réservée aux médecins.
    - Lecture : Secrétaires, Médecins, Admins.
    - Met à jour le statut du RDV à TERMINE lors de la création de la consultation.
    """
    serializer_class = ConsultationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMedecin()]
        return [permissions.IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Consultation.objects.all().select_related('patient', 'medecin', 'rendez_vous')

        if user.role == 'MEDECIN':
            # Le médecin ne voit que ses propres consultations
            queryset = queryset.filter(medecin=user)

        # Filtres via URL params
        rdv_id = self.request.query_params.get('rendez_vous')
        patient_id = self.request.query_params.get('patient')

        if rdv_id:
            queryset = queryset.filter(rendez_vous_id=rdv_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        return queryset

    def perform_create(self, serializer):
        # Assigner automatiquement le médecin connecté
        consultation = serializer.save(medecin=self.request.user)
        
        # Mettre à jour le statut du rendez-vous lié si existant
        if consultation.rendez_vous:
            rdv = consultation.rendez_vous
            rdv.statut = 'TERMINE'
            rdv.save(update_fields=['statut', 'date_modification'])
