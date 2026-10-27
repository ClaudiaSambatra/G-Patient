from django.contrib import admin
from .models import Consultation, ConstantesVitales, ConsultationHistorique, RetourSansRendezVous


class ConstantesVitalesInline(admin.StackedInline):
    model = ConstantesVitales
    can_delete = False
    extra = 0


class ConsultationHistoriqueInline(admin.TabularInline):
    model = ConsultationHistorique
    extra = 0
    readonly_fields = ['auteur', 'date_modification', 'motif_correction', 'champs_modifies', 'anciennes_valeurs', 'nouvelles_valeurs']

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'medecin', 'date_consultation', 'date_controle_recommandee', 'date_creation']
    list_filter = ['medecin', 'date_consultation']
    search_fields = ['patient__nom', 'patient__prenom', 'motif', 'diagnostic']
    inlines = [ConstantesVitalesInline, ConsultationHistoriqueInline]


@admin.register(RetourSansRendezVous)
class RetourSansRendezVousAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'medecin_souhaite', 'statut', 'date_signalement', 'signale_par']
    list_filter = ['statut', 'date_signalement']
    search_fields = ['patient__nom', 'patient__prenom', 'motif_administratif']
