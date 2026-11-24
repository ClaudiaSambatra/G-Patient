from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management import call_command
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
from planning.models import HoraireMedecin
from prescriptions.models import LigneOrdonnance, Ordonnance

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


def jour_passe(jours):
    """Jour ouvré situé `jours` jours avant aujourd'hui (reculé au vendredi s'il tombe un week-end)."""
    jour = timezone.localdate() - timedelta(days=jours)
    while jour.weekday() >= 5:
        jour -= timedelta(days=1)
    return jour


def a(jour, heure, minute=0):
    return timezone.make_aware(datetime.combine(jour, time(heure, minute)))


# Consultations passées : (patient, médecin, il y a N jours, heure, motif, observations, diagnostic,
# compte rendu, constantes (température, poids, taille, tension, pouls), lignes d'ordonnance)
# Une ligne d'ordonnance est (médicament du stock ou None, nom, dosage, forme, quantité, dose, fréquence, durée).
HISTORIQUE = [
    ('toky', 'dr.rakoto', 60, 9, 'Bilan hypertension et diabète',
     'TA élevée au repos, pas de signe de complication. Glycémie à jeun 1,45 g/L.',
     'Hypertension artérielle mal équilibrée, diabète type 2',
     'Ajustement du traitement antihypertenseur, régime pauvre en sel et en sucres rapides.',
     ('36.9', '86.00', '172.0', '160/95', 78),
     [(None, 'Amlodipine', '10 mg', 'Comprimé', 1, '1 comprimé', '1 fois par jour, le matin', '30 jours'),
      (None, 'Metformine', '850 mg', 'Comprimé', 1, '1 comprimé', '2 fois par jour, aux repas', '30 jours')]),
    ('toky', 'dr.rakoto', 30, 10, 'Contrôle tension',
     'Amélioration nette, TA 140/85. Le patient suit le régime.',
     'Hypertension en cours d\'équilibration, diabète type 2 stable',
     'Poursuite du traitement, contrôle dans un mois.',
     ('36.7', '84.50', '172.0', '140/85', 72),
     [('Paracétamol', 'Paracétamol', '500 mg', 'Comprimé', 2, '1 comprimé',
       'Si douleur, maximum 3 fois par jour', '5 jours')]),
    ('nomena', 'dr.rasoa', 45, 9, 'Fièvre et toux depuis 3 jours',
     'Fièvre à 38,9 °C, tympans normaux, gorge rouge, auscultation pulmonaire normale.',
     'Angine érythémateuse',
     'Antibiothérapie 6 jours, antipyrétique si fièvre. Revoir si pas d\'amélioration sous 48 h.',
     ('38.9', '22.00', '118.0', '100/60', 110),
     [('Amoxicilline', 'Amoxicilline', '500 mg', 'Gélule', 1, '1 gélule', '2 fois par jour', '6 jours'),
      ('Paracétamol', 'Paracétamol', '500 mg', 'Comprimé', 1, '1/2 comprimé',
       'Si fièvre, toutes les 6 heures', '3 jours')]),
    ('fanja', 'dr.rakoto', 20, 15, 'Douleurs lombaires',
     'Contracture paravertébrale lombaire, pas de déficit neurologique.',
     'Lombalgie commune',
     'Repos relatif, antalgiques, reprise progressive de l\'activité.',
     ('36.8', '61.00', '160.0', '120/75', 70),
     [('Paracétamol', 'Paracétamol', '500 mg', 'Comprimé', 2, '1 comprimé', '3 fois par jour', '7 jours')]),
]


