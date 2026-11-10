from rest_framework import serializers
from consultations.models import Consultation, RetourSansRendezVous
from consultations.services import calculer_eligibilite_controle


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
