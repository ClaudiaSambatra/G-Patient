from django.contrib import admin

from .models import EntreeJournal


@admin.register(EntreeJournal)
class EntreeJournalAdmin(admin.ModelAdmin):
    """Consultation seule : une trace d'audit ne se crée, ne se modifie ni ne se supprime à la main."""
    list_display = ('date', 'nom_utilisateur', 'role', 'action', 'ressource', 'objet_id', 'statut', 'adresse_ip')
    list_filter = ('action', 'role', 'ressource')
    search_fields = ('nom_utilisateur', 'chemin', 'adresse_ip')
    date_hierarchy = 'date'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
