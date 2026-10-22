from rest_framework import serializers
from .models import Consultation
from patients.models import Patient
from appointments.models import RendezVous

class ConsultationSerializer(serializers.ModelSerializer):
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    medecin_nom = serializers.SerializerMethodField(read_only=True)
    
    # Rendre le médecin en read_only car il sera défini via request.user
    medecin = serializers.PrimaryKeyRelatedField(read_only=True)
    rendez_vous = serializers.PrimaryKeyRelatedField(
        queryset=RendezVous.objects.all(),
        required=False,
        allow_null=True,
        validators=[]
    )

    class Meta:
        model = Consultation
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom',
            'medecin', 'medecin_nom', 'rendez_vous',
            'date_consultation', 'motif', 'observations', 'diagnostic', 'compte_rendu',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_consultation', 'date_creation', 'date_modification']

    def get_medecin_nom(self, obj):
        return f"Dr. {obj.medecin.last_name} {obj.medecin.first_name}".strip()

    def validate_rendez_vous(self, value):
        if value:
            existing = Consultation.objects.filter(rendez_vous=value)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError("Ce rendez-vous possède déjà une consultation.")
        return value

    def validate(self, attrs):
        rendez_vous = attrs.get('rendez_vous')
        patient = attrs.get('patient')

        if rendez_vous and patient and rendez_vous.patient != patient:
            raise serializers.ValidationError({"patient": "Le patient sélectionné ne correspond pas au patient du rendez-vous."})
        return attrs
