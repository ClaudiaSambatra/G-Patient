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
        if self.action in ['list', 'retrieve', 'controle_eligible']:
            permission_classes = [IsAuthenticated, IsSecretaireOuMedecinOuAdmin]
        elif self.action == 'destroy':
            permission_classes = [IsAuthenticated, IsAdmin]
        else:
            permission_classes = [IsAuthenticated, IsSecretaireOuAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        queryset = RendezVous.objects.all().select_related(
            'patient', 'medecin__utilisateur', 'consultation', 'consultation_origine', 'facture'
        )

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

        # Filtre type
        type_rdv = self.request.query_params.get('type')
        if type_rdv:
            queryset = queryset.filter(type=type_rdv)

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

    @action(detail=False, methods=['get'], url_path='controle-eligible')
    def controle_eligible(self, request):
        patient_id = request.query_params.get('patient')
        date_str = request.query_params.get('date')

        if not patient_id or not date_str:
            return Response({"eligible": False, "consultation_origine": None})

        from datetime import datetime, timedelta, date as dt_date
        from consultations.models import Consultation

        try:
            if 'T' in date_str:
                target_date = datetime.fromisoformat(date_str).date()
            else:
                target_date = dt_date.fromisoformat(date_str)
        except Exception:
            return Response({"eligible": False, "consultation_origine": None})

        date_min = target_date - timedelta(days=15)

        eligible_consult = Consultation.objects.filter(
            patient_id=patient_id,
            rendez_vous__type=RendezVous.Type.CONSULTATION,
            rendez_vous__statut=RendezVous.Statut.TERMINE,
            date_consultation__date__gte=date_min,
            date_consultation__date__lte=target_date
        ).order_by('-date_consultation', '-id').first()

        if eligible_consult:
            return Response({"eligible": True, "consultation_origine": eligible_consult.id})
        return Response({"eligible": False, "consultation_origine": None})

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        instance = self.get_object()
        if instance.statut in [RendezVous.Statut.ANNULE, RendezVous.Statut.TERMINE]:
            return Response(
                {"detail": f"Un rendez-vous avec le statut '{instance.get_statut_display()}' ne peut plus être annulé."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.statut = RendezVous.Statut.ANNULE
        instance.save()
        if hasattr(instance, 'facture') and instance.facture and instance.facture.statut == 'IMPAYEE':
            instance.facture.statut = 'ANNULEE'
            instance.facture.save(update_fields=['statut'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='retablir')
    def retablir(self, request, pk=None):
        instance = self.get_object()
        if instance.statut != RendezVous.Statut.ANNULE:
            return Response(
                {"detail": "Seul un rendez-vous annulé peut être rétabli en 'Planifié'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.statut = RendezVous.Statut.PLANIFIE
        instance.save()
        if hasattr(instance, 'facture') and instance.facture and instance.facture.statut == 'ANNULEE':
            instance.facture.statut = 'IMPAYEE'
            instance.facture.save(update_fields=['statut'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
