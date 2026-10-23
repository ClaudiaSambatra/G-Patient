from rest_framework import serializers
from .models import Patient, DocumentMedical


class DocumentMedicalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentMedical
        fields = ['id', 'patient', 'nom', 'fichier', 'type_document', 'date_depot']
        read_only_fields = ['id', 'date_depot']


class PatientSerializer(serializers.ModelSerializer):
    # Expose la propriété @property age sous forme d'entier en lecture seule
    age = serializers.IntegerField(read_only=True)
    documents = DocumentMedicalSerializer(many=True, read_only=True)

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
            'documents',
            'date_creation',
            'date_modification',
        ]
        read_only_fields = ['id', 'age', 'date_creation', 'date_modification']
