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

    def validate(self, attrs):
        # Créer une instance temporaire pour exécuter clean()
        instance = RendezVous(**attrs)
        if self.instance:
            # En cas d'update, on met à jour l'instance existante en mémoire
            for attr, value in attrs.items():
                setattr(instance, attr, value)
            instance.pk = self.instance.pk
            
        try:
            instance.clean()
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            if hasattr(e, 'message_dict'):
                raise ValidationError(e.message_dict)
            raise ValidationError(str(e))
            
        return attrs
