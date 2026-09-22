from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur, Medecin


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Informations métier', {'fields': ('role', 'telephone')}),
    )
    list_display = ('username', 'email', 'role', 'is_staff')


@admin.register(Medecin)
class MedecinAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'specialite', 'numero_ordre')
    search_fields = ('utilisateur__last_name', 'utilisateur__first_name', 'specialite')
