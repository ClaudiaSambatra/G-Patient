from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.role == request.user.Role.ADMIN or request.user.is_superuser)
        )


class IsMedecin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role == request.user.Role.MEDECIN
        )


class IsSecretaireOuAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.role in [request.user.Role.SECRETAIRE, request.user.Role.ADMIN] or request.user.is_superuser)
        )


class IsSecretaireOuMedecinOuAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.role in [request.user.Role.SECRETAIRE, request.user.Role.MEDECIN, request.user.Role.ADMIN] or request.user.is_superuser)
        )

