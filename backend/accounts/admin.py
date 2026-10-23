from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur, Medecin, PasswordResetToken


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    # Retirer le champ 'password' pour empêcher l'administrateur de modifier le mot de passe d'un utilisateur existant
    fieldsets = (
        (None, {'fields': ('username',)}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'email', 'photo')}),
        ('Informations métier', {'fields': ('role', 'telephone')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'date_joined')}),
    )
    readonly_fields = ('last_login', 'date_joined')
    list_display = ('username', 'email', 'role', 'is_staff')

    def user_change_password(self, request, id, form_url=""):
        from django.http import HttpResponseForbidden
        return HttpResponseForbidden(
            "La modification directe du mot de passe par l'administrateur est désactivée. "
            "L'utilisateur doit réinitialiser son mot de passe par email."
        )


@admin.register(Medecin)
class MedecinAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'specialite', 'numero_ordre')
    search_fields = ('utilisateur__last_name', 'utilisateur__first_name', 'specialite')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'code', 'created_at', 'expires_at', 'is_used')
    list_filter = ('is_used', 'created_at')
    search_fields = ('utilisateur__username', 'utilisateur__email', 'code')
    readonly_fields = ('token', 'created_at')
