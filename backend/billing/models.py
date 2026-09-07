from django.db import models
from patients.models import Patient


class Facture(models.Model):
    """Module 7 — Facturation & paiements (à développer en détail au Sprint 5)."""

    class StatutPaiement(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente'
        PAYEE = 'PAYEE', 'Payée'
        IMPAYEE = 'IMPAYEE', 'Impayée'

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='factures')
    actes = models.TextField(help_text="Description des actes facturés")
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=StatutPaiement.choices, default=StatutPaiement.EN_ATTENTE)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Facture #{self.pk} — {self.patient} — {self.montant} Ar"
