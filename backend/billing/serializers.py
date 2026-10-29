from rest_framework import serializers
from .models import Facture


class FactureSerializer(serializers.ModelSerializer):
    patient_nom = serializers.CharField(source='patient.nom', read_only=True)
    patient_prenom = serializers.CharField(source='patient.prenom', read_only=True)
    encaisse_par_nom = serializers.SerializerMethodField(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id', 'patient', 'patient_nom', 'patient_prenom',
            'type', 'type_display', 'statut', 'statut_display',
            'designation', 'actes', 'montant',
            'rendez_vous', 'ordonnance',
            'date_creation', 'date_paiement', 'encaisse_par', 'encaisse_par_nom'
        ]
        read_only_fields = ['id', 'date_creation', 'date_paiement', 'encaisse_par']

    def get_encaisse_par_nom(self, obj):
        if obj.encaisse_par:
            return obj.encaisse_par.get_full_name() or obj.encaisse_par.username
        return None

    def validate(self, attrs):
        # Une facture PAYEE ne peut pas être modifiée
        if self.instance and self.instance.statut == Facture.StatutPaiement.PAYEE:
            raise serializers.ValidationError({"detail": "Une facture payée ne peut pas être modifiée."})

        # Si ordonnance est fournie
        ordonnance = attrs.get('ordonnance') or (self.instance and self.instance.ordonnance)
        if ordonnance:
            # Vérification anti-doublon
            query = Facture.objects.filter(ordonnance=ordonnance)
            if self.instance:
                query = query.exclude(pk=self.instance.pk)
            existing_facture = query.first()
            if existing_facture:
                raise serializers.ValidationError({
                    "ordonnance": f"Cette ordonnance fait déjà l'objet d'une facture active (n°{existing_facture.id})."
                })

            # Vérification de cohérence du patient
            patient = attrs.get('patient') or (self.instance and self.instance.patient)
            if patient:
                if patient != ordonnance.consultation.patient:
                    raise serializers.ValidationError({
                        "patient": "Le patient de la facture ne correspond pas au patient de l'ordonnance."
                    })
            else:
                attrs['patient'] = ordonnance.consultation.patient

        # Synchroniser actes et designation
        designation = attrs.get('designation') or attrs.get('actes')
        if designation:
            attrs['designation'] = designation
            attrs['actes'] = designation

        return attrs
