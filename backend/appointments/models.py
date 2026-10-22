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

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='rendez_vous')
    medecin = models.ForeignKey(Medecin, on_delete=models.CASCADE, related_name='rendez_vous')
    date_heure = models.DateTimeField()
    duree_minutes = models.IntegerField(default=30)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PLANIFIE)
    motif = models.CharField(max_length=255, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_heure']

    def __str__(self):
        return f"RDV {self.patient} avec {self.medecin} le {self.date_heure:%d/%m/%Y %H:%M}"

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        import datetime

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

            # Calculer la fin du rdv
            start_time = self.date_heure
            end_time = start_time + datetime.timedelta(minutes=self.duree_minutes)
            
            # Règle 4 : Chercher des rdv du même médecin qui chevauchent
            qs = RendezVous.objects.filter(
                medecin=self.medecin,
                statut__in=[self.Statut.PLANIFIE, self.Statut.CONFIRME]
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            
            for rdv in qs:
                rdv_start = rdv.date_heure
                rdv_end = rdv_start + datetime.timedelta(minutes=rdv.duree_minutes)
                
                # Condition de chevauchement temporel
                if start_time < rdv_end and end_time > rdv_start:
                    raise ValidationError({
                        'date_heure': "Le médecin a déjà un rendez-vous planifié sur cette plage horaire."
                    })

        # Règle 4 : Chercher des rdv du même patient qui chevauchent
        if self.date_heure and self.patient:
            start_time = self.date_heure
            end_time = start_time + datetime.timedelta(minutes=self.duree_minutes)

            qs_patient = RendezVous.objects.filter(
                patient=self.patient,
                statut__in=[self.Statut.PLANIFIE, self.Statut.CONFIRME]
            )
            if self.pk:
                qs_patient = qs_patient.exclude(pk=self.pk)

            for rdv in qs_patient:
                rdv_start = rdv.date_heure
                rdv_end = rdv_start + datetime.timedelta(minutes=rdv.duree_minutes)

                if start_time < rdv_end and end_time > rdv_start:
                    raise ValidationError({
                        'date_heure': "Le patient a déjà un rendez-vous planifié sur cette plage horaire."
                    })
            

