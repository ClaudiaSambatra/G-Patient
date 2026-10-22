from django.db import models
from django.conf import settings
from patients.models import Patient
from appointments.models import RendezVous
from prescriptions.models import Ordonnance


class Facture(models.Model):
    """Module 7 — Facturation & paiements."""

    class Type(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        MEDICAMENTS = 'MEDICAMENTS', 'Médicaments'

    class StatutPaiement(models.TextChoices):
        IMPAYEE = 'IMPAYEE', 'Impayée'
        PAYEE = 'PAYEE', 'Payée'
        ANNULEE = 'ANNULEE', 'Annulée'

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='factures')
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.CONSULTATION)
    statut = models.CharField(max_length=20, choices=StatutPaiement.choices, default=StatutPaiement.IMPAYEE)
    designation = models.CharField(max_length=255, default='Frais de consultation')
    actes = models.TextField(blank=True, default='', help_text="Description des actes facturés")
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    rendez_vous = models.OneToOneField(
        RendezVous,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='facture'
    )
    ordonnance = models.OneToOneField(
        Ordonnance,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='facture'
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_paiement = models.DateTimeField(null=True, blank=True)
    encaisse_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='factures_encaissees'
    )

    class Meta:
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.actes and self.designation:
            self.actes = self.designation
        elif not self.designation and self.actes:
            self.designation = self.actes
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Facture #{self.pk} ({self.get_type_display()}) — {self.patient} — {self.montant} Ar"
