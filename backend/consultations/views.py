from rest_framework import viewsets, filters, permissions
from .models import Consultation
from .serializers import ConsultationSerializer
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsMedecin

class ConsultationViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les consultations.
    - Création : Réservée aux médecins.
    - Lecture : Secrétaires, Médecins, Admins.
    - Met à jour le statut du RDV à TERMINE lors de la création de la consultation.
    """
    serializer_class = ConsultationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'rendezvous__patient__nom', 'rendezvous__patient__prenom']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMedecin()]
        return [permissions.IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = Consultation.objects.all()

        if user.role == 'MEDECIN':
            queryset = queryset.filter(rendezvous__medecin__utilisateur=user)

        rdv_id = self.request.query_params.get('rendezvous')
        patient_id = self.request.query_params.get('patient')

        if rdv_id:
            queryset = queryset.filter(rendezvous_id=rdv_id)
        if patient_id:
            queryset = queryset.filter(rendezvous__patient_id=patient_id)

        return queryset

    def perform_create(self, serializer):
        consultation = serializer.save()
        # Mettre à jour le statut du rendez-vous
        rdv = consultation.rendezvous
        rdv.statut = 'TERMINE'
        rdv.save(update_fields=['statut'])
