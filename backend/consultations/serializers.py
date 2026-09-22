from rest_framework import serializers
from .models import Consultation

class ConsultationSerializer(serializers.ModelSerializer):
    patient_nom = serializers.CharField(source='rendezvous.patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='rendezvous.patient.prenom', read_only=True)
    medecin_nom = serializers.CharField(source='rendezvous.medecin.utilisateur.last_name', read_only=True)

    class Meta:
        model = Consultation
        fields = '__all__'
