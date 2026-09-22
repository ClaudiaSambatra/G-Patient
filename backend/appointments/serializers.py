from rest_framework import serializers
from .models import RendezVous
from patients.models import Patient
from accounts.models import Medecin

class RendezVousSerializer(serializers.ModelSerializer):
    patient_nom = serializers.SerializerMethodField()
    medecin_nom = serializers.SerializerMethodField()
    patient_contact = serializers.CharField(source='patient.contact', read_only=True)

    class Meta:
        model = RendezVous
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.nom} {obj.patient.prenom}"

    def get_medecin_nom(self, obj):
        return f"Dr. {obj.medecin.utilisateur.last_name} {obj.medecin.utilisateur.first_name}"
