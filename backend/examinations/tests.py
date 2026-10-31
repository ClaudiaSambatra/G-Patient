import pytest
import threading
from datetime import datetime, timedelta
from django.urls import reverse
from django.utils import timezone
from django.db import connection, models
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from examinations.models import DemandeExamen, LigneDemandeExamen
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
        date_heure=timezone.now() - timedelta(hours=2),
        statut='TERMINE'
    )

    consultation1 = Consultation.objects.create(
        patient=patient,
        medecin=medecin1_user,
        rendez_vous=rdv1,
        motif='Fièvre et toux',
        observations='Examen pulmonaire suspect',
        diagnostic='Suspicion de pneumopathie'
    )

    rdv2 = RendezVous.objects.create(
        patient=patient2,
        medecin=medecin2,
        date_heure=timezone.now() - timedelta(hours=1),
        statut='TERMINE'
    )

    consultation2 = Consultation.objects.create(
        patient=patient2,
        medecin=medecin2_user,
        rendez_vous=rdv2,
        motif='Bilan annuel',
        observations='RAS',
        diagnostic='Examen normal'
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
# 1. CRÉATION DE DEMANDE D'EXAMENS & RESPECT DE FACTURATION
# ==============================================================================

@pytest.mark.django_db
def test_medecin_can_create_examination_request_with_lines(api_client, test_data):
    """Le médecin prescripteur crée une demande d'examens médicaux avec lignes structurées."""
    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'renseignements_cliniques': 'Fièvre prolongée depuis 5 jours avec râles crépitants base droite.',
        'lignes': [
            {
                'nom_examen': 'Numération Formule Sanguine (NFS) + CRP',
                'categorie': 'BIOLOGIE',
                'instructions': 'À jeun le matin',
                'ordre': 1
            },
            {
                'nom_examen': 'Radiographie pulmonaire face et profil',
                'categorie': 'IMAGERIE',
                'instructions': 'Recherche foyer infectieux alvéolaire',
                'ordre': 2
            }
        ]
    }

    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert 'numero' in response.data
    year = timezone.localtime().year if timezone.is_aware(timezone.now()) else datetime.now().year
    assert response.data['numero'].startswith(f"EXAM-{year}-")
    assert response.data['patient'] == test_data['patient'].id
    assert response.data['patient_nom'] == 'Rabe'
    assert response.data['patient_prenom'] == 'Soa'
    assert response.data['medecin_nom'] == 'Dr. Martin Jean'
    assert response.data['medecin_specialite'] == 'Généraliste'
    assert response.data['medecin_numero_ordre'] == '101/MG/2020'
    assert len(response.data['lignes']) == 2
    assert response.data['statut'] == 'ACTIVE'

    # Respect strict du secret médical : diagnostic confidentiel non exposé
    assert 'diagnostic' not in response.data
    assert 'observations' not in response.data

    # Vérification en base de données
    demande = DemandeExamen.objects.get(id=response.data['id'])
    assert demande.lignes.count() == 2
    assert demande.patient == test_data['patient']
    assert demande.medecin == test_data['medecin1_user']


