import pytest
import threading
from datetime import datetime, timedelta
from decimal import Decimal
from django.urls import reverse
from django.utils.timezone import make_aware
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from prescriptions.models import Ordonnance, LigneOrdonnance
from billing.models import Facture


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_data():
    medecin1_user = Utilisateur.objects.create_user(
        username='dr_martin', password='password123', role='MEDECIN',
        first_name='Jean', last_name='Martin'
    )
    medecin1 = medecin1_user.medecin_profile
    medecin1.specialite = 'Généraliste'
    medecin1.numero_ordre = '101/MG/2020'
    medecin1.save()

    medecin2_user = Utilisateur.objects.create_user(
        username='dr_bernard', password='password123', role='MEDECIN',
        first_name='Paul', last_name='Bernard'
    )
    medecin2 = medecin2_user.medecin_profile
    medecin2.specialite = 'Pédiatre'
    medecin2.numero_ordre = '202/MG/2021'
    medecin2.save()

    secretaire = Utilisateur.objects.create_user(
        username='secr_claire', password='password123', role='SECRETAIRE'
    )
    admin_user = Utilisateur.objects.create_user(
        username='admin_boss', password='password123', role='ADMIN'
    )

    patient = Patient.objects.create(
        nom='Rabe', prenom='Soa', date_naissance='1995-04-12', contact='0341122233'
    )
    patient2 = Patient.objects.create(
        nom='Randria', prenom='Koto', date_naissance='1988-11-20', contact='0325544433'
    )

    rdv1 = RendezVous.objects.create(
        patient=patient,
        medecin=medecin1,
        date_heure=make_aware(datetime.now() - timedelta(hours=2)),
        statut='TERMINE'
    )

    consultation1 = Consultation.objects.create(
        patient=patient,
        medecin=medecin1_user,
        rendez_vous=rdv1,
        motif='Fièvre et toux',
        observations='Examen pulmonaire normal',
        diagnostic='Syndrome grippal'
    )

    rdv2 = RendezVous.objects.create(
        patient=patient2,
        medecin=medecin2,
        date_heure=make_aware(datetime.now() - timedelta(hours=1)),
        statut='TERMINE'
    )

    consultation2 = Consultation.objects.create(
        patient=patient2,
        medecin=medecin2_user,
        rendez_vous=rdv2,
        motif='Vaccination',
        observations='Rien à signaler',
        diagnostic='Vaccin à jour'
    )

    return {
        'medecin1_user': medecin1_user,
        'medecin1': medecin1,
        'medecin2_user': medecin2_user,
        'medecin2': medecin2,
        'secretaire': secretaire,
        'admin_user': admin_user,
        'patient': patient,
        'patient2': patient2,
        'consultation1': consultation1,
        'consultation2': consultation2,
    }


# ==============================================================================
# 1. CRÉATION D'ORDONNANCE & NUMÉROTATION
# ==============================================================================

@pytest.mark.django_db
def test_medecin_can_create_prescription_with_structured_lines(api_client, test_data):
    """Le médecin traitant crée une ordonnance avec des lignes structurées."""
    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'instructions_generales': 'Prendre avec un grand verre d\'eau au milieu des repas.',
        'lignes': [
            {
                'medicament': 'Amoxicilline',
                'dosage': '1 g',
                'forme': 'Comprimé',
                'dose_par_prise': '1 cp',
                'voie_administration': 'ORALE',
                'frequence': '3 fois par jour',
                'duree': '7 jours',
                'instructions': 'Finir le traitement',
                'ordre': 1
            },
            {
                'medicament': 'Paracétamol',
                'dosage': '500 mg',
                'forme': 'Gélule',
                'dose_par_prise': '1 gélule',
                'voie_administration': 'ORALE',
                'frequence': 'Toutes les 6 heures si douleur',
                'duree': '5 jours',
                'instructions': 'Ne pas dépasser 3g/jour',
                'ordre': 2
            }
        ]
    }

    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert 'numero' in response.data
    assert response.data['numero'].startswith(f"ORD-{datetime.now().year}-")
    assert response.data['patient'] == test_data['patient'].id
    assert response.data['patient_nom'] == 'Rabe'
    assert response.data['patient_prenom'] == 'Soa'
    assert response.data['medecin_nom'] == 'Dr. Martin Jean'
    assert response.data['medecin_specialite'] == 'Généraliste'
    assert response.data['medecin_numero_ordre'] == '101/MG/2020'
    assert len(response.data['lignes']) == 2
    assert response.data['statut'] == 'ACTIVE'

    # Vérification en base
    ord_obj = Ordonnance.objects.get(id=response.data['id'])
    assert ord_obj.lignes.count() == 2
    # Vérification synchronisation rétro-compatible des champs texte
    assert 'Amoxicilline 1 g' in ord_obj.medicaments
    assert 'Paracétamol 500 mg' in ord_obj.medicaments
    assert ord_obj.posologie != ''
    assert ord_obj.duree != ''


