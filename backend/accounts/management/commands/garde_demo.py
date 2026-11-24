from datetime import time, timedelta

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from planning.models import GardeMedecin
from accounts.models import Medecin

# (médecin, décalage en jours par rapport au jour choisi, début, fin, motif)
# Une fin <= début signifie le lendemain.
GARDES = [
    # Dr Rasoanirina ne consulte que le matin : sa garde ouvre l'après-midi (visible « en ce moment » en journée)
    ('dr.rasoa', 0, time(12), time(18), "Garde de l'après-midi"),
    ('dr.rakoto', 0, time(18), time(8), 'Garde de nuit'),
    # Garde du samedi suivant (calculée plus bas)
    ('dr.rakoto', None, time(8), time(20), 'Garde du week-end'),
]


class Command(BaseCommand):
    help = (
        "Crée les gardes de démonstration autour d'un jour (par défaut aujourd'hui). "
        "Relançable sans risque : une garde déjà présente n'est pas dupliquée."
    )

    def add_arguments(self, parser):
        parser.add_argument('--date', help="Jour de la démo au format AAAA-MM-JJ (défaut : aujourd'hui).")

    def handle(self, *args, **options):
        jour = timezone.localdate()
        if options.get('date'):
            try:
                jour = timezone.datetime.strptime(options['date'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError("Date invalide : utilisez le format AAAA-MM-JJ.")

        medecins = {m.utilisateur.username: m for m in Medecin.objects.select_related('utilisateur').filter(
            utilisateur__username__in={g[0] for g in GARDES})}
        manquants = {g[0] for g in GARDES} - set(medecins)
        if manquants:
            raise CommandError(f"Comptes de démonstration introuvables : {', '.join(sorted(manquants))}. "
                               "Lancez d'abord charger_demo.")

        samedi = jour + timedelta(days=(5 - jour.weekday()) % 7 or 7)
        for username, decalage, debut, fin, motif in GARDES:
            date = samedi if decalage is None else jour + timedelta(days=decalage)
            existante = GardeMedecin.objects.filter(medecin=medecins[username], date=date, heure_debut=debut).first()
            if existante:
                self.stdout.write(f"Déjà présente : {existante}")
                continue
            garde = GardeMedecin(medecin=medecins[username], date=date, heure_debut=debut, heure_fin=fin, motif=motif)
            try:
                garde.clean()
            except ValidationError as err:
                self.stdout.write(self.style.WARNING(f"Ignorée ({garde}) : {' '.join(err.messages)}"))
                continue
            garde.save()
            self.stdout.write(self.style.SUCCESS(f"Créée : {garde}"))
