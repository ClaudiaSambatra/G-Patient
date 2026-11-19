from django.db import transaction
from django.db.models import F
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsSecretaireOuAdmin, IsSecretaireOuMedecinOuAdmin
from .models import MouvementStock, StockMedicament
from .serializers import (
    AjustementStockSerializer,
    EntreeStockSerializer,
    MouvementStockSerializer,
    StockMedicamentCreateSerializer,
    StockMedicamentSerializer,
)
from .services import enregistrer_mouvement


class CataloguePagination(PageNumberPagination):
    # Le catalogue est chargé en entier par les listes déroulantes (ordonnances) : ?page_size= autorisé.
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 500


class StockMedicamentViewSet(viewsets.ModelViewSet):
    """
    Catalogue des médicaments de la pharmacie du cabinet.
    - Lecture : secrétaire, médecin (pour prescrire), admin.
    - Création, modification, entrées et inventaires : secrétaire et admin.
    - Suppression : admin, uniquement si aucun mouvement (sinon désactiver le médicament).
    Filtres : ?search=, ?alerte=1, ?actif=1|0
    """
    queryset = StockMedicament.objects.all()
    pagination_class = CataloguePagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'dosage', 'forme']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsSecretaireOuMedecinOuAdmin()]
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsSecretaireOuAdmin()]

    def get_serializer_class(self):
        if self.action == 'create':
            return StockMedicamentCreateSerializer
        if self.action == 'entree':
            return EntreeStockSerializer
        if self.action == 'ajustement':
            return AjustementStockSerializer
        return StockMedicamentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get('alerte') in ('1', 'true'):
            queryset = queryset.filter(quantite__lte=F('seuil_alerte'))
        actif = params.get('actif')
        if actif in ('1', 'true'):
            queryset = queryset.filter(actif=True)
        elif actif in ('0', 'false'):
            queryset = queryset.filter(actif=False)
        return queryset

    def perform_create(self, serializer):
        quantite_initiale = serializer.validated_data.pop('quantite_initiale', 0)
        with transaction.atomic():
            medicament = serializer.save()
            if quantite_initiale:
                enregistrer_mouvement(
                    medicament, MouvementStock.Type.ENTREE, quantite_initiale,
                    self.request.user, motif="Stock initial",
                )
                medicament.refresh_from_db()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.mouvements.exists():
            return Response(
                {"detail": "Ce médicament a un historique de mouvements : désactivez-le plutôt que de le supprimer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def entree(self, request, pk=None):
        """Réception d'une livraison : ajoute la quantité au stock."""
        medicament = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enregistrer_mouvement(
            medicament, MouvementStock.Type.ENTREE, serializer.validated_data['quantite'],
            request.user, motif=serializer.validated_data['motif'] or "Réception",
        )
        medicament.refresh_from_db()
        return Response(StockMedicamentSerializer(medicament).data)

    @action(detail=True, methods=['post'])
    def ajustement(self, request, pk=None):
        """Inventaire, perte ou péremption : aligne le stock sur la quantité réellement comptée."""
        medicament = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variation = serializer.validated_data['quantite_reelle'] - medicament.quantite
        if variation == 0:
            return Response(
                {"quantite_reelle": "La quantité comptée est identique au stock actuel."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        enregistrer_mouvement(
            medicament, MouvementStock.Type.AJUSTEMENT, variation,
            request.user, motif=serializer.validated_data['motif'],
        )
        medicament.refresh_from_db()
        return Response(StockMedicamentSerializer(medicament).data)


class MouvementStockViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Historique des mouvements (lecture seule). Filtres : ?medicament=<id>, ?type=ENTREE|SORTIE|AJUSTEMENT"""
    queryset = MouvementStock.objects.select_related('medicament', 'auteur')
    serializer_class = MouvementStockSerializer
    permission_classes = [IsAuthenticated, IsSecretaireOuAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get('medicament'):
            queryset = queryset.filter(medicament_id=params['medicament'])
        if params.get('type'):
            queryset = queryset.filter(type=params['type'])
        return queryset
