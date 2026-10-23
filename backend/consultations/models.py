from django.db import models
from django.conf import settings
from django.utils import timezone
from patients.models import Patient
from appointments.models import RendezVous


class Consultation(models.Model):
    """Module 4 — Gestion des consultations médicales."""

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="consultations"
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        limit_choices_to={'role': 'MEDECIN'},
        related_name="consultations"
    )
    rendez_vous = models.OneToOneField(
        RendezVous,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation"
    )

    date_consultation = models.DateTimeField(default=timezone.now)
    motif = models.TextField()
    observations = models.TextField(help_text="Constantes vitales : tension, température, poids, examen clinique")
    diagnostic = models.TextField()
    compte_rendu = models.TextField(blank=True, default='', help_text="Compte rendu médical de la consultation")

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_consultation']

    def __str__(self):
        return f"Consultation de {self.patient} le {self.date_consultation:%d/%m/%Y}"
