from rest_framework import viewsets, filters
from .models import Patient
from .serializers import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les patients (module 2 du cahier des charges).
    Recherche multicritères (module 14) via ?search=.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'prenom', 'contact']
