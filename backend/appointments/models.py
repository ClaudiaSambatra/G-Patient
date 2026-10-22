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

    class Type(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        CONTROLE = 'CONTROLE', 'Contrôle'

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
        if hasattr(self, 'facture') and self.facture:
            if self.facture.statut == 'PAYEE':
                return 'PAYE'
            return 'IMPAYE'
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
            rdv_date = timezone.localtime(self.date_heure).date() if timezone.is_aware(self.date_heure) else self.date_heure.date()
            today = timezone.localdate()

            # Règle 1 : Présence du médecin
            if rdv_date == today and getattr(self.medecin, 'absent_aujourdhui', False):
                is_new = self.pk is None
                is_moved_or_changed_medecin = False
                if self.pk:
                    existing = RendezVous.objects.filter(pk=self.pk).only('date_heure', 'medecin_id').first()
                    if existing:
                        existing_date = timezone.localtime(existing.date_heure).date() if timezone.is_aware(existing.date_heure) else existing.date_heure.date()
                        if existing_date != rdv_date or existing.medecin_id != self.medecin_id:
                            is_moved_or_changed_medecin = True
                    else:
                        is_moved_or_changed_medecin = True

                if is_new or is_moved_or_changed_medecin:
                    raise ValidationError({
                        'date_heure': "Ce médecin est absent aujourd'hui."
                    })

            # Règle 2 : Conflit d'horaire pour le médecin (même date et heure exacte)
            qs_medecin = RendezVous.objects.filter(
                medecin=self.medecin,
                date_heure=self.date_heure,
                statut__in=[self.Statut.PLANIFIE, self.Statut.CONFIRME]
            )
            if self.pk:
                qs_medecin = qs_medecin.exclude(pk=self.pk)

            if qs_medecin.exists():
                raise ValidationError({
                    'date_heure': "Le médecin a déjà un rendez-vous à cette date et cette heure."
                })

        # Règle 3 : Conflit d'horaire pour le patient (même date et heure exacte)
        if self.date_heure and self.patient:
            qs_patient = RendezVous.objects.filter(
                patient=self.patient,
                date_heure=self.date_heure,
                statut__in=[self.Statut.PLANIFIE, self.Statut.CONFIRME]
            )
            if self.pk:
                qs_patient = qs_patient.exclude(pk=self.pk)

            if qs_patient.exists():
                raise ValidationError({
                    'date_heure': "Le patient a déjà un rendez-vous à cette date et cette heure."
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

        super().save(*args, **kwargs)

        # Si annulé, passer la facture consultation impayée à ANNULEE
        if self.statut == self.Statut.ANNULE:
            if hasattr(self, 'facture') and self.facture:
                if self.facture.statut == 'IMPAYEE':
                    self.facture.statut = 'ANNULEE'
                    self.facture.save(update_fields=['statut'])
            

