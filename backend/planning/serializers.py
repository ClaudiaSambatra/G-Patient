from rest_framework import serializers

from .models import AbsenceMedecin, GardeMedecin, HoraireMedecin


def nom_medecin(medecin):
    return f"Dr. {medecin.utilisateur.last_name} {medecin.utilisateur.first_name}".strip()


class _ValidationModeleMixin:
    """Applique les règles du modèle (clean) aux données de l'API."""

    def validate(self, attrs):
        instance = self.Meta.model(**{**({f.name: getattr(self.instance, f.name)
                                          for f in self.Meta.model._meta.concrete_fields
                                          if not f.primary_key} if self.instance else {}), **attrs})
        if self.instance:
            instance.pk = self.instance.pk
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            instance.clean()
        except DjangoValidationError as err:
            raise serializers.ValidationError(err.message_dict)
        return attrs


class HoraireMedecinSerializer(_ValidationModeleMixin, serializers.ModelSerializer):
    jour_display = serializers.CharField(source='get_jour_display', read_only=True)

    class Meta:
        model = HoraireMedecin
        fields = ['id', 'medecin', 'jour', 'jour_display', 'heure_debut', 'heure_fin']


class AbsenceMedecinSerializer(_ValidationModeleMixin, serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    medecin_nom = serializers.SerializerMethodField()
    nb_rdv_concernes = serializers.SerializerMethodField()

    class Meta:
        model = AbsenceMedecin
        fields = [
            'id', 'medecin', 'medecin_nom', 'date_debut', 'date_fin', 'type', 'type_display', 'motif',
            'nb_rdv_concernes', 'date_creation',
        ]
        read_only_fields = ['id', 'date_creation']

    def get_medecin_nom(self, obj):
        return nom_medecin(obj.medecin)

    def get_nb_rdv_concernes(self, obj):
        """RDV actifs pendant l'absence : ce sont eux qu'il faudra réaffecter ou décaler."""
        return obj.medecin.rendez_vous.filter(
            statut__in=['PLANIFIE', 'CONFIRME'],
            date_heure__date__gte=obj.date_debut, date_heure__date__lte=obj.date_fin,
        ).count()


class GardeMedecinSerializer(_ValidationModeleMixin, serializers.ModelSerializer):
    medecin_nom = serializers.SerializerMethodField()
    medecin_specialite = serializers.CharField(source='medecin.specialite', read_only=True)
    finit_le_lendemain = serializers.BooleanField(read_only=True)

    class Meta:
        model = GardeMedecin
        fields = [
            'id', 'medecin', 'medecin_nom', 'medecin_specialite', 'date', 'heure_debut', 'heure_fin',
            'finit_le_lendemain', 'motif', 'date_creation',
        ]
        read_only_fields = ['id', 'date_creation']

    def get_medecin_nom(self, obj):
        return nom_medecin(obj.medecin)


class ReaffectationSerializer(serializers.Serializer):
    medecin = serializers.IntegerField(min_value=1)
