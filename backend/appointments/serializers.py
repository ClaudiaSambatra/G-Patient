from django.utils import timezone
from rest_framework import serializers
from .models import RendezVous


class RendezVousSerializer(serializers.ModelSerializer):
    patient_nom = serializers.SerializerMethodField()
    medecin_nom = serializers.SerializerMethodField()
    patient_contact = serializers.CharField(source='patient.contact', read_only=True)
    patient_allergies = serializers.CharField(source='patient.allergies', read_only=True)
    patient_antecedents = serializers.CharField(source='patient.antecedents', read_only=True)
    medecin_absent_aujourdhui = serializers.SerializerMethodField()
    consultation_id = serializers.SerializerMethodField()
    statut_paiement = serializers.CharField(read_only=True)
    facture_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RendezVous
        fields = '__all__'

    def get_patient_nom(self, obj):
        return f"{obj.patient.nom} {obj.patient.prenom}"

    def get_medecin_nom(self, obj):
        return f"Dr. {obj.medecin.utilisateur.last_name} {obj.medecin.utilisateur.first_name}"

    def get_medecin_absent_aujourdhui(self, obj):
        # Calculé une fois par médecin pour toute la liste, et non une fois par rendez-vous
        absents = self.context.setdefault('medecins_absents_aujourdhui', {})
        if obj.medecin_id not in absents:
            absents[obj.medecin_id] = obj.medecin.absent_aujourdhui
        return absents[obj.medecin_id]

    def get_consultation_id(self, obj):
        return obj.consultation.id if hasattr(obj, 'consultation') and obj.consultation else None

    def get_facture_id(self, obj):
        if obj.type == RendezVous.Type.CONTROLE:
            return None
        return obj.facture.id if hasattr(obj, 'facture') and obj.facture else None

    def validate(self, attrs):
        # 1. Transitions de statut contrôlées
        if not self.instance:
            statut = attrs.get('statut', RendezVous.Statut.PLANIFIE)
            if statut == RendezVous.Statut.TERMINE:
                raise serializers.ValidationError({
                    'statut': "Le statut Terminé ne peut être posé que par la création d'une consultation, jamais manuellement."
                })
        else:
            current_statut = self.instance.statut
            new_statut = attrs.get('statut', current_statut)

            # Si le rendez-vous est déjà terminé, aucun changement n'est possible
            if current_statut == RendezVous.Statut.TERMINE:
                if new_statut != current_statut or any(k for k in attrs.keys() if k not in ['id']):
                    raise serializers.ValidationError({
                        'statut': f"Le statut '{self.instance.get_statut_display()}' est définitif et le rendez-vous ne peut plus être modifié."
                    })

            # Si le rendez-vous est déjà annulé : seul le rétablissement en Planifié est autorisé en cas de faute de manipulation
            if current_statut == RendezVous.Statut.ANNULE:
                if new_statut != RendezVous.Statut.PLANIFIE:
                    raise serializers.ValidationError({
                        'statut': f"Le statut '{self.instance.get_statut_display()}' est définitif et le rendez-vous ne peut plus être modifié (seul le rétablissement en 'Planifié' est autorisé)."
                    })

            # Patient non venu : seule la correction en « Confirmé » est possible (erreur de saisie)
            if current_statut == RendezVous.Statut.NON_VENU and new_statut not in (
                RendezVous.Statut.NON_VENU, RendezVous.Statut.CONFIRME
            ):
                raise serializers.ValidationError({
                    'statut': "Un rendez-vous « Non venu » ne peut être que corrigé en « Confirmé »."
                })

            if new_statut == RendezVous.Statut.NON_VENU and current_statut != RendezVous.Statut.NON_VENU:
                if self.instance.date_heure > timezone.now():
                    raise serializers.ValidationError({
                        'statut': "Un patient ne peut être déclaré non venu qu'après l'heure du rendez-vous."
                    })

            if new_statut != current_statut:
                if new_statut == RendezVous.Statut.TERMINE:
                    raise serializers.ValidationError({
                        'statut': "Le statut Terminé ne peut être posé que par la création d'une consultation, jamais manuellement."
                    })

                allowed_transitions = {
                    RendezVous.Statut.PLANIFIE: [
                        RendezVous.Statut.CONFIRME, RendezVous.Statut.ANNULE, RendezVous.Statut.NON_VENU
                    ],
                    RendezVous.Statut.CONFIRME: [RendezVous.Statut.ANNULE, RendezVous.Statut.NON_VENU],
                    RendezVous.Statut.ANNULE: [RendezVous.Statut.PLANIFIE],
                    RendezVous.Statut.NON_VENU: [RendezVous.Statut.CONFIRME],
                }
                allowed = allowed_transitions.get(current_statut, [])
                if new_statut not in allowed:
                    raise serializers.ValidationError({
                        'statut': f"Transition de statut non autorisée de '{current_statut}' vers '{new_statut}'."
                    })

        # 2. Validation modèle (clean)
        instance = RendezVous(**attrs)
        if self.instance:
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

        if instance.consultation_origine:
            attrs['consultation_origine'] = instance.consultation_origine
        return attrs
