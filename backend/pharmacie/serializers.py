from rest_framework import serializers

from .models import MouvementStock, StockMedicament


class StockMedicamentSerializer(serializers.ModelSerializer):
    en_alerte = serializers.BooleanField(read_only=True)
    libelle = serializers.CharField(source='__str__', read_only=True)

    class Meta:
        model = StockMedicament
        fields = [
            'id', 'nom', 'dosage', 'forme', 'unite', 'libelle',
            'prix_unitaire', 'quantite', 'seuil_alerte', 'en_alerte', 'actif',
            'date_creation', 'date_modification',
        ]
        # La quantité ne change que par des mouvements tracés (entrée, sortie, ajustement).
        read_only_fields = ['id', 'quantite', 'date_creation', 'date_modification']


class StockMedicamentCreateSerializer(StockMedicamentSerializer):
    quantite_initiale = serializers.IntegerField(write_only=True, required=False, min_value=0, default=0)

    class Meta(StockMedicamentSerializer.Meta):
        fields = StockMedicamentSerializer.Meta.fields + ['quantite_initiale']


class MouvementStockSerializer(serializers.ModelSerializer):
    medicament_libelle = serializers.CharField(source='medicament.__str__', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = MouvementStock
        fields = [
            'id', 'medicament', 'medicament_libelle', 'type', 'type_display',
            'quantite', 'quantite_apres', 'motif', 'facture', 'auteur', 'auteur_nom', 'date',
        ]
        read_only_fields = fields

    def get_auteur_nom(self, obj):
        if obj.auteur:
            return obj.auteur.get_full_name() or obj.auteur.username
        return None


class EntreeStockSerializer(serializers.Serializer):
    quantite = serializers.IntegerField(min_value=1)
    motif = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


class AjustementStockSerializer(serializers.Serializer):
    quantite_reelle = serializers.IntegerField(min_value=0, help_text="Quantité comptée lors de l'inventaire")
    motif = serializers.CharField(max_length=255)