@pytest.mark.django_db
def test_prescription_number_generation_and_uniqueness():
    """Vérifie la génération séquentielle et unique du numéro ORD-YYYY-XXXXX."""
    year = datetime.now().year
    num1 = Ordonnance.generer_numero()
    assert num1 == f"ORD-{year}-00001"

    # Création pour occuper le numéro
    patient = Patient.objects.create(nom='Test', prenom='Num', date_naissance='2000-01-01')
    user = Utilisateur.objects.create_user(username='dr_num', password='pwd', role='MEDECIN')
    consult = Consultation.objects.create(patient=patient, medecin=user, motif='Test num')

    ord1 = Ordonnance.objects.create(consultation=consult, numero=num1)
    assert ord1.numero == f"ORD-{year}-00001"

    num2 = Ordonnance.generer_numero()
    assert num2 == f"ORD-{year}-00002"


@pytest.mark.django_db(transaction=True)
def test_concurrency_prescription_number():
    """Vérifie la création concurrente et sans doublon d'ordonnances."""
    patient = Patient.objects.create(nom='Concurrent', prenom='Test', date_naissance='1990-01-01')
    user = Utilisateur.objects.create_user(username='dr_concurrent', password='pwd', role='MEDECIN')
    consult = Consultation.objects.create(patient=patient, medecin=user, motif='Test concurrence')

    created_numbers = []
    errors = []
    lock = threading.Lock()

    def worker():
        try:
            ord_obj = Ordonnance.objects.create(
                consultation=consult,
                medicaments='Test multi-thread'
            )
            with lock:
                created_numbers.append(ord_obj.numero)
        except Exception as e:
            with lock:
                errors.append(str(e))
        finally:
            connection.close()

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0
    assert len(created_numbers) == 5
    # Aucun doublon parmi les 5 ordonnances créées en simultané
    assert len(set(created_numbers)) == 5
    for n in created_numbers:
        assert n.startswith("ORD-")


# ==============================================================================
# 2. CONTRÔLE D'ACCÈS & SÉCURITÉ MÉDICALE
# ==============================================================================

