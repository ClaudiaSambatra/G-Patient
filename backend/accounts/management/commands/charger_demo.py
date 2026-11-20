from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Utilisateur
from appointments.models import RendezVous
from billing.models import Facture
from consultations.models import ConstantesVitales, Consultation
from patients.models import Patient
from pharmacie.models import MouvementStock, StockMedicament
from pharmacie.services import enregistrer_mouvement, sortir_medicaments_facture
from planning.models import AbsenceMedecin, HoraireMedecin
from prescriptions.models import LigneOrdonnance, Ordonnance

# Le délai de gratuité du contrôle est de 15 jours : au-delà de 10 jours d'avance,
# la consultation passée créée ici ne rendrait plus le contrôle du jour de démo gratuit.
AVANCE_MAX_JOURS = 10

MEDECINS = [
    ('dr.rakoto', 'Jean', 'Rakoto', '034 12 345 67', 'Médecine générale', 'ONM-2015-0421'),
    ('dr.rasoa', 'Hanta', 'Rasoanirina', '033 98 765 43', 'Pédiatrie', 'ONM-2018-0877'),
]

PATIENTS = {
    'aina': dict(nom='RAKOTOBE', prenom='Aina', sexe='F', date_naissance='1990-03-14',
                 contact='034 55 667 78', adresse='Lot II M 45 Antsahavola, Antananarivo',
                 groupe_sanguin='O+', antecedents='Asthme léger', allergies='Pénicilline'),
    'toky': dict(nom='ANDRIAMANANA', prenom='Toky', sexe='M', date_naissance='1975-09-02',
                 contact='033 44 556 67', adresse='Ambohipo, Antananarivo',
                 groupe_sanguin='A+', antecedents='Hypertension, diabète type 2'),
    'nomena': dict(nom='RAZAFY', prenom='Nomena', sexe='F', date_naissance='2019-06-21',
                   contact='032 77 889 90 (mère)', adresse='Ivandry, Antananarivo', groupe_sanguin='B+'),
    'fanja': dict(nom='RANDRIAMBOLOLONA', prenom='Fanja', sexe='F', date_naissance='1988-11-05',
                  contact='034 20 304 05', adresse='Analakely, Antananarivo', groupe_sanguin='AB+'),
}

STOCK = [
    # nom, dosage, forme, unité, prix (Ar), quantité, seuil
    ('Paracétamol', '500 mg', 'Comprimé', 'boîte', 2500, 50, 10),
    ('Amoxicilline', '500 mg', 'Gélule', 'boîte', 6000, 12, 10),
    ('Salbutamol', '100 µg', 'Aérosol', 'flacon', 15000, 8, 5),
]


def jour_ouvre(jour):
    """Le jour lui-même s'il tombe en semaine, sinon le lundi suivant."""
    while jour.weekday() >= 5:
        jour += timedelta(days=1)
    return jour


def a(jour, heure, minute=0):
    return timezone.make_aware(datetime.combine(jour, time(heure, minute)))


