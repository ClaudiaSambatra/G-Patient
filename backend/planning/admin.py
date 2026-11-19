from django.contrib import admin

from .models import AbsenceMedecin, HoraireMedecin


@admin.register(HoraireMedecin)
class HoraireMedecinAdmin(admin.ModelAdmin):
    list_display = ('medecin', 'jour', 'heure_debut', 'heure_fin')
    list_filter = ('jour', 'medecin')


@admin.register(AbsenceMedecin)
class AbsenceMedecinAdmin(admin.ModelAdmin):
    list_display = ('medecin', 'type', 'date_debut', 'date_fin', 'motif')
    list_filter = ('type', 'medecin')
