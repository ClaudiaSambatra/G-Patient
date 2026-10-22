from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import RendezVous
from .serializers import RendezVousSerializer
from accounts.permissions import (
    IsSecretaireOuMedecinOuAdmin,
    IsSecretaireOuAdmin,
    IsAdmin,
)

class RendezVousViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les rendez-vous.
    Lecture accessible aux Secrétaires, Médecins, et Admins.
    Création/Modification réservées aux Secrétaires et Admins.
    Suppression définitive réservée exclusivement aux Administrateurs.
    """
    serializer_class = RendezVousSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom', 'medecin__utilisateur__last_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated, IsSecretaireOuMedecinOuAdmin]
        elif self.action == 'destroy':
            permission_classes = [IsAuthenticated, IsAdmin]
        else:
            permission_classes = [IsAuthenticated, IsSecretaireOuAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        queryset = RendezVous.objects.all().select_related('patient', 'medecin__utilisateur', 'consultation')

        # Si l'utilisateur est un médecin, il ne voit que ses rendez-vous
        if user.role == 'MEDECIN':
            queryset = queryset.filter(medecin__utilisateur=user)
        else:
            medecin_id = self.request.query_params.get('medecin')
            if medecin_id:
                queryset = queryset.filter(medecin_id=medecin_id)

        # Filtre statut
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        # Filtres par date (jour exact ou intervalle)
        date_str = self.request.query_params.get('date')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if date_str:
            queryset = queryset.filter(date_heure__date=date_str)
        if date_debut:
            queryset = queryset.filter(date_heure__date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_heure__date__lte=date_fin)

        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.statut == RendezVous.Statut.TERMINE or (hasattr(instance, 'consultation') and instance.consultation is not None):
            return Response(
                {"detail": "Impossible de supprimer un rendez-vous terminé ou lié à une consultation."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        instance = self.get_object()
        if instance.statut in [RendezVous.Statut.ANNULE, RendezVous.Statut.TERMINE]:
            return Response(
                {"detail": f"Un rendez-vous avec le statut '{instance.get_statut_display()}' ne peut plus être annulé."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.statut = RendezVous.Statut.ANNULE
        instance.save(update_fields=['statut', 'date_modification'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

