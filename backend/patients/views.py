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


from rest_framework.parsers import MultiPartParser, FormParser
from .models import DocumentMedical
from .serializers import DocumentMedicalSerializer


class DocumentMedicalViewSet(viewsets.ModelViewSet):
    queryset = DocumentMedical.objects.all()
    serializer_class = DocumentMedicalSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset
