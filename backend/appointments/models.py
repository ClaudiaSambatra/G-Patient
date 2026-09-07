from django.conf import settings
from django.db import models
from patients.models import Patient


class RendezVous(models.Model):
    """Module 3 — Gestion des rendez-vous (à développer en détail au Sprint 3)."""

    class Statut(models.TextChoices):
        PLANIFIE = 'PLANIFIE', 'Planifié'
        CONFIRME = 'CONFIRME', 'Confirmé'
        ANNULE = 'ANNULE', 'Annulé'
        TERMINE = 'TERMINE', 'Terminé'

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='rendez_vous')
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rendez_vous',
        limit_choices_to={'role': 'MEDECIN'},
    )
    date_heure = models.DateTimeField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.PLANIFIE)

    class Meta:
        ordering = ['date_heure']

    def __str__(self):
        return f"RDV {self.patient} avec {self.medecin} le {self.date_heure:%d/%m/%Y %H:%M}"