class Command(BaseCommand):
    help = "Charge un jeu de données de démonstration (médecins, patients, stock, RDV, historique)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--jour', type=str, default=None,
            help="Jour de la démo, AAAA-MM-JJ (défaut : prochain jour ouvré après aujourd'hui).",
        )
        parser.add_argument(
            '--mot-de-passe', default='Demo2026!',
            help="Mot de passe des comptes de démonstration (défaut : Demo2026!).",
        )

    def handle(self, *args, **options):
        aujourdhui = timezone.localdate()
        if options['jour']:
            try:
                jour = datetime.strptime(options['jour'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError("Date invalide (format attendu : AAAA-MM-JJ).")
        else:
            jour = aujourdhui + timedelta(days=1)
        jour = jour_ouvre(jour)
        if jour < aujourdhui:
            raise CommandError("Le jour de démo ne peut pas être dans le passé.")
        if (jour - aujourdhui).days > AVANCE_MAX_JOURS:
            raise CommandError(
                f"Lancez la commande au plus {AVANCE_MAX_JOURS} jours avant la démo "
                "(sinon le contrôle gratuit de la démo ne serait plus éligible)."
            )
        if Utilisateur.objects.filter(username='dr.rakoto').exists():
            raise CommandError("Les données de démonstration sont déjà chargées (le compte dr.rakoto existe).")

        with transaction.atomic():
            self.charger(jour, aujourdhui, options['mot_de_passe'])

        self.stdout.write(self.style.SUCCESS(
            f"Données de démonstration chargées : rendez-vous le {jour:%d/%m/%Y}. "
            f"Comptes dr.rakoto, dr.rasoa, secretaire (mot de passe : {options['mot_de_passe']})."
        ))

    def charger(self, jour, aujourdhui, mot_de_passe):
        admin = Utilisateur.objects.filter(is_superuser=True).first()

        # --- Utilisateurs (le signal post_save crée le profil Medecin) ---
        medecins = {}
        for username, prenom, nom, tel, specialite, numero in MEDECINS:
            user = Utilisateur.objects.create_user(
                username=username, password=mot_de_passe, first_name=prenom, last_name=nom,
                email=f"{username}@cabinet-demo.mg", telephone=tel, role=Utilisateur.Role.MEDECIN,
            )
            profil = user.medecin_profile
            profil.specialite = specialite
            profil.numero_ordre = numero
            profil.save()
            medecins[username] = profil
        secretaire = Utilisateur.objects.create_user(
            username='secretaire', password=mot_de_passe, first_name='Mialy', last_name='Randria',
            email='secretaire@cabinet-demo.mg', telephone='032 11 222 33', role=Utilisateur.Role.SECRETAIRE,
        )
        rakoto, rasoa = medecins['dr.rakoto'], medecins['dr.rasoa']

        # --- Planning : horaires en semaine, absence de Dr Rasoanirina juste après la démo ---
        for j in range(5):
            HoraireMedecin.objects.create(medecin=rakoto, jour=j, heure_debut=time(8), heure_fin=time(12))
            HoraireMedecin.objects.create(medecin=rakoto, jour=j, heure_debut=time(14), heure_fin=time(17))
            HoraireMedecin.objects.create(medecin=rasoa, jour=j, heure_debut=time(8), heure_fin=time(12))
        debut_absence = jour_ouvre(jour + timedelta(days=1))
        AbsenceMedecin.objects.create(
            medecin=rasoa, date_debut=debut_absence, date_fin=debut_absence + timedelta(days=1),
            type=AbsenceMedecin.Type.FORMATION, motif='Séminaire pédiatrie', creee_par=admin,
        )

        # --- Patients ---
        patients = {cle: Patient.objects.create(**donnees) for cle, donnees in PATIENTS.items()}

        # --- Pharmacie : chaque réception est tracée comme un mouvement d'entrée ---
        stock = {}
        for nom, dosage, forme, unite, prix, quantite, seuil in STOCK:
            med = StockMedicament.objects.create(
                nom=nom, dosage=dosage, forme=forme, unite=unite,
                prix_unitaire=Decimal(prix), quantite=0, seuil_alerte=seuil,
            )
            enregistrer_mouvement(med, MouvementStock.Type.ENTREE, quantite, admin, motif='Stock initial')
            stock[nom] = med

        # --- Historique : Toky a consulté il y a 2 jours (payé), ce qui rend son contrôle gratuit ---
        passe = aujourdhui - timedelta(days=2)
        rdv_passe = RendezVous.objects.create(
            patient=patients['toky'], medecin=rakoto, date_heure=a(passe, 9, 30),
            type=RendezVous.Type.CONSULTATION, statut=RendezVous.Statut.TERMINE, motif='Contrôle tension',
        )
        self.encaisser(rdv_passe.facture, secretaire, a(passe, 9, 15))
        consultation = Consultation.objects.create(
            patient=patients['toky'], medecin=rakoto.utilisateur, rendez_vous=rdv_passe,
            date_consultation=a(passe, 9, 35), motif='Contrôle tension artérielle et glycémie',
            observations='TA élevée au repos, pas de signe de complication. Glycémie à jeun 1,45 g/L.',
            diagnostic='Hypertension artérielle mal équilibrée, diabète type 2',
            compte_rendu='Ajustement du traitement antihypertenseur, régime pauvre en sel et en sucres rapides.',
            suivi_recommande=True, date_suivi_recommandee=jour_ouvre(passe + timedelta(days=10)),
            motif_suivi='Réévaluation de la tension après ajustement du traitement',
        )
        ConstantesVitales.objects.create(
            consultation=consultation, temperature=Decimal('36.9'), poids=Decimal('84.50'),
            taille=Decimal('172.0'), tension_arterielle='160/95', frequence_cardiaque=78,
            date_prise=a(passe, 9, 35),
        )
        ordonnance = Ordonnance.objects.create(consultation=consultation)
        LigneOrdonnance.objects.create(
            ordonnance=ordonnance, medicament='Amlodipine', dosage='10 mg', forme='Comprimé',
            dose_par_prise='1 comprimé', frequence='1 fois par jour, le matin', duree='30 jours', ordre=1,
        )
        LigneOrdonnance.objects.create(
            ordonnance=ordonnance, medicament='Paracétamol', medicament_stock=stock['Paracétamol'],
            quantite=2, dosage='500 mg', forme='Comprimé', dose_par_prise='1 comprimé',
            frequence='Si douleur, maximum 3 fois par jour', duree='5 jours', ordre=2,
        )
        facture_med = Facture.objects.create(
            patient=patients['toky'], type=Facture.Type.MEDICAMENTS, ordonnance=ordonnance,
            designation=f"Médicaments — ordonnance {ordonnance.numero}",
            montant=Decimal(2 * 2500),
        )
        self.encaisser(facture_med, secretaire, a(passe, 10, 0))
        sortir_medicaments_facture(facture_med, secretaire)

        # --- Rendez-vous du jour de démo (facture de consultation créée par le signal, impayée) ---
        RendezVous.objects.create(
            patient=patients['aina'], medecin=rakoto, date_heure=a(jour, 9, 0),
            type=RendezVous.Type.CONSULTATION, motif='Toux persistante',
        )
        RendezVous.objects.create(
            patient=patients['nomena'], medecin=rasoa, date_heure=a(jour, 10, 0),
            type=RendezVous.Type.CONSULTATION, motif='Fièvre',
        )
        RendezVous.objects.create(
            patient=patients['fanja'], medecin=rakoto, date_heure=a(jour, 14, 0),
            type=RendezVous.Type.CONSULTATION, motif='Douleurs lombaires',
        )

    @staticmethod
    def encaisser(facture, secretaire, quand):
        facture.statut = Facture.StatutPaiement.PAYEE
        facture.date_paiement = quand
        facture.encaisse_par = secretaire
        facture.save(update_fields=['statut', 'date_paiement', 'encaisse_par'])
