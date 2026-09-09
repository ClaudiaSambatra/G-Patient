from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializers import PatientSerializer
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsAdmin


class PatientViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les patients (module 2 du cahier des charges).
    Recherche multicritères (module 14) via ?search=.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'prenom', 'contact']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]
