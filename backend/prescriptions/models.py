from django.db import models
from consultations.models import Consultation


class Ordonnance(models.Model):
    """Module 5 — Prescriptions / ordonnances (à développer en détail au Sprint 4)."""

    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='ordonnances')
    medicaments = models.TextField(help_text="Liste des médicaments, un par ligne")
    posologie = models.TextField()
    duree = models.CharField(max_length=100, help_text="Ex: 7 jours, 2x/jour")
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f"Ordonnance #{self.pk} — {self.consultation}"
