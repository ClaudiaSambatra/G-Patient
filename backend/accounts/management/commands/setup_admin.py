from django.core.management.base import BaseCommand
from decouple import config
from accounts.models import Utilisateur


class Command(BaseCommand):
    help = "Crée l'administrateur initial s'il n'existe pas encore."

    def handle(self, *args, **options):
        username = config("ADMIN_USERNAME", default="admin")
        email = config("ADMIN_EMAIL", default="admin@example.com")
        password = config("ADMIN_PASSWORD", default="Admin1234!")

        if not password:
            self.stdout.write(
                "ADMIN_PASSWORD non défini, aucun compte créé automatiquement."
            )
            return

        user = Utilisateur.objects.filter(username=username).first()
        if user:
            user.set_password(password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.role = Utilisateur.Role.ADMIN
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Mot de passe de '{username}' synchronisé avec succès !"
                )
            )
            return

        user = Utilisateur.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role=Utilisateur.Role.ADMIN,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Administrateur '{user.username}' créé avec succès !"
            )
        )
