from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
<<<<<<< HEAD
            and (request.user.role == request.user.Role.ADMIN or request.user.is_superuser)
=======
            and request.user.role == request.user.Role.ADMIN
>>>>>>> 86992173ce1b8931dd2418e19997e70d831a2897
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
<<<<<<< HEAD
            and (request.user.role in [request.user.Role.SECRETAIRE, request.user.Role.ADMIN] or request.user.is_superuser)
=======
            and request.user.role in [request.user.Role.SECRETAIRE, request.user.Role.ADMIN]
>>>>>>> 86992173ce1b8931dd2418e19997e70d831a2897
        )


class IsSecretaireOuMedecinOuAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
<<<<<<< HEAD
            and (request.user.role in [request.user.Role.SECRETAIRE, request.user.Role.MEDECIN, request.user.Role.ADMIN] or request.user.is_superuser)
        )

=======
            and request.user.role != request.user.Role.PATIENT
        )
>>>>>>> 86992173ce1b8931dd2418e19997e70d831a2897
