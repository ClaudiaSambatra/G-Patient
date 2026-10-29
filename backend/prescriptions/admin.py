from django.contrib import admin
from .models import Ordonnance, LigneOrdonnance, OrdonnanceHistorique


class LigneOrdonnanceInline(admin.TabularInline):
    model = LigneOrdonnance
    extra = 1


class OrdonnanceHistoriqueInline(admin.TabularInline):
    model = OrdonnanceHistorique
    extra = 0
    readonly_fields = ['auteur', 'date_modification', 'motif_correction', 'champs_modifies', 'anciennes_lignes', 'nouvelles_lignes']
    can_delete = False


@admin.register(Ordonnance)
class OrdonnanceAdmin(admin.ModelAdmin):
    list_display = ['numero', 'consultation', 'statut', 'date_creation', 'date_modification']
    list_filter = ['statut', 'date_creation']
    search_fields = ['numero', 'consultation__patient__nom', 'consultation__patient__prenom', 'medicaments']
    readonly_fields = ['numero', 'date_creation', 'date_modification']
    inlines = [LigneOrdonnanceInline, OrdonnanceHistoriqueInline]


@admin.register(LigneOrdonnance)
class LigneOrdonnanceAdmin(admin.ModelAdmin):
    list_display = ['ordonnance', 'medicament', 'dosage', 'forme', 'frequence', 'duree', 'ordre']
    search_fields = ['medicament', 'ordonnance__numero']


@admin.register(OrdonnanceHistorique)
class OrdonnanceHistoriqueAdmin(admin.ModelAdmin):
    list_display = ['ordonnance', 'auteur', 'date_modification', 'motif_correction']
    search_fields = ['ordonnance__numero', 'auteur__username', 'motif_correction']
    readonly_fields = ['ordonnance', 'auteur', 'date_modification', 'motif_correction', 'champs_modifies', 'anciennes_lignes', 'nouvelles_lignes']
