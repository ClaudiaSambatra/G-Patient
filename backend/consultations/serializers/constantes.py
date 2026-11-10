from rest_framework import serializers
from consultations.models import ConstantesVitales, ConsultationHistorique


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
