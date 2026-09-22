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
        import datetime
        if self.date_heure and self.medecin:
            # Calculer la fin du rdv
            start_time = self.date_heure
            end_time = start_time + datetime.timedelta(minutes=self.duree_minutes)
            
            # Chercher des rdv du même médecin qui chevauchent
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
