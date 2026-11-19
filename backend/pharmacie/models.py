from django.conf import settings
from django.db import models


class StockMedicament(models.Model):
    """Module 11 — Gestion des stocks (pharmacie du cabinet)."""

    nom = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100, blank=True, default='')
    forme = models.CharField(max_length=100, blank=True, default='')
    unite = models.CharField(max_length=50, default='boîte', help_text="Unité de délivrance (boîte, flacon, tube…)")
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2, help_text="Prix de vente d'une unité (Ar)")
    quantite = models.PositiveIntegerField(default=0, help_text="Quantité disponible")
    seuil_alerte = models.PositiveIntegerField(default=10, help_text="Alerte quand la quantité descend à ce niveau")
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom', 'dosage']
        verbose_name = "Médicament en stock"
        verbose_name_plural = "Médicaments en stock"
        constraints = [
            models.UniqueConstraint(fields=['nom', 'dosage', 'forme'], name='unique_medicament_nom_dosage_forme'),
        ]

    @property
    def en_alerte(self):
        return self.quantite <= self.seuil_alerte

    def __str__(self):
        desc = self.nom
        if self.dosage:
            desc += f" {self.dosage}"
        if self.forme:
            desc += f" ({self.forme})"
        return desc


class MouvementStock(models.Model):
    """Traçabilité de chaque entrée, sortie ou ajustement de stock."""

    class Type(models.TextChoices):
        ENTREE = 'ENTREE', 'Entrée (réception)'
        SORTIE = 'SORTIE', 'Sortie (délivrance)'
        AJUSTEMENT = 'AJUSTEMENT', 'Ajustement (inventaire, perte, péremption)'

    medicament = models.ForeignKey(StockMedicament, on_delete=models.PROTECT, related_name='mouvements')
    type = models.CharField(max_length=20, choices=Type.choices)
    quantite = models.IntegerField(help_text="Variation du stock : positive (entrée) ou négative (sortie)")
    quantite_apres = models.PositiveIntegerField()
    motif = models.CharField(max_length=255, blank=True, default='')
    facture = models.ForeignKey(
        'billing.Facture', on_delete=models.SET_NULL, null=True, blank=True, related_name='mouvements_stock'
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='mouvements_stock'
    )
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"

    def __str__(self):
        return f"{self.get_type_display()} {self.quantite:+d} — {self.medicament}"
