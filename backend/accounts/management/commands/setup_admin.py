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

        if Utilisateur.objects.filter(username=username).exists():
            self.stdout.write(f"L'utilisateur {username} existe déjà.")
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
