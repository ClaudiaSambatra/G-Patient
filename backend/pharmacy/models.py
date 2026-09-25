from django.db import models

class StockMedicament(models.Model):
    """
    Gestion des stocks (pharmacie) : Suivi des médicaments, quantités, seuils et alertes.
    """
    nom = models.CharField(max_length=200, unique=True, help_text="Nom du médicament ou consommable")
    quantite_disponible = models.IntegerField(default=0)
    seuil_alerte = models.IntegerField(default=10, help_text="Quantité en dessous de laquelle une alerte est déclenchée")
    unite = models.CharField(max_length=50, default="boîte", help_text="Ex: boîte, flacon, unité")
    date_derniere_mise_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Stock Médicament"

    def __str__(self):
        return f"{self.nom} ({self.quantite_disponible} {self.unite}s)"

    @property
    def en_alerte(self):
        return self.quantite_disponible <= self.seuil_alerte
