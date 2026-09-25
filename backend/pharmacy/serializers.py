from rest_framework import serializers
from .models import StockMedicament

class StockMedicamentSerializer(serializers.ModelSerializer):
    en_alerte = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockMedicament
        fields = ['id', 'nom', 'quantite_disponible', 'seuil_alerte', 'unite', 'date_derniere_mise_a_jour', 'en_alerte']
        read_only_fields = ['id', 'date_derniere_mise_a_jour']
