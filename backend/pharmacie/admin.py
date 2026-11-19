from django.contrib import admin

from .models import MouvementStock, StockMedicament


@admin.register(StockMedicament)
class StockMedicamentAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'quantite', 'seuil_alerte', 'prix_unitaire', 'actif')
    list_filter = ('actif', 'forme')
    search_fields = ('nom', 'dosage')
    readonly_fields = ('quantite',)


@admin.register(MouvementStock)
class MouvementStockAdmin(admin.ModelAdmin):
    list_display = ('date', 'medicament', 'type', 'quantite', 'quantite_apres', 'auteur', 'facture')
    list_filter = ('type',)
    search_fields = ('medicament__nom', 'motif')

    def has_change_permission(self, request, obj=None):
        return False
