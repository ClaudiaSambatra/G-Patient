from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin, IsSecretaireOuMedecinOuAdmin
from .models import Facture
from .serializers import FactureSerializer

class FactureViewSet(viewsets.ModelViewSet):
    """
    CRUD pour la Facturation.
    """
    queryset = Facture.objects.all().select_related('patient')
    serializer_class = FactureSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['patient__nom', 'patient__prenom', 'actes']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        statut = self.request.query_params.get('statut')
        patient_id = self.request.query_params.get('patient')

        if statut:
            queryset = queryset.filter(statut=statut)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        return queryset
