from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    # Expose la propriété @property age sous forme d'entier en lecture seule
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id',
            'nom',
            'prenom',
            'sexe',
            'date_naissance',
            'age',
            'contact',
            'adresse',
            'antecedents',
            'allergies',
            'groupe_sanguin',
            'date_creation',
            'date_modification',
        ]
        read_only_fields = ['id', 'age', 'date_creation', 'date_modification']