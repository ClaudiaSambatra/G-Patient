from rest_framework import serializers
from .models import Consultation
from patients.models import Patient
from appointments.models import RendezVous


class ConsultationSerializer(serializers.ModelSerializer):
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    medecin_nom = serializers.SerializerMethodField(read_only=True)
    statut_paiement = serializers.SerializerMethodField(read_only=True)

    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        required=False
    )
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
            'statut_paiement',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_consultation', 'date_creation', 'date_modification']

    def get_statut_paiement(self, obj):
        if obj.rendez_vous:
            return obj.rendez_vous.statut_paiement
        return 'GRATUIT'

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
        request = self.context.get('request')

        if not self.instance:
            # Contrôles à la création
            rendez_vous = attrs.get('rendez_vous')
            if not rendez_vous:
                raise serializers.ValidationError({"rendez_vous": "Le rendez-vous est obligatoire pour créer une consultation."})

            # 1. Le rendez-vous doit appartenir au médecin connecté
            if request and hasattr(request, 'user') and getattr(request.user, 'role', None) == 'MEDECIN':
                if rendez_vous.medecin.utilisateur != request.user:
                    raise serializers.ValidationError({"rendez_vous": "Ce rendez-vous ne vous est pas attribué."})

            # 2. Le rendez-vous doit être au statut CONFIRME (aucun blocage selon le paiement)
            if rendez_vous.statut != 'CONFIRME':
                raise serializers.ValidationError({"rendez_vous": "Le rendez-vous doit être au statut CONFIRME pour pouvoir être consulté."})

            # 3. Le patient de la consultation doit être celui du rendez-vous (le déduire du rendez-vous, ne pas le prendre du client)
            attrs['patient'] = rendez_vous.patient

        else:
            # Modification : les champs rendez-vous, patient et médecin ne sont pas modifiables
            if 'rendez_vous' in attrs and attrs['rendez_vous'] != self.instance.rendez_vous:
                raise serializers.ValidationError({"rendez_vous": "Le rendez-vous d'une consultation ne peut pas être modifié."})
            if 'patient' in attrs and attrs['patient'] != self.instance.patient:
                raise serializers.ValidationError({"patient": "Le patient d'une consultation ne peut pas être modifié."})

        return attrs

    def update(self, instance, validated_data):
        # Sécurité supplémentaire : verrouiller rendez-vous, patient et médecin
        validated_data.pop('rendez_vous', None)
        validated_data.pop('patient', None)
        validated_data.pop('medecin', None)
        return super().update(instance, validated_data)
