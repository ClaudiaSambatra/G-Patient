from rest_framework import serializers

from .models import EntreeJournal


class EntreeJournalSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    reussie = serializers.BooleanField(read_only=True)

    class Meta:
        model = EntreeJournal
        fields = [
            'id', 'date', 'utilisateur', 'nom_utilisateur', 'role', 'action', 'action_display',
            'ressource', 'objet_id', 'methode', 'chemin', 'statut', 'reussie', 'adresse_ip', 'agent',
        ]
        read_only_fields = fields
