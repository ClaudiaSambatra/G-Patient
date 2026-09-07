from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'nom', 'prenom', 'date_naissance', 'contact', 'adresse',
            'antecedents', 'allergies', 'groupe_sanguin',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['id', 'date_creation', 'date_modification']
