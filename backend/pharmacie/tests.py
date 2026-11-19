from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils.timezone import make_aware
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur
from appointments.models import RendezVous
from billing.models import Facture
from consultations.models import Consultation
from patients.models import Patient
from .models import MouvementStock, StockMedicament
from .metrics import CollecteurStock


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_data():
    medecin_user = Utilisateur.objects.create_user(
        username='dr_rado', password='password123', role='MEDECIN', first_name='Rado', last_name='Ravelo'
    )
    secretaire = Utilisateur.objects.create_user(username='secr_lova', password='password123', role='SECRETAIRE')
    admin_user = Utilisateur.objects.create_user(username='admin_stock', password='password123', role='ADMIN')
    patient = Patient.objects.create(nom='Rabe', prenom='Soa', date_naissance='1995-04-12')
    rdv = RendezVous.objects.create(
        patient=patient,
        medecin=medecin_user.medecin_profile,
        date_heure=make_aware(datetime.now() - timedelta(hours=1)),
        statut='TERMINE',
    )
    consultation = Consultation.objects.create(
        patient=patient, medecin=medecin_user, rendez_vous=rdv,
        motif='Angine', observations='Gorge rouge', diagnostic='Angine bactérienne',
    )
    amoxicilline = StockMedicament.objects.create(
        nom='Amoxicilline', dosage='1 g', forme='Comprimé', prix_unitaire=Decimal('8000'),
        quantite=20, seuil_alerte=5,
    )
    paracetamol = StockMedicament.objects.create(
        nom='Paracétamol', dosage='500 mg', forme='Comprimé', prix_unitaire=Decimal('2500'),
        quantite=3, seuil_alerte=5,
    )
    return {
        'medecin_user': medecin_user,
        'secretaire': secretaire,
        'admin_user': admin_user,
        'patient': patient,
        'consultation': consultation,
        'amoxicilline': amoxicilline,
        'paracetamol': paracetamol,
    }


def creer_ordonnance(api_client, data, lignes):
    api_client.force_authenticate(user=data['medecin_user'])
    response = api_client.post(reverse('ordonnance-list'), {
        'consultation': data['consultation'].id,
        'lignes': lignes,
    }, format='json')
    assert response.status_code == status.HTTP_201_CREATED, response.data
    return response.data


LIGNE_BASE = {'forme': 'Comprimé', 'frequence': '3 fois par jour', 'duree': '7 jours'}


# ==============================================================================
# CATALOGUE & PERMISSIONS
# ==============================================================================

