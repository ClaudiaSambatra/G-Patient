from rest_framework import serializers
from .models import Ordonnance, LigneOrdonnance, OrdonnanceHistorique


class LigneOrdonnanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneOrdonnance
        fields = [
            'id', 'medicament', 'dosage', 'forme',
            'dose_par_prise', 'voie_administration',
            'frequence', 'duree', 'instructions', 'ordre'
        ]
        read_only_fields = ['id']


class OrdonnanceHistoriqueSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrdonnanceHistorique
        fields = [
            'id', 'auteur', 'auteur_nom', 'date_modification',
            'motif_correction', 'champs_modifies',
            'anciennes_lignes', 'nouvelles_lignes'
        ]
        read_only_fields = ['id', 'date_modification', 'auteur', 'auteur_nom']

    def get_auteur_nom(self, obj):
        if obj.auteur:
            if getattr(obj.auteur, 'role', '') == 'MEDECIN':
                return f"Dr. {obj.auteur.last_name} {obj.auteur.first_name}".strip()
            return obj.auteur.get_full_name() or obj.auteur.username
        return None


class OrdonnanceSerializer(serializers.ModelSerializer):
    lignes = LigneOrdonnanceSerializer(many=True, required=False)
    historique = OrdonnanceHistoriqueSerializer(many=True, read_only=True)
    motif_correction = serializers.CharField(write_only=True, required=False, allow_blank=True)

    patient = serializers.IntegerField(source='consultation.patient.id', read_only=True)
    patient_id = serializers.IntegerField(source='consultation.patient.id', read_only=True)
    patient_nom = serializers.CharField(source='consultation.patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='consultation.patient.prenom', read_only=True)
    patient_date_naissance = serializers.DateField(source='consultation.patient.date_naissance', read_only=True)
    patient_contact = serializers.CharField(source='consultation.patient.contact', read_only=True)
    patient_allergies = serializers.CharField(source='consultation.patient.allergies', read_only=True)
    patient_antecedents = serializers.CharField(source='consultation.patient.antecedents', read_only=True)

    medecin_id = serializers.IntegerField(source='consultation.medecin.id', read_only=True)
    medecin_nom = serializers.SerializerMethodField(read_only=True)
    medecin_specialite = serializers.SerializerMethodField(read_only=True)
    medecin_numero_ordre = serializers.SerializerMethodField(read_only=True)

    facture_id = serializers.SerializerMethodField(read_only=True)
    facture_statut = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Ordonnance
        fields = [
            'id', 'numero', 'statut', 'consultation',
            'patient', 'patient_id', 'patient_nom', 'patient_prenom',
            'patient_date_naissance', 'patient_contact',
            'patient_allergies', 'patient_antecedents',
            'medecin_id', 'medecin_nom', 'medecin_specialite', 'medecin_numero_ordre',
            'lignes', 'historique', 'motif_correction',
            'medicaments', 'posologie', 'duree',
            'date_creation', 'date_modification',
            'facture_id', 'facture_statut'
        ]
        read_only_fields = [
            'id', 'numero', 'statut', 'date_creation', 'date_modification',
            'patient', 'patient_id', 'patient_nom', 'patient_prenom', 'medecin_id',
            'facture_id', 'facture_statut'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None and 'consultation' in self.fields:
            self.fields['consultation'].required = False

    def get_medecin_nom(self, obj):
        if obj.consultation and obj.consultation.medecin:
            m = obj.consultation.medecin
            return f"Dr. {m.last_name} {m.first_name}".strip()
        return ""

    def get_medecin_specialite(self, obj):
        if obj.consultation and obj.consultation.medecin:
            profile = getattr(obj.consultation.medecin, 'medecin_profile', None)
            if profile and profile.specialite:
                return profile.specialite
        return ""

    def get_medecin_numero_ordre(self, obj):
        if obj.consultation and obj.consultation.medecin:
            profile = getattr(obj.consultation.medecin, 'medecin_profile', None)
            if profile and profile.numero_ordre:
                return profile.numero_ordre
        return ""

    def get_facture_id(self, obj):
        if hasattr(obj, 'facture') and obj.facture:
            return obj.facture.id
        return None

    def get_facture_statut(self, obj):
        if hasattr(obj, 'facture') and obj.facture:
            return obj.facture.statut
        return None

    def validate(self, attrs):
        # En modification, le motif de correction est obligatoire
        if self.instance is not None:
            motif = attrs.get('motif_correction', '').strip()
            if not motif:
                raise serializers.ValidationError({
                    "motif_correction": "Un motif de correction est obligatoire pour modifier une ordonnance existante."
                })
        # En modification, interdire de changer la consultation liée
        if self.instance and 'consultation' in attrs and attrs['consultation'] != self.instance.consultation:
            raise serializers.ValidationError({
                "consultation": "La consultation associée à une ordonnance ne peut pas être modifiée."
            })
        return attrs

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        validated_data.pop('motif_correction', None)

        ordonnance = Ordonnance.objects.create(**validated_data)

        if lignes_data:
            resume_list = []
            for ordre, l_data in enumerate(lignes_data, 1):
                l_dict = dict(l_data)
                ordre_val = l_dict.pop('ordre', ordre)
                LigneOrdonnance.objects.create(
                    ordonnance=ordonnance,
                    ordre=ordre_val,
                    **l_dict
                )
                desc = l_data.get('medicament', '')
                if l_data.get('dosage'):
                    desc += f" {l_data['dosage']}"
                if l_data.get('frequence'):
                    desc += f" - {l_data['frequence']}"
                if l_data.get('duree'):
                    desc += f" ({l_data['duree']})"
                resume_list.append(desc)

            update_fields = []
            if not ordonnance.medicaments:
                ordonnance.medicaments = "\n".join(resume_list)
                update_fields.append('medicaments')
            if not ordonnance.posologie:
                poso_list = [
                    f"{item.get('medicament')}: {item.get('dose_par_prise', '')} {item.get('frequence', '')}".strip()
                    for item in lignes_data if item.get('dose_par_prise') or item.get('frequence')
                ]
                if poso_list:
                    ordonnance.posologie = "\n".join(poso_list)
                    update_fields.append('posologie')
            if not ordonnance.duree:
                duree_list = [
                    f"{item.get('medicament')}: {item.get('duree', '')}".strip()
                    for item in lignes_data if item.get('duree')
                ]
                if duree_list:
                    ordonnance.duree = ", ".join(duree_list)
                    update_fields.append('duree')
            if update_fields:
                ordonnance.save(update_fields=update_fields)
        elif ordonnance.medicaments:
            # Rétro-compatibilité : si seul du texte a été envoyé
            LigneOrdonnance.objects.create(
                ordonnance=ordonnance,
                medicament=ordonnance.medicaments,
                frequence=ordonnance.posologie or '',
                duree=ordonnance.duree or '',
                ordre=1
            )

        return ordonnance

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        motif_correction = validated_data.pop('motif_correction', '').strip()

        # Le motif est obligatoire pour toute modification d'ordonnance
        if not motif_correction:
            raise serializers.ValidationError({
                "motif_correction": "Le motif de correction est obligatoire pour modifier une ordonnance existante."
            })

        # Capturer l'état avant modification
        anciennes_lignes = list(instance.lignes.values(
            'medicament', 'dosage', 'forme', 'dose_par_prise',
            'voie_administration', 'frequence', 'duree', 'instructions'
        ))

        # Mise à jour des champs d'ordonnance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Mise à jour des lignes si fournies
        if lignes_data is not None:
            instance.lignes.all().delete()
            resume_list = []
            for ordre, l_data in enumerate(lignes_data, 1):
                l_dict = dict(l_data)
                ordre_val = l_dict.pop('ordre', ordre)
                LigneOrdonnance.objects.create(
                    ordonnance=instance,
                    ordre=ordre_val,
                    **l_dict
                )
                desc = l_data.get('medicament', '')
                if l_data.get('dosage'):
                    desc += f" {l_data['dosage']}"
                if l_data.get('frequence'):
                    desc += f" - {l_data['frequence']}"
                if l_data.get('duree'):
                    desc += f" ({l_data['duree']})"
                resume_list.append(desc)

            instance.medicaments = "\n".join(resume_list)
            poso_list = [
                f"{item.get('medicament')}: {item.get('dose_par_prise', '')} {item.get('frequence', '')}".strip()
                for item in lignes_data if item.get('dose_par_prise') or item.get('frequence')
            ]
            duree_list = [
                f"{item.get('medicament')}: {item.get('duree', '')}".strip()
                for item in lignes_data if item.get('duree')
            ]
            if poso_list:
                instance.posologie = "\n".join(poso_list)
            if duree_list:
                instance.duree = ", ".join(duree_list)

        instance.statut = Ordonnance.Statut.MODIFIEE
        instance.save()

        # Enregistrement de l'historique
        nouvelles_lignes = list(instance.lignes.values(
            'medicament', 'dosage', 'forme', 'dose_par_prise',
            'voie_administration', 'frequence', 'duree', 'instructions'
        ))

        request = self.context.get('request')
        auteur = request.user if request and request.user.is_authenticated else instance.consultation.medecin

        OrdonnanceHistorique.objects.create(
            ordonnance=instance,
            auteur=auteur,
            motif_correction=motif_correction,
            champs_modifies=['lignes'] if lignes_data is not None else list(validated_data.keys()),
            anciennes_lignes=anciennes_lignes,
            nouvelles_lignes=nouvelles_lignes
        )

        return instance
