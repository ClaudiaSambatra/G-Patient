from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import RendezVous
from .serializers import RendezVousSerializer
from accounts.permissions import IsSecretaireOuMedecinOuAdmin, IsSecretaireOuAdmin

class RendezVousViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les rendez-vous.
    Lecture accessible aux Secrétaires, Médecins, et Admins.
    Création/Modification réservées aux Secrétaires et Admins.
    """
    serializer_class = RendezVousSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom', 'medecin__utilisateur__last_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated, IsSecretaireOuMedecinOuAdmin]
        else:
            permission_classes = [IsAuthenticated, IsSecretaireOuAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        queryset = RendezVous.objects.all()

        # Si l'utilisateur est un médecin, il ne voit que ses rendez-vous
        if user.role == 'MEDECIN':
            queryset = queryset.filter(medecin__utilisateur=user)

        # Filtres via query params
        medecin_id = self.request.query_params.get('medecin')
        date_str = self.request.query_params.get('date')

        if medecin_id:
            queryset = queryset.filter(medecin_id=medecin_id)
        if date_str:
            queryset = queryset.filter(date_heure__date=date_str)

        return queryset

from .models import AbsenceMedecin
from .serializers import AbsenceMedecinSerializer
from accounts.permissions import IsMedecin

class AbsenceMedecinViewSet(viewsets.ModelViewSet):
    """
    Gestion des absences / disponibilités des médecins.
    Un médecin peut déclarer ses absences, la secrétaire peut aussi les gérer.
    """
    serializer_class = AbsenceMedecinSerializer

    def get_permissions(self):
        return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]

    def get_queryset(self):
        user = self.request.user
        queryset = AbsenceMedecin.objects.all()

        if user.role == 'MEDECIN':
            queryset = queryset.filter(medecin__utilisateur=user)

        medecin_id = self.request.query_params.get('medecin')
        if medecin_id:
            queryset = queryset.filter(medecin_id=medecin_id)
            
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'MEDECIN':
            serializer.save(medecin=user.medecin)
        else:
            serializer.save()