@pytest.mark.django_db
def test_medecin_cannot_prescribe_for_other_doctor_consultation(api_client, test_data):
    """Un médecin ne peut pas prescrire pour une consultation effectuée par un confrère."""
    # Dr Bernard tente de prescrire pour la consultation du Dr Martin
    api_client.force_authenticate(user=test_data['medecin2_user'])
    url = reverse('ordonnance-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'lignes': [{'medicament': 'Ibuprofène', 'dosage': '400 mg'}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Vous n'êtes pas le praticien responsable de cette consultation" in str(response.data)


@pytest.mark.django_db
def test_secretaire_cannot_create_prescription(api_client, test_data):
    """Le secrétariat ne peut en aucun cas créer une ordonnance."""
    api_client.force_authenticate(user=test_data['secretaire'])
    url = reverse('ordonnance-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'lignes': [{'medicament': 'Ibuprofène', 'dosage': '400 mg'}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_cannot_create_prescription(api_client, test_data):
    """L'administrateur n'a pas le droit de créer une ordonnance médicale."""
    api_client.force_authenticate(user=test_data['admin_user'])
    url = reverse('ordonnance-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'lignes': [{'medicament': 'Ibuprofène', 'dosage': '400 mg'}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_read_permissions_for_doctor_secretary_and_admin(api_client, test_data):
    """Médecin, secrétaire et administrateur peuvent consulter les ordonnances."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00099',
        medicaments='Doliprane 500mg'
    )

    url = reverse('ordonnance-detail', kwargs={'pk': ord_obj.id})

    # 1. Medecin 1 (prescripteur)
    api_client.force_authenticate(user=test_data['medecin1_user'])
    res1 = api_client.get(url)
    assert res1.status_code == status.HTTP_200_OK

    # 2. Medecin 2 (autre médecin sans RDV de contrôle) -> 404 (confidentialité médicale)
    api_client.force_authenticate(user=test_data['medecin2_user'])
    res2 = api_client.get(url)
    assert res2.status_code == status.HTTP_404_NOT_FOUND

    # 3. Secrétaire
    api_client.force_authenticate(user=test_data['secretaire'])
    res3 = api_client.get(url)
    assert res3.status_code == status.HTTP_200_OK

    # 4. Admin
    api_client.force_authenticate(user=test_data['admin_user'])
    res4 = api_client.get(url)
    assert res4.status_code == status.HTTP_200_OK


# ==============================================================================
# 3. MODIFICATION TRAÇABLE ET HISTORIQUE D'AUDIT
# ==============================================================================

@pytest.mark.django_db
def test_modification_requires_motif_correction(api_client, test_data):
    """La modification d'une ordonnance requiert obligatoirement un motif explicite."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00010',
        medicaments='Spasfon'
    )
    LigneOrdonnance.objects.create(
        ordonnance=ord_obj, medicament='Spasfon', dosage='80 mg', ordre=1
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-detail', kwargs={'pk': ord_obj.id})

    # Tentative de mise à jour sans motif_correction
    update_data = {
        'instructions_generales': 'Nouvelle consigne',
        'lignes': [{'medicament': 'Spasfon Lyoc', 'dosage': '80 mg', 'ordre': 1}]
    }
    response = api_client.put(url, update_data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "motif_correction" in response.data or "Un motif de correction" in str(response.data)


@pytest.mark.django_db
def test_modification_creates_audit_trail_and_updates_status(api_client, test_data):
    """Une correction traçable enregistre l'auteur, la date, le motif et bascule en MODIFIEE."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00011',
        medicaments='Aspirine 500 mg'
    )
    LigneOrdonnance.objects.create(
        ordonnance=ord_obj, medicament='Aspirine', dosage='500 mg', ordre=1
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-detail', kwargs={'pk': ord_obj.id})

    update_data = {
        'motif_correction': 'Remplacement de l\'aspirine pour intolérance gastrique.',
        'lignes': [
            {
                'medicament': 'Paracétamol',
                'dosage': '1000 mg',
                'forme': 'Comprimé',
                'dose_par_prise': '1 cp',
                'voie_administration': 'ORALE',
                'frequence': '3 fois par jour',
                'duree': '4 jours',
                'instructions': 'Pas d\'automédication',
                'ordre': 1
            }
        ]
    }
    response = api_client.put(url, update_data, format='json')
    assert response.status_code == status.HTTP_200_OK

    ord_obj.refresh_from_db()
    assert ord_obj.statut == 'MODIFIEE'
    assert ord_obj.numero == 'ORD-2026-00011'  # Numéro inchangé

    # Vérification des lignes
    lignes = list(ord_obj.lignes.all())
    assert len(lignes) == 1
    assert lignes[0].medicament == 'Paracétamol'

    # Vérification de l'historique d'audit
    historiques = ord_obj.historique.all()
    assert historiques.count() == 1
    audit = historiques.first()
    assert audit.auteur == test_data['medecin1_user']
    assert audit.motif_correction == 'Remplacement de l\'aspirine pour intolérance gastrique.'
    assert 'Aspirine' in str(audit.anciennes_lignes)
    assert 'Paracétamol' in str(audit.nouvelles_lignes)


@pytest.mark.django_db
def test_consultation_and_patient_are_immutable_on_prescription(api_client, test_data):
    """Il est impossible de changer la consultation ou le patient d'une ordonnance."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00012'
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-detail', kwargs={'pk': ord_obj.id})

    # Tentative frauduleuse de rattacher l'ordonnance à la consultation 2
    response = api_client.patch(url, {
        'consultation': test_data['consultation2'].id,
        'motif_correction': 'Tentative changement consultation'
    }, format='json')

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "La consultation associée à une ordonnance ne peut pas être modifiée" in str(response.data)

    ord_obj.refresh_from_db()
    assert ord_obj.consultation == test_data['consultation1']


# ==============================================================================
# 4. ANNULATION MOTIVÉE & PROTECTION SUPPRESSION
# ==============================================================================

@pytest.mark.django_db
def test_medecin_can_cancel_prescription(api_client, test_data):
    """Le prescripteur peut annuler son ordonnance avec un motif."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00013'
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-annuler', kwargs={'pk': ord_obj.id})

    # 1. Sans motif -> 400
    res_fail = api_client.post(url, {}, format='json')
    assert res_fail.status_code == status.HTTP_400_BAD_REQUEST

    # 2. Avec motif -> 200
    res_ok = api_client.post(url, {'motif': 'Prescription erronée de posologie'}, format='json')
    assert res_ok.status_code == status.HTTP_200_OK

    ord_obj.refresh_from_db()
    assert ord_obj.statut == 'ANNULEE'
    assert ord_obj.historique.filter(motif_correction__icontains='Prescription erronée').exists()


@pytest.mark.django_db
def test_cannot_delete_prescription_with_invoice(api_client, test_data):
    """Impossible de supprimer une ordonnance si une facture y est rattachée."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00014'
    )
    Facture.objects.create(
        patient=test_data['patient'],
        ordonnance=ord_obj,
        montant=Decimal('15000.00'),
        statut='IMPAYEE',
        type='MEDICAMENTS'
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-detail', kwargs={'pk': ord_obj.id})

    response = api_client.delete(url)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "facture comptable" in str(response.data)
    assert Ordonnance.objects.filter(id=ord_obj.id).exists()


# ==============================================================================
# 5. RÈGLES DE FACTURATION & PRÉVENTION DES DOUBLONS (OPTION A)
# ==============================================================================

@pytest.mark.django_db
def test_prescription_creation_does_not_create_invoice(api_client, test_data):
    """Option A : La création d'une ordonnance ne génère PAS de facture automatique."""
    initial_factures_count = Facture.objects.count()

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('ordonnance-list')
    payload = {
        'consultation': test_data['consultation1'].id,
        'lignes': [{'medicament': 'Vitamine C', 'dosage': '1000 mg'}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED

    assert Facture.objects.count() == initial_factures_count


@pytest.mark.django_db
def test_manual_invoice_creation_for_prescription_and_anti_duplicate(api_client, test_data):
    """Le secrétariat peut facturer manuellement, mais un doublon est strictement rejeté (HTTP 400)."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00015'
    )

    api_client.force_authenticate(user=test_data['secretaire'])
    url = reverse('facture-list')

    payload = {
        'patient': test_data['patient'].id,
        'ordonnance': ord_obj.id,
        'montant': '25000.00',
        'type': 'MEDICAMENTS',
        'statut': 'IMPAYEE'
    }

    # 1. Première facturation -> Succès
    res1 = api_client.post(url, payload, format='json')
    assert res1.status_code == status.HTTP_201_CREATED
    assert Facture.objects.filter(ordonnance=ord_obj).count() == 1

    # 2. Deuxième tentative (double clic / doublon) -> Rejet HTTP 400 avec message clair
    res2 = api_client.post(url, payload, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "existe déjà" in str(res2.data)
    assert Facture.objects.filter(ordonnance=ord_obj).count() == 1


@pytest.mark.django_db
def test_incoherent_patient_invoice_rejected(api_client, test_data):
    """Rejet si le patient de la facture ne correspond pas au patient de l'ordonnance."""
    ord_obj = Ordonnance.objects.create(
        consultation=test_data['consultation1'],
        numero='ORD-2026-00016'
    )

    api_client.force_authenticate(user=test_data['secretaire'])
    url = reverse('facture-list')

    payload = {
        'patient': test_data['patient2'].id,  # Patient différent !
        'ordonnance': ord_obj.id,
        'montant': '10000.00',
        'type': 'MEDICAMENTS',
        'statut': 'IMPAYEE'
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "ne correspond pas au patient de l'ordonnance" in str(response.data)
    assert Facture.objects.filter(ordonnance=ord_obj).count() == 0


# ==============================================================================
# 6. INTÉGRITÉ COMPTABLE DES DONNÉES HISTORIQUES
# ==============================================================================

@pytest.mark.django_db
def test_historical_prescription_and_paid_invoice_remain_intact():
    """Vérifie que les factures payées existantes et ordonnances restent strictement intègres."""
    patient = Patient.objects.create(nom='Historique', prenom='Jean', date_naissance='1990-01-01')
    user = Utilisateur.objects.create_user(username='dr_hist', password='pwd', role='MEDECIN')
    consult = Consultation.objects.create(patient=patient, medecin=user, motif='Consultation historique')

    ord_hist = Ordonnance.objects.create(
        consultation=consult,
        numero='ORD-2026-00001',
        medicaments='Pasti grippe 500 mg',
        posologie='A avaler tous les 2h',
        duree='5 jours'
    )

    facture_hist = Facture.objects.create(
        patient=patient,
        ordonnance=ord_hist,
        montant=Decimal('24000.00'),
        statut='PAYEE',
        type='MEDICAMENTS'
    )

    # Relecture
    facture_hist.refresh_from_db()
    assert facture_hist.montant == Decimal('24000.00')
    assert facture_hist.statut == 'PAYEE'
    assert facture_hist.ordonnance.numero == 'ORD-2026-00001'
    assert facture_hist.ordonnance.medicaments == 'Pasti grippe 500 mg'