class Command(BaseCommand):
    help = "Charge un jeu de données de démonstration durable (comptes, patients, stock, historique)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--mot-de-passe', default='Demo2026!',
            help="Mot de passe des comptes de démonstration (défaut : Demo2026!).",
        )

    def handle(self, *args, **options):
        if Utilisateur.objects.filter(username='dr.rakoto').exists():
            raise CommandError("Les données de démonstration sont déjà chargées (le compte dr.rakoto existe).")

        with transaction.atomic():
            self.charger(options['mot_de_passe'])
        # Gardes autour d'aujourd'hui : datées, donc à relancer avant une démo (python manage.py garde_demo)
        call_command('garde_demo', stdout=self.stdout)

        self.stdout.write(self.style.SUCCESS(
            "Données de démonstration chargées. "
            f"Comptes dr.rakoto, dr.rasoa, secretaire (mot de passe : {options['mot_de_passe']})."
        ))

    def charger(self, mot_de_passe):
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

        # --- Planning : horaires hebdomadaires (sans date, ils restent valables) ---
        for j in range(5):
            HoraireMedecin.objects.create(medecin=rakoto, jour=j, heure_debut=time(8), heure_fin=time(12))
            HoraireMedecin.objects.create(medecin=rakoto, jour=j, heure_debut=time(14), heure_fin=time(17))
            HoraireMedecin.objects.create(medecin=rasoa, jour=j, heure_debut=time(8), heure_fin=time(12))

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

        # --- Historique : uniquement du passé, donc rien ne « périme » ---
        consultations = []
        for (cle, username, jours, heure, motif, observations, diagnostic, compte_rendu,
             constantes, lignes) in HISTORIQUE:
            consultations.append(self.consultation_passee(
                patients[cle], medecins[username], secretaire, stock, jour_passe(jours), heure,
                motif, observations, diagnostic, compte_rendu, constantes, lignes,
            ))

        # Suivi gratuit de Toky 7 jours après son bilan (moins de 15 jours : pas de facture)
        self.suivi_passe(consultations[0])

    def consultation_passee(self, patient, medecin, secretaire, stock, jour, heure, motif,
                            observations, diagnostic, compte_rendu, constantes, lignes):
        rdv = RendezVous.objects.create(
            patient=patient, medecin=medecin, date_heure=a(jour, heure),
            type=RendezVous.Type.CONSULTATION, statut=RendezVous.Statut.TERMINE, motif=motif,
        )
        self.encaisser(rdv.facture, secretaire, a(jour, heure) - timedelta(minutes=10))
        consultation = Consultation.objects.create(
            patient=patient, medecin=medecin.utilisateur, rendez_vous=rdv, date_consultation=a(jour, heure, 5),
            motif=motif, observations=observations, diagnostic=diagnostic, compte_rendu=compte_rendu,
        )
        temperature, poids, taille, tension, pouls = constantes
        ConstantesVitales.objects.create(
            consultation=consultation, temperature=Decimal(temperature), poids=Decimal(poids),
            taille=Decimal(taille), tension_arterielle=tension, frequence_cardiaque=pouls,
            date_prise=a(jour, heure, 5),
        )
        ordonnance = Ordonnance.objects.create(consultation=consultation)
        montant = Decimal(0)
        for ordre, (du_stock, nom, dosage, forme, quantite, dose, frequence, duree) in enumerate(lignes, 1):
            med = stock[du_stock] if du_stock else None
            LigneOrdonnance.objects.create(
                ordonnance=ordonnance, medicament=nom, medicament_stock=med, quantite=quantite,
                dosage=dosage, forme=forme, dose_par_prise=dose, frequence=frequence, duree=duree, ordre=ordre,
            )
            if med:
                montant += quantite * med.prix_unitaire
        # Médicaments délivrés par le cabinet : facture payée et sortie de stock
        if montant:
            facture = Facture.objects.create(
                patient=patient, type=Facture.Type.MEDICAMENTS, ordonnance=ordonnance,
                designation=f"Médicaments — ordonnance {ordonnance.numero}", montant=montant,
            )
            self.encaisser(facture, secretaire, a(jour, heure, 30))
            sortir_medicaments_facture(facture, secretaire)
        return consultation

    @staticmethod
    def suivi_passe(origine):
        jour = timezone.localdate(origine.date_consultation) + timedelta(days=7)
        origine.date_suivi_recommandee = jour
        origine.motif_suivi = 'Contrôle de la tension après ajustement du traitement'
        origine.save()
        rdv = RendezVous.objects.create(
            patient=origine.patient, medecin=origine.rendez_vous.medecin, date_heure=a(jour, 9),
            type=RendezVous.Type.CONTROLE, statut=RendezVous.Statut.TERMINE,
            consultation_origine=origine, motif=origine.motif_suivi,
        )
        suivi = Consultation.objects.create(
            patient=origine.patient, medecin=origine.medecin, rendez_vous=rdv, consultation_origine=origine,
            date_consultation=a(jour, 9, 5), motif=origine.motif_suivi,
            observations='TA 150/90, bonne tolérance du traitement. Glycémie à jeun 1,30 g/L.',
            diagnostic='Hypertension en amélioration, diabète type 2',
            compte_rendu='Traitement poursuivi sans changement, régime à maintenir.',
        )
        ConstantesVitales.objects.create(
            consultation=suivi, temperature=Decimal('36.8'), poids=Decimal('85.50'),
            taille=Decimal('172.0'), tension_arterielle='150/90', frequence_cardiaque=74,
            date_prise=a(jour, 9, 5),
        )

    @staticmethod
    def encaisser(facture, secretaire, quand):
        facture.statut = Facture.StatutPaiement.PAYEE
        facture.date_paiement = quand
        facture.encaisse_par = secretaire
        facture.save(update_fields=['statut', 'date_paiement', 'encaisse_par'])
