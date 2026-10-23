from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import (
    IsAdmin,
    IsSecretaireOuAdmin,
    IsSecretaireOuMedecinOuAdmin,
)
from appointments.models import RendezVous
from .models import Facture
from .serializers import FactureSerializer
from .pdf import generate_recu_pdf


class FactureViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion de la facturation.
    - SECRETAIRE et ADMIN : création, modification, encaissement.
    - MEDECIN : consultation en lecture seule et téléchargement du reçu.
    - ADMIN : suppression (hors factures payées).
    """
    queryset = Facture.objects.all().select_related('patient', 'rendez_vous', 'ordonnance', 'encaisse_par')
    serializer_class = FactureSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['patient__nom', 'patient__prenom', 'designation', 'actes']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'recu']:
            return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        else:
            return [IsAuthenticated(), IsSecretaireOuAdmin()]

    def get_queryset(self):
        queryset = super().get_queryset()
        statut = self.request.query_params.get('statut')
        facture_type = self.request.query_params.get('type')
        patient_id = self.request.query_params.get('patient')

        if statut:
            queryset = queryset.filter(statut=statut)
        if facture_type:
            queryset = queryset.filter(type=facture_type)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        rendez_vous_id = self.request.query_params.get('rendez_vous')
        if rendez_vous_id:
            queryset = queryset.filter(rendez_vous_id=rendez_vous_id)
            
        return queryset

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.statut == Facture.StatutPaiement.PAYEE:
            return Response(
                {"detail": "Une facture payée ne peut pas être modifiée."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.statut == Facture.StatutPaiement.PAYEE:
            return Response(
                {"detail": "Une facture payée ne peut pas être modifiée."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.statut == Facture.StatutPaiement.PAYEE:
            return Response(
                {"detail": "Une facture payée ne peut pas être supprimée."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='encaisser')
    def encaisser(self, request, pk=None):
        instance = self.get_object()
        if instance.statut == Facture.StatutPaiement.PAYEE:
            return Response(
                {"detail": "Cette facture est déjà payée."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if instance.statut == Facture.StatutPaiement.ANNULEE:
            return Response(
                {"detail": "Une facture annulée ne peut pas être encaissée."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            instance.statut = Facture.StatutPaiement.PAYEE
            instance.date_paiement = timezone.now()
            instance.encaisse_par = request.user
            instance.save(update_fields=['statut', 'date_paiement', 'encaisse_par'])

            # Si facture de CONSULTATION, confirmer automatiquement le rendez-vous
            if instance.type == Facture.Type.CONSULTATION:
                if not instance.rendez_vous:
                    unlinked_rdv = RendezVous.objects.filter(
                        patient=instance.patient,
                        type=RendezVous.Type.CONSULTATION,
                        facture__isnull=True
                    ).order_by('-date_heure').first()
                    if unlinked_rdv:
                        instance.rendez_vous = unlinked_rdv
                        instance.save(update_fields=['rendez_vous'])

                if instance.rendez_vous:
                    rdv = instance.rendez_vous
                    if rdv.statut == RendezVous.Statut.PLANIFIE:
                        rdv.statut = RendezVous.Statut.CONFIRME
                        rdv.save(update_fields=['statut', 'date_modification'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='recu')
    def recu(self, request, pk=None):
        instance = self.get_object()
        if instance.statut != Facture.StatutPaiement.PAYEE:
            return Response(
                {"detail": "Impossible d'imprimer un reçu pour une facture non payée."},
                status=status.HTTP_400_BAD_REQUEST
            )
        pdf_bytes = generate_recu_pdf(instance)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="recu_{instance.id}.pdf"'
        return response
