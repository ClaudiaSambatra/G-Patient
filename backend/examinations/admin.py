from django.contrib import admin
from .models import DemandeExamen, LigneDemandeExamen, DemandeExamenHistorique


class LigneDemandeExamenInline(admin.TabularInline):
    model = LigneDemandeExamen
    extra = 1


class DemandeExamenHistoriqueInline(admin.TabularInline):
    model = DemandeExamenHistorique
    extra = 0
    readonly_fields = [
        'auteur', 'date_modification', 'motif_correction',
        'champs_modifies', 'anciennes_lignes', 'nouvelles_lignes'
    ]
    can_delete = False


@admin.register(DemandeExamen)
class DemandeExamenAdmin(admin.ModelAdmin):
    list_display = ['numero', 'patient', 'medecin', 'statut', 'date_creation']
    list_filter = ['statut', 'date_creation']
    search_fields = [
        'numero', 'patient__nom', 'patient__prenom',
        'medecin__last_name', 'medecin__first_name',
        'renseignements_cliniques'
    ]
    readonly_fields = ['numero', 'date_creation', 'date_modification']
    inlines = [LigneDemandeExamenInline, DemandeExamenHistoriqueInline]


@admin.register(LigneDemandeExamen)
class LigneDemandeExamenAdmin(admin.ModelAdmin):
    list_display = ['demande', 'nom_examen', 'categorie', 'ordre']
    list_filter = ['categorie']
    search_fields = ['nom_examen', 'demande__numero']


@admin.register(DemandeExamenHistorique)
class DemandeExamenHistoriqueAdmin(admin.ModelAdmin):
    list_display = ['demande', 'auteur', 'date_modification', 'motif_correction']
    search_fields = ['demande__numero', 'auteur__username', 'motif_correction']
    readonly_fields = [
        'demande', 'auteur', 'date_modification', 'motif_correction',
        'champs_modifies', 'anciennes_lignes', 'nouvelles_lignes'
    ]
