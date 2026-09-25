from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsAdmin
from .models import StockMedicament
from .serializers import StockMedicamentSerializer

class StockMedicamentViewSet(viewsets.ModelViewSet):
    """
    CRUD pour le Stock de Médicaments (Pharmacie).
    Accessible aux Secrétaires, Médecins et Admins.
    """
    queryset = StockMedicament.objects.all()
    serializer_class = StockMedicamentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom']

    def get_permissions(self):
        # Seuls les admins peuvent supprimer un médicament de la base
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]
