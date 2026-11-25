from django.core.management.base import BaseCommand
from decouple import config
from accounts.models import Utilisateur


class Command(BaseCommand):
    help = "Crée l'administrateur initial s'il n'existe pas encore."

    def handle(self, *args, **options):
        username = config("ADMIN_USERNAME", default="admin")
        email = config("ADMIN_EMAIL", default="admin@example.com")
        # Aucun mot de passe par défaut : il serait public (dépôt GitHub) et remplacerait
        # celui de l'administrateur à chaque démarrage du conteneur.
        password = config("ADMIN_PASSWORD", default="")

        if not password:
            self.stdout.write(
                "ADMIN_PASSWORD non défini : compte administrateur inchangé."
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
