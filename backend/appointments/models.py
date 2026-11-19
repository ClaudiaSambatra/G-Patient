from django.db import models
from patients.models import Patient
from accounts.models import Medecin


class RendezVous(models.Model):
    """Module 3 — Gestion des rendez-vous (à développer en détail au Sprint 3)."""

    class Statut(models.TextChoices):
        PLANIFIE = 'PLANIFIE', 'Planifié'
        CONFIRME = 'CONFIRME', 'Confirmé'
        ANNULE = 'ANNULE', 'Annulé'
        TERMINE = 'TERMINE', 'Terminé'
        NON_VENU = 'NON_VENU', 'Non venu'

    class Type(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        CONTROLE = 'CONTROLE', 'Suivi'

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='rendez_vous')
    medecin = models.ForeignKey(Medecin, on_delete=models.CASCADE, related_name='rendez_vous')
    date_heure = models.DateTimeField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PLANIFIE)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.CONSULTATION)
    consultation_origine = models.ForeignKey(
        'consultations.Consultation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rendez_vous_controles'
    )
    motif = models.CharField(max_length=255, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_heure']

    def __str__(self):
        return f"RDV {self.patient} avec {self.medecin} le {self.date_heure:%d/%m/%Y %H:%M}"

    @property
    def statut_paiement(self):
        if self.type == self.Type.CONTROLE:
            return 'GRATUIT'
        try:
            if hasattr(self, 'facture') and self.facture:
                return 'PAYE' if self.facture.statut == 'PAYEE' else 'IMPAYE'
        except Exception:
            pass

        # Sécurité pour données existantes ou factures orphelines du patient
        from billing.models import Facture
        facture = Facture.objects.filter(
            patient=self.patient,
            type=Facture.Type.CONSULTATION,
            rendez_vous=self
        ).first()
        if not facture:
            facture = Facture.objects.filter(
                patient=self.patient,
                type=Facture.Type.CONSULTATION,
                rendez_vous__isnull=True
            ).order_by('-date_creation').first()
            if facture and facture.rendez_vous is None:
                facture.rendez_vous = self
                facture.save(update_fields=['rendez_vous'])

        if facture and facture.statut == Facture.StatutPaiement.PAYEE:
            return 'PAYE'
        return 'IMPAYE'

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        from django.utils import timezone

        # Règle pour rendez-vous de type CONTROLE
        if self.type == self.Type.CONTROLE:
            if self.patient and self.date_heure:
                from datetime import timedelta
                from consultations.models import Consultation
                rdv_date = timezone.localtime(self.date_heure).date() if timezone.is_aware(self.date_heure) else self.date_heure.date()
                date_min = rdv_date - timedelta(days=15)

                eligible_consult = Consultation.objects.filter(
                    patient=self.patient,
                    rendez_vous__type=self.Type.CONSULTATION,
                    rendez_vous__statut=self.Statut.TERMINE,
                    date_consultation__date__gte=date_min,
                    date_consultation__date__lte=rdv_date
                ).order_by('-date_consultation', '-id').first()

                if not eligible_consult:
                    raise ValidationError({
                        'type': "Aucune consultation payante de ce patient dans les 15 derniers jours : le contrôle n'est pas gratuit."
                    })
                self.consultation_origine = eligible_consult
        elif self.type == self.Type.CONSULTATION:
            self.consultation_origine = None

        # Règle 5 : Interdire la création ou le déplacement d'un rendez-vous dans le passé
        if self.date_heure:
            is_new = self.pk is None
            is_date_moved = False
            if self.pk:
                existing = RendezVous.objects.filter(pk=self.pk).only('date_heure').first()
                if existing and existing.date_heure != self.date_heure:
                    is_date_moved = True

            if (is_new or is_date_moved) and self.date_heure < timezone.now():
                raise ValidationError({
                    'date_heure': "Impossible de planifier ou déplacer un rendez-vous dans le passé."
                })

        if self.date_heure and self.medecin:
            # Règle 1 : Disponibilité du médecin à la date et à l'heure du RDV (module 15) :
            # absences planifiées, bouton « absent aujourd'hui » et horaires de consultation.
            # Vérifiée à la création, ou si la date ou le médecin change (un RDV existant reste modifiable).
            is_moved_or_changed_medecin = self.pk is None
            if self.pk:
                existing = RendezVous.objects.filter(pk=self.pk).only('date_heure', 'medecin_id').first()
                if not existing or existing.date_heure != self.date_heure or existing.medecin_id != self.medecin_id:
                    is_moved_or_changed_medecin = True

            if is_moved_or_changed_medecin:
                from planning.services import indisponibilite
                raison = indisponibilite(self.medecin, self.date_heure)
                if raison:
                    raise ValidationError({'date_heure': raison})

            # Règle 2 : Chevauchement avec un autre RDV du médecin (créneaux de DUREE_RDV_MINUTES)
            from planning.services import rdv_qui_chevauchent
            conflit = rdv_qui_chevauchent(self.date_heure, exclure_pk=self.pk, medecin=self.medecin).first()
            if conflit:
                raise ValidationError({
                    'date_heure': f"Le médecin a déjà un rendez-vous à {timezone.localtime(conflit.date_heure):%H:%M} : "
                                  f"choisissez un créneau libre."
                })

        # Règle 3 : Chevauchement avec un autre RDV du patient
        if self.date_heure and self.patient:
            from planning.services import rdv_qui_chevauchent
            conflit = rdv_qui_chevauchent(self.date_heure, exclure_pk=self.pk, patient=self.patient).first()
            if conflit:
                raise ValidationError({
                    'date_heure': f"Le patient a déjà un rendez-vous à {timezone.localtime(conflit.date_heure):%H:%M}."
                })

    def save(self, *args, **kwargs):
        from django.utils import timezone
        if self.type == self.Type.CONTROLE and not self.consultation_origine and self.patient and self.date_heure:
            from datetime import timedelta
            from consultations.models import Consultation
            rdv_date = timezone.localtime(self.date_heure).date() if timezone.is_aware(self.date_heure) else self.date_heure.date()
            date_min = rdv_date - timedelta(days=15)
            self.consultation_origine = Consultation.objects.filter(
                patient=self.patient,
                rendez_vous__type=self.Type.CONSULTATION,
                rendez_vous__statut=self.Statut.TERMINE,
                date_consultation__date__gte=date_min,
                date_consultation__date__lte=rdv_date
            ).order_by('-date_consultation', '-id').first()

        ancien_statut = None
        if self.pk:
            ancien_statut = RendezVous.objects.filter(pk=self.pk).values_list('statut', flat=True).first()

        super().save(*args, **kwargs)

        # Patient non venu corrigé en « Confirmé » : sa facture redevient à payer
        if ancien_statut == self.Statut.NON_VENU and self.statut == self.Statut.CONFIRME:
            if hasattr(self, 'facture') and self.facture and self.facture.statut == 'ANNULEE':
                self.facture.statut = 'IMPAYEE'
                self.facture.save(update_fields=['statut'])

        # Si annulé ou patient non venu, passer la facture consultation impayée à ANNULEE
        if self.statut in (self.Statut.ANNULE, self.Statut.NON_VENU):
            if hasattr(self, 'facture') and self.facture:
                if self.facture.statut == 'IMPAYEE':
                    self.facture.statut = 'ANNULEE'
                    self.facture.save(update_fields=['statut'])
        elif self.statut == self.Statut.PLANIFIE:
            if hasattr(self, 'facture') and self.facture:
                if self.facture.statut == 'ANNULEE':
                    self.facture.statut = 'IMPAYEE'
                    self.facture.save(update_fields=['statut'])
