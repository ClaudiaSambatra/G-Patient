from rest_framework import serializers
from django.utils import timezone
from .models import Consultation, ConstantesVitales, ConsultationHistorique, RetourSansRendezVous
from patients.models import Patient
from appointments.models import RendezVous
from .services import calculer_eligibilite_controle


class ConstantesVitalesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConstantesVitales
        fields = [
            'id', 'temperature', 'poids', 'taille',
            'tension_arterielle', 'frequence_cardiaque', 'date_prise'
        ]
        read_only_fields = ['id', 'date_prise']


class ConsultationHistoriqueSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ConsultationHistorique
        fields = [
            'id', 'auteur', 'auteur_nom', 'date_modification',
            'motif_correction', 'champs_modifies',
            'anciennes_valeurs', 'nouvelles_valeurs'
        ]
        read_only_fields = fields

    def get_auteur_nom(self, obj):
        if obj.auteur:
            full = f"{obj.auteur.last_name} {obj.auteur.first_name}".strip()
            return full if full else obj.auteur.username
        return "Praticien"


class ConsultationSerializer(serializers.ModelSerializer):
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    patient_date_naissance = serializers.DateField(source='patient.date_naissance', read_only=True)
    patient_contact = serializers.CharField(source='patient.contact', read_only=True)
    patient_allergies = serializers.CharField(source='patient.allergies', read_only=True)
    patient_antecedents = serializers.CharField(source='patient.antecedents', read_only=True)
    medecin_nom = serializers.SerializerMethodField(read_only=True)
    statut_paiement = serializers.SerializerMethodField(read_only=True)

    constantes = ConstantesVitalesSerializer(required=False, allow_null=True)
    historique = ConsultationHistoriqueSerializer(many=True, read_only=True)
    motif_correction = serializers.CharField(write_only=True, required=False, allow_blank=True)

    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        required=False
    )
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
            'patient_date_naissance', 'patient_contact',
            'patient_allergies', 'patient_antecedents',
            'medecin', 'medecin_nom', 'rendez_vous',
            'date_consultation', 'motif', 'observations', 'diagnostic', 'compte_rendu',
            'date_controle_recommandee',
            'constantes', 'historique', 'motif_correction',
            'statut_paiement',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_consultation', 'date_creation', 'date_modification']

    def get_statut_paiement(self, obj):
        if obj.rendez_vous:
            return obj.rendez_vous.statut_paiement
        return 'GRATUIT'

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"Dr. {obj.medecin.last_name} {obj.medecin.first_name}".strip()
        return "Dr. Inconnu"

    def validate_rendez_vous(self, value):
        if value:
            existing = Consultation.objects.filter(rendez_vous=value)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError("Ce rendez-vous possède déjà une consultation.")
        return value

    def validate_date_controle_recommandee(self, value):
        if value:
            ref_date = timezone.now().date()
            if self.instance and self.instance.date_consultation:
                ref_date = self.instance.date_consultation.date()
            if value < ref_date:
                raise serializers.ValidationError("La date de contrôle recommandée ne peut pas être antérieure à la date de consultation.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')

        if not self.instance:
            # Création
            rendez_vous = attrs.get('rendez_vous')
            if not rendez_vous:
                raise serializers.ValidationError({"rendez_vous": "Le rendez-vous est obligatoire pour créer une consultation."})

            if request and hasattr(request, 'user') and getattr(request.user, 'role', None) == 'MEDECIN':
                if rendez_vous.medecin.utilisateur != request.user:
                    raise serializers.ValidationError({"rendez_vous": "Ce rendez-vous ne vous est pas attribué."})

            if rendez_vous.statut != 'CONFIRME':
                raise serializers.ValidationError({"rendez_vous": "Le rendez-vous doit être au statut CONFIRME pour pouvoir être consulté."})

            attrs['patient'] = rendez_vous.patient

        else:
            # Modification : verrouillage des champs structurels
            if 'rendez_vous' in attrs and attrs['rendez_vous'] != self.instance.rendez_vous:
                raise serializers.ValidationError({"rendez_vous": "Le rendez-vous d'une consultation ne peut pas être modifié."})
            if 'patient' in attrs and attrs['patient'] != self.instance.patient:
                raise serializers.ValidationError({"patient": "Le patient d'une consultation ne peut pas être modifié."})

            # Vérification du motif de correction obligatoire
            motif_correction = (attrs.get('motif_correction') or '').strip()
            # Identifier s'il y a un changement effectif sur les champs
            has_changes = False
            for field in ['motif', 'observations', 'diagnostic', 'compte_rendu', 'date_controle_recommandee']:
                if field in attrs and getattr(self.instance, field) != attrs[field]:
                    has_changes = True
                    break

            if 'constantes' in attrs:
                has_changes = True

            if has_changes and not motif_correction:
                raise serializers.ValidationError({
                    "motif_correction": "Le motif de correction est obligatoire pour modifier une consultation enregistrée."
                })

        return attrs

    def create(self, validated_data):
        constantes_data = validated_data.pop('constantes', None)
        validated_data.pop('motif_correction', None)

        consultation = super().create(validated_data)

        if constantes_data:
            ConstantesVitales.objects.create(consultation=consultation, **constantes_data)

        return consultation

    def update(self, instance, validated_data):
        motif_correction = (validated_data.pop('motif_correction', None) or '').strip()
        constantes_data = validated_data.pop('constantes', None)
        validated_data.pop('rendez_vous', None)
        validated_data.pop('patient', None)
        validated_data.pop('medecin', None)

        # Enregistrement de l'historique d'audit
        champs_modifies = []
        anciennes_valeurs = {}
        nouvelles_valeurs = {}

        for field in ['motif', 'observations', 'diagnostic', 'compte_rendu', 'date_controle_recommandee']:
            if field in validated_data:
                old_val = getattr(instance, field)
                new_val = validated_data[field]
                # Convertir les dates en string pour le JSON
                old_str = old_val.isoformat() if hasattr(old_val, 'isoformat') else old_val
                new_str = new_val.isoformat() if hasattr(new_val, 'isoformat') else new_val
                if old_val != new_val:
                    champs_modifies.append(field)
                    anciennes_valeurs[field] = old_str
                    nouvelles_valeurs[field] = new_str

        if constantes_data is not None:
            champs_modifies.append('constantes')
            anciennes_valeurs['constantes'] = ConstantesVitalesSerializer(getattr(instance, 'constantes', None)).data if hasattr(instance, 'constantes') else None
            nouvelles_valeurs['constantes'] = {k: str(v) for k, v in constantes_data.items()}

        if champs_modifies:
            request = self.context.get('request')
            auteur = request.user if request and hasattr(request, 'user') and request.user.is_authenticated else instance.medecin
            ConsultationHistorique.objects.create(
                consultation=instance,
                auteur=auteur,
                motif_correction=motif_correction or "Correction enregistrée",
                champs_modifies=champs_modifies,
                anciennes_valeurs=anciennes_valeurs,
                nouvelles_valeurs=nouvelles_valeurs
            )

        consultation = super().update(instance, validated_data)

        if constantes_data is not None:
            if hasattr(consultation, 'constantes') and consultation.constantes:
                for attr, val in constantes_data.items():
                    setattr(consultation.constantes, attr, val)
                consultation.constantes.save()
            else:
                ConstantesVitales.objects.create(consultation=consultation, **constantes_data)

        return consultation


class RetourSansRendezVousSerializer(serializers.ModelSerializer):
    """
    Sérialiseur d'accueil administratif :
    Donne accès aux données administratives et à l'éligibilité au contrôle
    sans JAMAIS divulguer les notes cliniques (diagnostic, observations, compte-rendu).
    """
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    patient_date_naissance = serializers.DateField(source='patient.date_naissance', read_only=True)
    patient_contact = serializers.CharField(source='patient.contact', read_only=True)
    patient_adresse = serializers.CharField(source='patient.adresse', read_only=True)
    patient_allergies = serializers.CharField(source='patient.allergies', read_only=True)
    patient_antecedents = serializers.CharField(source='patient.antecedents', read_only=True)

    medecin_souhaite_nom = serializers.SerializerMethodField(read_only=True)
    signale_par_nom = serializers.SerializerMethodField(read_only=True)
    dernier_passage = serializers.SerializerMethodField(read_only=True)
    date_controle_recommandee = serializers.SerializerMethodField(read_only=True)
    eligibilite = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RetourSansRendezVous
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom',
            'patient_date_naissance', 'patient_contact', 'patient_adresse',
            'patient_allergies', 'patient_antecedents',
            'medecin_souhaite', 'medecin_souhaite_nom',
            'date_signalement', 'motif_administratif',
            'statut', 'signale_par', 'signale_par_nom',
            'rendez_vous_cree',
            'dernier_passage', 'date_controle_recommandee', 'eligibilite'
        ]
        read_only_fields = ['id', 'date_signalement', 'statut', 'signale_par', 'rendez_vous_cree']

    def get_medecin_souhaite_nom(self, obj):
        if obj.medecin_souhaite:
            return f"Dr. {obj.medecin_souhaite.last_name} {obj.medecin_souhaite.first_name}".strip()
        return "Non spécifié"

    def get_signale_par_nom(self, obj):
        if obj.signale_par:
            full = f"{obj.signale_par.last_name} {obj.signale_par.first_name}".strip()
            return full if full else obj.signale_par.username
        return ""

    def get_dernier_passage(self, obj):
        last_consult = Consultation.objects.filter(patient=obj.patient).order_by('-date_consultation').first()
        if not last_consult:
            return None
        return {
            'date': last_consult.date_consultation,
            'medecin_nom': f"Dr. {last_consult.medecin.last_name} {last_consult.medecin.first_name}".strip(),
            'type': last_consult.rendez_vous.type if last_consult.rendez_vous else 'CONSULTATION'
        }

    def get_date_controle_recommandee(self, obj):
        last_consult = Consultation.objects.filter(patient=obj.patient).order_by('-date_consultation').first()
        if last_consult and last_consult.date_controle_recommandee:
            return last_consult.date_controle_recommandee
        return None

    def get_eligibilite(self, obj):
        return calculer_eligibilite_controle(obj.patient, reference_date=obj.date_signalement)
