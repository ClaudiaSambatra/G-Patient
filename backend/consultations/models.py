from django.db import models
from appointments.models import RendezVous


class Consultation(models.Model):
    """Module 4 — Gestion des consultations (à développer en détail au Sprint 3)."""

    rendez_vous = models.OneToOneField(RendezVous, on_delete=models.CASCADE, related_name='consultation')
    motif = models.CharField(max_length=255)
    observations = models.TextField(blank=True)
    diagnostic = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Consultation du {self.date_creation:%d/%m/%Y} — {self.motif}"
