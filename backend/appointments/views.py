from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import RendezVous
from .serializers import RendezVousSerializer
from accounts.permissions import IsSecretaireOuMedecinOuAdmin

class RendezVousViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les rendez-vous.
    Accessible aux Secrétaires, Médecins, et Admins.
    Les médecins ne voient que leurs propres rendez-vous.
    """
    serializer_class = RendezVousSerializer
    permission_classes = [IsAuthenticated, IsSecretaireOuMedecinOuAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom', 'medecin__utilisateur__last_name']

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
