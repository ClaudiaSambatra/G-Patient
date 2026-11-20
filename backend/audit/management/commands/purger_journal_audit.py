from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from audit.models import EntreeJournal


class Command(BaseCommand):
    help = "Supprime les entrées du journal d'audit plus anciennes que la durée de conservation."

    def add_arguments(self, parser):
        parser.add_argument(
            '--jours', type=int, default=settings.AUDIT_CONSERVATION_JOURS,
            help='Durée de conservation en jours (défaut : AUDIT_CONSERVATION_JOURS, 365).',
        )

    def handle(self, *args, **options):
        if options['jours'] < 1:
            self.stderr.write("La durée de conservation doit être d'au moins un jour.")
            return
        limite = timezone.now() - timedelta(days=options['jours'])
        nombre, _ = EntreeJournal.objects.filter(date__lt=limite).delete()
        self.stdout.write(f"{nombre} entrée(s) antérieure(s) au {limite:%Y-%m-%d} supprimée(s).")