@pytest.mark.django_db
def test_exam_request_does_not_generate_invoice(api_client, test_data):
    """La création d'une demande d'examens externe NE DOIT JAMAIS générer de facture."""
    initial_factures_count = Facture.objects.count()

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-list')
    payload = {
        'consultation': test_data['consultation1'].id,
        'renseignements_cliniques': 'Bilan pré-opératoire',
        'lignes': [
            {'nom_examen': 'Ionogramme sanguin', 'categorie': 'BIOLOGIE', 'ordre': 1}
        ]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED

    # Vérification stricte : aucun enregistrement de Facture créé
    assert Facture.objects.count() == initial_factures_count


# ==============================================================================
# 2. CONTRÔLE D'ACCÈS & SÉCURITÉ MÉDICALE
# ==============================================================================

@pytest.mark.django_db
def test_medecin_cannot_prescribe_for_other_doctor_consultation(api_client, test_data):
    """Un médecin ne peut pas prescrire pour une consultation effectuée par un confrère."""
    api_client.force_authenticate(user=test_data['medecin2_user'])
    url = reverse('demandes-examens-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'lignes': [{'nom_examen': 'Échographie abdominale', 'categorie': 'IMAGERIE', 'ordre': 1}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Vous n'êtes pas le praticien responsable" in str(response.data)


@pytest.mark.django_db
def test_secretaire_cannot_create_exam_request(api_client, test_data):
    """Le secrétariat ne peut pas prescrire d'examens médicaux."""
    api_client.force_authenticate(user=test_data['secretaire'])
    url = reverse('demandes-examens-list')

    payload = {
        'consultation': test_data['consultation1'].id,
        'lignes': [{'nom_examen': 'NFS', 'categorie': 'BIOLOGIE', 'ordre': 1}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_can_create_modify_and_cancel_exam_request(api_client, test_data):
    """L'administrateur a le droit de créer, modifier et annuler une prescription d'examens."""
    api_client.force_authenticate(user=test_data['admin_user'])
    url = reverse('demandes-examens-list')

    # 1. Création par l'admin
    payload = {
        'consultation': test_data['consultation1'].id,
        'renseignements_cliniques': 'Bilan prescrit ou testé par admin',
        'lignes': [{'nom_examen': 'Scanner cérébral', 'categorie': 'IMAGERIE', 'ordre': 1}]
    }
    response = api_client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    exam_id = response.data['id']

    # 2. Modification par l'admin
    detail_url = reverse('demandes-examens-detail', kwargs={'pk': exam_id})
    update_payload = {
        'motif_correction': 'Ajustement prescription par administrateur',
        'lignes': [
            {'nom_examen': 'Scanner cérébral injecté', 'categorie': 'IMAGERIE', 'instructions': 'À jeun', 'ordre': 1}
        ]
    }
    res_mod = api_client.put(detail_url, update_payload, format='json')
    assert res_mod.status_code == status.HTTP_200_OK
    assert res_mod.data['statut'] == 'MODIFIEE'

    # 3. Annulation par l'admin
    cancel_url = reverse('demandes-examens-annuler', kwargs={'pk': exam_id})
    res_cancel = api_client.post(cancel_url, {'motif': 'Annulé par admin pour test'}, format='json')
    assert res_cancel.status_code == status.HTTP_200_OK
    assert res_cancel.data['statut'] == 'ANNULEE'


# ==============================================================================
# 3. NUMÉROTATION UNIQUE & RÉSISTANCE CONCURRENCE
# ==============================================================================

@pytest.mark.django_db(transaction=True)
def test_concurrency_and_unique_number_generation():
    """Génération concurrente multi-threads sans doublon ni collision."""
    patient = Patient.objects.create(nom='Test', prenom='Concurrence', date_naissance='1990-01-01', contact='0340000000')
    user = Utilisateur.objects.create_user(username='doc_conc', password='pwd', role='MEDECIN')
    consult = Consultation.objects.create(patient=patient, medecin=user, motif='Test concurrence examens')

    created_numbers = []
    errors = []
    lock = threading.Lock()

    def worker():
        try:
            exam_obj = DemandeExamen.objects.create(
                consultation=consult,
                patient=patient,
                medecin=user,
                renseignements_cliniques='Test concurrence threads'
            )
            with lock:
                created_numbers.append(exam_obj.numero)
        except Exception as e:
            with lock:
                errors.append(str(e))
        finally:
            connection.close()

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(errors) == 0
    assert len(created_numbers) == 5
    assert len(set(created_numbers)) == 5
    for num in created_numbers:
        assert num.startswith("EXAM-")


# ==============================================================================
# 4. MODIFICATION TRAÇABLE, IMMUTABILITÉ & AUDIT TRAIL
# ==============================================================================

@pytest.mark.django_db
def test_modification_requires_motif_correction(api_client, test_data):
    """La modification d'une demande d'examens requiert obligatoirement un motif explicite."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        renseignements_cliniques='Bilan initial'
    )
    LigneDemandeExamen.objects.create(
        demande=demande, nom_examen='Glycémie', categorie='BIOLOGIE', ordre=1
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-detail', kwargs={'pk': demande.id})

    # Mise à jour sans motif
    update_data = {
        'renseignements_cliniques': 'Bilan glycémique actualisé',
        'lignes': [{'nom_examen': 'HbA1c', 'categorie': 'BIOLOGIE', 'ordre': 1}]
    }
    response = api_client.put(url, update_data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "motif_correction" in str(response.data)


@pytest.mark.django_db
def test_modification_creates_audit_trail_and_updates_status(api_client, test_data):
    """Une correction traçable enregistre l'historique et passe la demande en MODIFIEE."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        numero='EXAM-2026-00050',
        renseignements_cliniques='Bilan infectieux'
    )
    LigneDemandeExamen.objects.create(
        demande=demande, nom_examen='ECBU', categorie='BIOLOGIE', instructions='Prélèvement matinal', ordre=1
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-detail', kwargs={'pk': demande.id})

    update_data = {
        'motif_correction': 'Ajout d un antibiogramme et d une échographie rénale.',
        'lignes': [
            {
                'nom_examen': 'ECBU avec antibiogramme si leucocyturie',
                'categorie': 'BIOLOGIE',
                'instructions': 'Prélèvement à jeun',
                'ordre': 1
            },
            {
                'nom_examen': 'Échographie de l appareil urinaire',
                'categorie': 'IMAGERIE',
                'instructions': 'Vessie pleine',
                'ordre': 2
            }
        ]
    }
    response = api_client.put(url, update_data, format='json')
    assert response.status_code == status.HTTP_200_OK

    demande.refresh_from_db()
    assert demande.statut == 'MODIFIEE'
    assert demande.numero == 'EXAM-2026-00050'  # Numéro préservé
    assert demande.lignes.count() == 2

    # Vérification de l'audit trail
    historiques = demande.historique.all()
    assert historiques.count() == 1
    audit = historiques.first()
    assert audit.auteur == test_data['medecin1_user']
    assert audit.motif_correction == 'Ajout d un antibiogramme et d une échographie rénale.'
    assert 'ECBU' in str(audit.anciennes_lignes)
    assert 'Échographie' in str(audit.nouvelles_lignes)


@pytest.mark.django_db
def test_consultation_is_immutable_on_exam_request(api_client, test_data):
    """Il est formellement impossible de réassigner une demande à une autre consultation."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user']
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-detail', kwargs={'pk': demande.id})

    response = api_client.patch(url, {
        'consultation': test_data['consultation2'].id,
        'motif_correction': 'Tentative de réassignation'
    }, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "consultation" in str(response.data)


# ==============================================================================
# 5. ANNULATION MOTIVÉE ET INTERDICTION DE SUPPRESSION PHYSIQUE
# ==============================================================================

@pytest.mark.django_db
def test_annuler_exam_request_with_mandatory_motif(api_client, test_data):
    """Annulation formelle de la demande avec motif obligatoire enregistré dans l'historique."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user']
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-annuler', kwargs={'pk': demande.id})

    # 1. Sans motif -> Rejet 400
    res_no_motif = api_client.post(url, {'motif': ''}, format='json')
    assert res_no_motif.status_code == status.HTTP_400_BAD_REQUEST

    # 2. Avec motif valide
    res_valid = api_client.post(url, {'motif': 'Patient hospitalisé en urgence, examens réalisés sur place.'}, format='json')
    assert res_valid.status_code == status.HTTP_200_OK
    assert res_valid.data['statut'] == 'ANNULEE'

    demande.refresh_from_db()
    assert demande.statut == 'ANNULEE'
    assert demande.historique.count() == 1
    assert "Annulation" in demande.historique.first().motif_correction

    # 3. Ré-annulation interdite
    res_again = api_client.post(url, {'motif': 'Nouvelle annulation'}, format='json')
    assert res_again.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_physical_delete_is_forbidden(api_client, test_data):
    """La suppression physique est formellement interdite par l'API pour préserver l'audit."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user']
    )

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('demandes-examens-detail', kwargs={'pk': demande.id})
    response = api_client.delete(url)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "suppression physique" in str(response.data).lower()
    assert DemandeExamen.objects.filter(id=demande.id).exists()


# ==============================================================================
# 6. LECTURE, CONFIDENTIALITÉ & FILTRES
# ==============================================================================

@pytest.mark.django_db
def test_read_permissions_and_doctor_confidentiality(api_client, test_data):
    """Médecin traitant, secrétariat et administrateur peuvent consulter; confrère non concerné non."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        numero='EXAM-2026-00088'
    )

    url = reverse('demandes-examens-detail', kwargs={'pk': demande.id})

    # 1. Médecin prescripteur -> 200 OK
    api_client.force_authenticate(user=test_data['medecin1_user'])
    res1 = api_client.get(url)
    assert res1.status_code == status.HTTP_200_OK

    # 2. Autre médecin non associé -> 404 Not Found (cloisonnement médical)
    api_client.force_authenticate(user=test_data['medecin2_user'])
    res2 = api_client.get(url)
    assert res2.status_code == status.HTTP_404_NOT_FOUND

    # 3. Secrétaire -> 200 OK (pour remise et impression)
    api_client.force_authenticate(user=test_data['secretaire'])
    res3 = api_client.get(url)
    assert res3.status_code == status.HTTP_200_OK

    # 4. Admin -> 200 OK
    api_client.force_authenticate(user=test_data['admin_user'])
    res4 = api_client.get(url)
    assert res4.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_protect_on_delete_consultation_or_patient(test_data):
    """Une consultation ou un patient ayant des examens prescrits ne peut pas être supprimé silencieusement."""
    demande = DemandeExamen.objects.create(
        consultation=test_data['consultation1'],
        patient=test_data['patient'],
        medecin=test_data['medecin1_user']
    )

    with pytest.raises(models.ProtectedError):
        test_data['consultation1'].delete()

    with pytest.raises(models.ProtectedError):
        test_data['patient'].delete()
