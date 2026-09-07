from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Informations métier', {'fields': ('role', 'telephone')}),
    )
    list_display = ('username', 'email', 'role', 'is_staff')
