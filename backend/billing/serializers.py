from rest_framework import serializers
from .models import Facture

class FactureSerializer(serializers.ModelSerializer):
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)

    class Meta:
        model = Facture
        fields = ['id', 'patient', 'patient_nom', 'patient_prenom', 'actes', 'montant', 'statut', 'date_creation']
        read_only_fields = ['id', 'date_creation']