@pytest.mark.django_db
def test_secretaire_cree_medicament_avec_stock_initial_trace(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    response = api_client.post(reverse('stock-medicament-list'), {
        'nom': 'Ibuprofène', 'dosage': '400 mg', 'forme': 'Comprimé',
        'prix_unitaire': '3000', 'seuil_alerte': 4, 'quantite_initiale': 12,
    }, format='json')
    assert response.status_code == status.HTTP_201_CREATED, response.data
    med = StockMedicament.objects.get(nom='Ibuprofène')
    assert med.quantite == 12
    mouvement = med.mouvements.get()
    assert mouvement.type == MouvementStock.Type.ENTREE
    assert mouvement.quantite == 12
    assert mouvement.auteur == test_data['secretaire']


@pytest.mark.django_db
def test_quantite_non_modifiable_directement(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    med = test_data['amoxicilline']
    response = api_client.patch(
        reverse('stock-medicament-detail', args=[med.id]), {'quantite': 999, 'prix_unitaire': '9000'}, format='json'
    )
    assert response.status_code == status.HTTP_200_OK
    med.refresh_from_db()
    assert med.quantite == 20
    assert med.prix_unitaire == Decimal('9000')


@pytest.mark.django_db
def test_medecin_lit_le_catalogue_mais_ne_modifie_pas(api_client, test_data):
    api_client.force_authenticate(user=test_data['medecin_user'])
    assert api_client.get(reverse('stock-medicament-list')).status_code == status.HTTP_200_OK
    response = api_client.post(
        reverse('stock-medicament-entree', args=[test_data['amoxicilline'].id]), {'quantite': 5}, format='json'
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get(reverse('mouvement-stock-list')).status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_filtre_alerte(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    response = api_client.get(reverse('stock-medicament-list') + '?alerte=1')
    noms = [m['nom'] for m in response.data['results']]
    assert noms == ['Paracétamol']
    assert response.data['results'][0]['en_alerte'] is True


# ==============================================================================
# ENTRÉES & INVENTAIRE
# ==============================================================================

@pytest.mark.django_db
def test_entree_augmente_le_stock(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    med = test_data['paracetamol']
    response = api_client.post(
        reverse('stock-medicament-entree', args=[med.id]), {'quantite': 30, 'motif': 'Livraison grossiste'},
        format='json'
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data['quantite'] == 33
    assert response.data['en_alerte'] is False
    assert med.mouvements.get().motif == 'Livraison grossiste'


@pytest.mark.django_db
def test_ajustement_inventaire_trace_la_difference(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    med = test_data['amoxicilline']
    response = api_client.post(
        reverse('stock-medicament-ajustement', args=[med.id]),
        {'quantite_reelle': 17, 'motif': '3 boîtes périmées'}, format='json'
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data['quantite'] == 17
    mouvement = med.mouvements.get()
    assert mouvement.type == MouvementStock.Type.AJUSTEMENT
    assert mouvement.quantite == -3
    assert mouvement.quantite_apres == 17


@pytest.mark.django_db
def test_suppression_refusee_si_historique(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    med = test_data['amoxicilline']
    api_client.post(reverse('stock-medicament-entree', args=[med.id]), {'quantite': 1}, format='json')
    api_client.force_authenticate(user=test_data['admin_user'])
    response = api_client.delete(reverse('stock-medicament-detail', args=[med.id]))
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert StockMedicament.objects.filter(pk=med.pk).exists()


# ==============================================================================
# LIEN ORDONNANCE → FACTURE → SORTIE DE STOCK
# ==============================================================================

@pytest.mark.django_db
def test_ordonnance_calcule_le_montant_pharmacie(api_client, test_data):
    ordonnance = creer_ordonnance(api_client, test_data, [
        {**LIGNE_BASE, 'medicament': 'Amoxicilline', 'medicament_stock': test_data['amoxicilline'].id, 'quantite': 2},
        {**LIGNE_BASE, 'medicament': 'Sirop hors stock'},
    ])
    # 2 × 8000 ; le médicament en texte libre (pharmacie extérieure) n'est pas compté
    assert Decimal(str(ordonnance['montant_pharmacie'])) == Decimal('16000')
    assert ordonnance['lignes'][0]['medicament_stock_disponible'] == 20
    assert ordonnance['lignes'][1]['medicament_stock'] is None


@pytest.mark.django_db
def test_ligne_liee_au_stock_reprend_le_nom_du_catalogue(api_client, test_data):
    ordonnance = creer_ordonnance(api_client, test_data, [{
        **LIGNE_BASE, 'medicament': 'Doliprane', 'dosage': '1 g', 'forme': 'Sirop',
        'medicament_stock': test_data['amoxicilline'].id, 'quantite': 2,
    }])
    ligne = ordonnance['lignes'][0]
    assert (ligne['medicament'], ligne['dosage'], ligne['forme']) == ('Amoxicilline', '1 g', 'Comprimé')


@pytest.mark.django_db
def test_medicament_desactive_refuse_dans_une_ordonnance(api_client, test_data):
    test_data['amoxicilline'].actif = False
    test_data['amoxicilline'].save()
    api_client.force_authenticate(user=test_data['medecin_user'])
    response = api_client.post(reverse('ordonnance-list'), {
        'consultation': test_data['consultation'].id,
        'lignes': [{**LIGNE_BASE, 'medicament': 'Amoxicilline', 'medicament_stock': test_data['amoxicilline'].id}],
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_encaissement_facture_medicaments_sort_le_stock(api_client, test_data):
    ordonnance = creer_ordonnance(api_client, test_data, [
        {**LIGNE_BASE, 'medicament': 'Amoxicilline', 'medicament_stock': test_data['amoxicilline'].id, 'quantite': 2},
        {**LIGNE_BASE, 'medicament': 'Sirop hors stock'},
    ])
    facture = Facture.objects.create(
        patient=test_data['patient'], type=Facture.Type.MEDICAMENTS,
        ordonnance_id=ordonnance['id'], designation='Médicaments', montant=Decimal('16000'),
    )
    # La création de la facture ne touche pas au stock
    test_data['amoxicilline'].refresh_from_db()
    assert test_data['amoxicilline'].quantite == 20

    api_client.force_authenticate(user=test_data['secretaire'])
    response = api_client.post(reverse('facture-encaisser', args=[facture.id]))
    assert response.status_code == status.HTTP_200_OK, response.data

    test_data['amoxicilline'].refresh_from_db()
    assert test_data['amoxicilline'].quantite == 18
    mouvement = MouvementStock.objects.get(facture=facture)
    assert mouvement.type == MouvementStock.Type.SORTIE
    assert mouvement.quantite == -2
    assert mouvement.auteur == test_data['secretaire']


@pytest.mark.django_db
def test_encaissement_refuse_si_stock_insuffisant_et_rien_n_est_modifie(api_client, test_data):
    ordonnance = creer_ordonnance(api_client, test_data, [
        {**LIGNE_BASE, 'medicament': 'Amoxicilline', 'medicament_stock': test_data['amoxicilline'].id, 'quantite': 1},
        {**LIGNE_BASE, 'medicament': 'Paracétamol', 'medicament_stock': test_data['paracetamol'].id, 'quantite': 5},
    ])
    facture = Facture.objects.create(
        patient=test_data['patient'], type=Facture.Type.MEDICAMENTS,
        ordonnance_id=ordonnance['id'], designation='Médicaments', montant=Decimal('20500'),
    )
    api_client.force_authenticate(user=test_data['secretaire'])
    response = api_client.post(reverse('facture-encaisser', args=[facture.id]))
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'Stock insuffisant' in response.data['detail']

    # Transaction annulée : facture toujours impayée, aucun stock sorti (même l'amoxicilline)
    facture.refresh_from_db()
    assert facture.statut == Facture.StatutPaiement.IMPAYEE
    test_data['amoxicilline'].refresh_from_db()
    assert test_data['amoxicilline'].quantite == 20
    assert not MouvementStock.objects.exists()


# ==============================================================================
# TABLEAU DE BORD & SUPERVISION
# ==============================================================================

@pytest.mark.django_db
def test_tableau_de_bord_secretaire_liste_les_alertes(api_client, test_data):
    from accounts.dashboard_services import medicaments_en_alerte
    alertes = medicaments_en_alerte()
    assert [a['libelle'] for a in alertes] == ['Paracétamol 500 mg (Comprimé)']


@pytest.mark.django_db
def test_metrique_prometheus_medicaments_sous_seuil(test_data):
    StockMedicament.objects.create(nom='Vitamine C', prix_unitaire=Decimal('1000'), quantite=0, seuil_alerte=2)
    valeurs = {m.name: m.samples[0].value for m in CollecteurStock().collect()}
    assert valeurs['pharmacie_medicaments_sous_seuil'] == 2
    assert valeurs['pharmacie_medicaments_en_rupture'] == 1


# ==============================================================================
# NOTIFICATION DE SEUIL PAR E-MAIL
# ==============================================================================

@pytest.mark.django_db(transaction=True)
def test_email_envoye_une_seule_fois_au_franchissement_du_seuil(api_client, test_data, mailoutbox):
    test_data['secretaire'].email = 'secretaire@cabinet.mg'
    test_data['secretaire'].save()
    test_data['admin_user'].email = 'admin@cabinet.mg'
    test_data['admin_user'].save()
    api_client.force_authenticate(user=test_data['secretaire'])
    med = test_data['amoxicilline']  # 20 en stock, seuil 5
    url = reverse('stock-medicament-ajustement', args=[med.id])

    api_client.post(url, {'quantite_reelle': 6, 'motif': 'Inventaire'}, format='json')
    assert len(mailoutbox) == 0  # encore au-dessus du seuil

    api_client.post(url, {'quantite_reelle': 4, 'motif': 'Casse'}, format='json')
    assert len(mailoutbox) == 1
    mail = mailoutbox[0]
    assert 'Stock bas' in mail.subject and 'Amoxicilline' in mail.subject
    assert sorted(mail.to) == ['admin@cabinet.mg', 'secretaire@cabinet.mg']
    assert '4 boîte(s)' in mail.body

    api_client.post(url, {'quantite_reelle': 3, 'motif': 'Casse'}, format='json')
    assert len(mailoutbox) == 1  # déjà sous le seuil : pas de nouvel e-mail


@pytest.mark.django_db(transaction=True)
def test_aucun_email_si_encaissement_annule(api_client, test_data, mailoutbox):
    test_data['secretaire'].email = 'secretaire@cabinet.mg'
    test_data['secretaire'].save()
    # 20 en stock, seuil 5 : sortir 16 franchirait le seuil, mais le paracétamol bloque l'encaissement
    ordonnance = creer_ordonnance(api_client, test_data, [
        {**LIGNE_BASE, 'medicament': 'Amoxicilline', 'medicament_stock': test_data['amoxicilline'].id, 'quantite': 16},
        {**LIGNE_BASE, 'medicament': 'Paracétamol', 'medicament_stock': test_data['paracetamol'].id, 'quantite': 9},
    ])
    facture = Facture.objects.create(
        patient=test_data['patient'], type=Facture.Type.MEDICAMENTS,
        ordonnance_id=ordonnance['id'], designation='Médicaments', montant=Decimal('150500'),
    )
    api_client.force_authenticate(user=test_data['secretaire'])
    response = api_client.post(reverse('facture-encaisser', args=[facture.id]))
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert len(mailoutbox) == 0
