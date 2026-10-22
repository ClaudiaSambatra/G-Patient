from rest_framework import serializers
from .models import Ordonnance

class OrdonnanceSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(source='consultation.patient.id', read_only=True)
    patient_nom = serializers.CharField(source='consultation.patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='consultation.patient.prenom', read_only=True)
    medecin_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Ordonnance
        fields = ['id', 'consultation', 'patient_id', 'medicaments', 'posologie', 'duree', 'date_creation', 'patient_nom', 'patient_prenom', 'medecin_nom']
        read_only_fields = ['id', 'date_creation']

    def get_medecin_nom(self, obj):
        return f"Dr. {obj.consultation.medecin.last_name} {obj.consultation.medecin.first_name}".strip()
