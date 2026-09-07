from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('nom', 'prenom', 'date_naissance', 'groupe_sanguin', 'contact')
    search_fields = ('nom', 'prenom', 'contact')
    list_filter = ('groupe_sanguin',)
