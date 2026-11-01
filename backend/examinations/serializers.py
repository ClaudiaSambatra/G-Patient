from rest_framework import serializers
from .models import DemandeExamen, LigneDemandeExamen, DemandeExamenHistorique


class LigneDemandeExamenSerializer(serializers.ModelSerializer):
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)

    class Meta:
        model = LigneDemandeExamen
        fields = [
            'id', 'nom_examen', 'categorie', 'categorie_display',
            'instructions', 'ordre'
        ]


class DemandeExamenHistoriqueSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DemandeExamenHistorique
        fields = [
            'id', 'auteur', 'auteur_nom', 'date_modification',
            'motif_correction', 'champs_modifies',
            'anciennes_lignes', 'nouvelles_lignes'
        ]
        read_only_fields = fields

    def get_auteur_nom(self, obj):
        if obj.auteur:
            full = f"{obj.auteur.last_name} {obj.auteur.first_name}".strip()
            return f"Dr. {full}" if full else obj.auteur.username
        return "Praticien"


class DemandeExamenSerializer(serializers.ModelSerializer):
    lignes = LigneDemandeExamenSerializer(many=True, required=False)
    historique = DemandeExamenHistoriqueSerializer(many=True, read_only=True)
    motif_correction = serializers.CharField(write_only=True, required=False, allow_blank=True)

    patient = serializers.IntegerField(source='patient.id', read_only=True)
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    patient_date_naissance = serializers.DateField(source='patient.date_naissance', read_only=True)
    patient_contact = serializers.CharField(source='patient.contact', read_only=True)

    medecin_id = serializers.IntegerField(source='medecin.id', read_only=True)
    medecin_nom = serializers.SerializerMethodField(read_only=True)
    medecin_specialite = serializers.SerializerMethodField(read_only=True)
    medecin_numero_ordre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DemandeExamen
        fields = [
            'id', 'numero', 'statut', 'consultation',
            'patient', 'patient_id', 'patient_nom', 'patient_prenom',
            'patient_date_naissance', 'patient_contact',
            'medecin_id', 'medecin_nom', 'medecin_specialite', 'medecin_numero_ordre',
            'renseignements_cliniques',
            'lignes', 'historique', 'motif_correction',
            'date_creation', 'date_modification'
        ]
        read_only_fields = [
            'id', 'numero', 'statut', 'date_creation', 'date_modification',
            'patient', 'patient_id', 'patient_nom', 'patient_prenom',
            'medecin_id', 'medecin_nom', 'medecin_specialite', 'medecin_numero_ordre'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None and 'consultation' in self.fields:
            self.fields['consultation'].required = False

    def get_medecin_nom(self, obj):
        if obj.medecin:
            m = obj.medecin
            full = f"{m.last_name} {m.first_name}".strip()
            return f"Dr. {full}" if full else m.username
        return ""

    def get_medecin_specialite(self, obj):
        if obj.medecin:
            profile = getattr(obj.medecin, 'medecin_profile', None)
            if profile and profile.specialite:
                return profile.specialite
        return ""

    def get_medecin_numero_ordre(self, obj):
        if obj.medecin:
            profile = getattr(obj.medecin, 'medecin_profile', None)
            if profile and profile.numero_ordre:
                return profile.numero_ordre
        return ""

    def validate(self, attrs):
        # En modification, le motif de correction est obligatoire
        if self.instance is not None:
            motif = attrs.get('motif_correction', '').strip()
            if not motif:
                raise serializers.ValidationError({
                    "motif_correction": "Le motif de correction est obligatoire pour modifier une demande d'examens existante."
                })

            if 'consultation' in attrs and attrs['consultation'] != self.instance.consultation:
                raise serializers.ValidationError({
                    "consultation": "La consultation associée à une demande d'examen ne peut pas être modifiée."
                })

        return attrs

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        validated_data.pop('motif_correction', None)

        consultation = validated_data.get('consultation')
        # Patient et médecin sont strictement déduits de la consultation fiable côté serveur
        validated_data['patient'] = consultation.patient
        validated_data['medecin'] = consultation.medecin

        demande = DemandeExamen.objects.create(**validated_data)

        if lignes_data:
            for ordre, l_data in enumerate(lignes_data, 1):
                l_dict = dict(l_data)
                ordre_val = l_dict.pop('ordre', ordre)
                LigneDemandeExamen.objects.create(
                    demande=demande,
                    ordre=ordre_val,
                    **l_dict
                )

        return demande

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        motif_correction = validated_data.pop('motif_correction', '').strip()

        if not motif_correction:
            raise serializers.ValidationError({
                "motif_correction": "Le motif de correction est obligatoire pour modifier une demande d'examens existante."
            })

        # Capturer l'état avant modification
        anciennes_lignes = list(instance.lignes.values(
            'nom_examen', 'categorie', 'instructions'
        ))

        # Mise à jour des champs d'en-tête
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Mise à jour des lignes si fournies
        if lignes_data is not None:
            instance.lignes.all().delete()
            for ordre, l_data in enumerate(lignes_data, 1):
                l_dict = dict(l_data)
                ordre_val = l_dict.pop('ordre', ordre)
                LigneDemandeExamen.objects.create(
                    demande=instance,
                    ordre=ordre_val,
                    **l_dict
                )

        instance.statut = DemandeExamen.Statut.MODIFIEE
        instance.save()

        # Enregistrement de l'historique d'audit
        nouvelles_lignes = list(instance.lignes.values(
            'nom_examen', 'categorie', 'instructions'
        ))

        request = self.context.get('request')
        auteur = request.user if request and request.user.is_authenticated else instance.medecin

        DemandeExamenHistorique.objects.create(
            demande=instance,
            auteur=auteur,
            motif_correction=motif_correction,
            champs_modifies=['lignes'] if lignes_data is not None else list(validated_data.keys()),
            anciennes_lignes=anciennes_lignes,
            nouvelles_lignes=nouvelles_lignes
        )

        return instance
