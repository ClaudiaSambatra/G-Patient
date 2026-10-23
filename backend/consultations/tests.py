from unittest.mock import patch
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import Utilisateur, Medecin
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from datetime import datetime, timedelta
from django.utils.timezone import make_aware


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup_data():
    medecin_user = Utilisateur.objects.create_user(username='med1', password='password', role='MEDECIN')
    medecin, _ = Medecin.objects.get_or_create(utilisateur=medecin_user, defaults={'specialite': 'Généraliste'})
    medecin.specialite = 'Généraliste'
    medecin.save()

    medecin2_user = Utilisateur.objects.create_user(username='med2', password='password', role='MEDECIN')
    medecin2, _ = Medecin.objects.get_or_create(utilisateur=medecin2_user, defaults={'specialite': 'Cardiologue'})
    medecin2.specialite = 'Cardiologue'
    medecin2.save()

    secretaire = Utilisateur.objects.create_user(username='secr', password='password', role='SECRETAIRE')
    admin_user = Utilisateur.objects.create_user(username='adm', password='password', role='ADMIN')

    patient = Patient.objects.create(
        nom='Dupont', prenom='Jean', date_naissance='1990-01-01', contact='0123456789'
    )
    patient2 = Patient.objects.create(
        nom='Durand', prenom='Sophie', date_naissance='1985-05-12', contact='0987654321'
    )

    rdv = RendezVous.objects.create(
        patient=patient,
        medecin=medecin,
        date_heure=make_aware(datetime.now() + timedelta(days=1)),
        statut='CONFIRME'
    )

    return {
        'medecin_user': medecin_user,
        'medecin': medecin,
        'medecin2_user': medecin2_user,
        'medecin2': medecin2,
        'secretaire': secretaire,
        'admin_user': admin_user,
        'patient': patient,
        'patient2': patient2,
        'rdv': rdv,
    }


@pytest.mark.django_db
def test_medecin_can_create_consultation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')

    data = {
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Douleurs abdominales',
        'observations': 'Patient se plaint depuis 3 jours',
        'diagnostic': 'Gastro-entérite',
        'compte_rendu': 'Examen complet réalisé.'
    }

    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert Consultation.objects.count() == 1
    assert response.data['patient'] == setup_data['patient'].id

    # Vérifier que le statut du RDV est passé à TERMINE
    setup_data['rdv'].refresh_from_db()
    assert setup_data['rdv'].statut == 'TERMINE'


@pytest.mark.django_db
def test_creation_refused_for_other_medecin_rdv(api_client, setup_data):
    # Medecin 2 tente de consulter le RDV de Medecin 1 -> refusé
    api_client.force_authenticate(user=setup_data['medecin2_user'])
    url = reverse('consultation-list')

    data = {
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Tentative consultation confrère',
        'observations': 'Obs',
        'diagnostic': 'Diag'
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Ce rendez-vous ne vous est pas attribué." in str(response.data)
    assert Consultation.objects.count() == 0


@pytest.mark.django_db
def test_creation_refused_if_rdv_not_confirme(api_client, setup_data):
    # RDV seulement PLANIFIE
    setup_data['rdv'].statut = 'PLANIFIE'
    setup_data['rdv'].save()

    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')

    data = {
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Consultation RDV non confirmé',
        'observations': 'Obs',
        'diagnostic': 'Diag'
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "CONFIRME" in str(response.data)
    assert Consultation.objects.count() == 0


@pytest.mark.django_db
def test_patient_forced_from_rdv(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')

    # Le client envoie l'ID de patient2, mais le RDV est lié à patient
    data = {
        'patient': setup_data['patient2'].id,
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Test déduction patient',
        'observations': 'Obs',
        'diagnostic': 'Diag'
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    # Le patient enregistré en base doit être celui du rendez-vous
    consultation = Consultation.objects.first()
    assert consultation.patient == setup_data['patient']
    assert response.data['patient'] == setup_data['patient'].id


@pytest.mark.django_db
def test_atomic_transaction_on_failure(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')

    data = {
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Test transaction',
        'observations': 'Obs',
        'diagnostic': 'Diag'
    }

    # Simuler une panne lors de la sauvegarde du rendez-vous
    original_save = RendezVous.save

    def failing_save(self, *args, **kwargs):
        if 'update_fields' in kwargs and 'statut' in kwargs.get('update_fields', []):
            raise RuntimeError("Erreur base de données simulée lors de la mise à jour du rendez-vous")
        return original_save(self, *args, **kwargs)

    with patch.object(RendezVous, 'save', failing_save):
        with pytest.raises(RuntimeError):
            api_client.post(url, data, format='json')

    # Vérification atomique : aucune consultation créée et RDV toujours CONFIRME
    assert Consultation.objects.count() == 0
    setup_data['rdv'].refresh_from_db()
    assert setup_data['rdv'].statut == 'CONFIRME'


@pytest.mark.django_db
def test_author_medecin_can_update_consultation(api_client, setup_data):
    consultation = Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        rendez_vous=setup_data['rdv'],
        motif='Motif initial',
        observations='Obs initiales',
        diagnostic='Diagnostic initial',
        compte_rendu='Compte-rendu initial'
    )

    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-detail', args=[consultation.id])

    update_data = {
        'motif': 'Motif mis à jour',
        'observations': 'Constantes mises à jour : TA 12/8',
        'diagnostic': 'Diagnostic affiné',
        'compte_rendu': 'Compte-rendu finalisé'
    }
    response = api_client.patch(url, update_data, format='json')
    assert response.status_code == status.HTTP_200_OK
    consultation.refresh_from_db()
    assert consultation.motif == 'Motif mis à jour'
    assert consultation.diagnostic == 'Diagnostic affiné'
    assert consultation.compte_rendu == 'Compte-rendu finalisé'


@pytest.mark.django_db
def test_other_medecin_cannot_update_consultation(api_client, setup_data):
    consultation = Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        rendez_vous=setup_data['rdv'],
        motif='Motif auteur',
        observations='Obs',
        diagnostic='Diag'
    )

    # Medecin 2 tente de modifier la consultation de Medecin 1 -> 403 Forbidden
    api_client.force_authenticate(user=setup_data['medecin2_user'])
    url = reverse('consultation-detail', args=[consultation.id])

    response = api_client.patch(url, {'motif': 'Modification pirate'}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN
    consultation.refresh_from_db()
    assert consultation.motif == 'Motif auteur'


@pytest.mark.django_db
def test_locked_fields_cannot_be_modified(api_client, setup_data):
    consultation = Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        rendez_vous=setup_data['rdv'],
        motif='Motif',
        observations='Obs',
        diagnostic='Diag'
    )

    other_rdv = RendezVous.objects.create(
        patient=setup_data['patient2'],
        medecin=setup_data['medecin'],
        date_heure=make_aware(datetime.now() + timedelta(days=2)),
        statut='CONFIRME'
    )

    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-detail', args=[consultation.id])

    # Tentative de modifier le patient -> refusée avec message clair
    res1 = api_client.patch(url, {'patient': setup_data['patient2'].id}, format='json')
    assert res1.status_code == status.HTTP_400_BAD_REQUEST
    assert "patient d'une consultation ne peut pas être modifié" in str(res1.data)

    # Tentative de modifier le rendez-vous -> refusée avec message clair
    res2 = api_client.patch(url, {'rendez_vous': other_rdv.id}, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "rendez-vous d'une consultation ne peut pas être modifié" in str(res2.data)

    consultation.refresh_from_db()
    assert consultation.patient == setup_data['patient']
    assert consultation.rendez_vous == setup_data['rdv']


@pytest.mark.django_db
def test_secretaire_read_only_and_admin_full_access(api_client, setup_data):
    consultation = Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        rendez_vous=setup_data['rdv'],
        motif='Motif original',
        observations='Obs',
        diagnostic='Diag'
    )
    detail_url = reverse('consultation-detail', args=[consultation.id])

    # Secrétaire : lecture OK, écriture interdite (403)
    api_client.force_authenticate(user=setup_data['secretaire'])
    res_sec_get = api_client.get(detail_url)
    assert res_sec_get.status_code == status.HTTP_200_OK

    res_sec_patch = api_client.patch(detail_url, {'motif': 'Hack secretaire'}, format='json')
    assert res_sec_patch.status_code == status.HTTP_403_FORBIDDEN

    res_sec_del = api_client.delete(detail_url)
    assert res_sec_del.status_code == status.HTTP_403_FORBIDDEN

    # Admin : accès complet (lecture, modification et suppression autorisées)
    api_client.force_authenticate(user=setup_data['admin_user'])
    res_adm_get = api_client.get(detail_url)
    assert res_adm_get.status_code == status.HTTP_200_OK

    res_adm_patch = api_client.patch(detail_url, {'motif': 'Mise à jour par Admin'}, format='json')
    assert res_adm_patch.status_code == status.HTTP_200_OK
    assert res_adm_patch.data['motif'] == 'Mise à jour par Admin'

    res_adm_del = api_client.delete(detail_url)
    assert res_adm_del.status_code == status.HTTP_204_NO_CONTENT
    assert not Consultation.objects.filter(id=consultation.id).exists()


@pytest.mark.django_db
def test_consultation_filters_and_pagination(api_client, setup_data):
    now = datetime.now()
    # Créer 3 consultations avec des dates différentes
    c1 = Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        date_consultation=make_aware(now - timedelta(days=10)),
        motif='Consultation J-10',
        observations='Obs',
        diagnostic='Diag'
    )
    c2 = Consultation.objects.create(
        patient=setup_data['patient2'],
        medecin=setup_data['medecin_user'],
        date_consultation=make_aware(now - timedelta(days=2)),
        motif='Consultation J-2',
        observations='Obs',
        diagnostic='Diag'
    )
    c3 = Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        date_consultation=make_aware(now),
        motif='Consultation J',
        observations='Obs',
        diagnostic='Diag'
    )

    api_client.force_authenticate(user=setup_data['medecin_user'])
    list_url = reverse('consultation-list')

    # Filtre par patient
    res_patient = api_client.get(list_url, {'patient': setup_data['patient'].id})
    assert res_patient.status_code == status.HTTP_200_OK
    assert res_patient.data['count'] == 2

    # Filtre par intervalle de date (date_debut / date_fin)
    d_start = (now - timedelta(days=3)).strftime('%Y-%m-%d')
    d_end = (now + timedelta(days=1)).strftime('%Y-%m-%d')
    res_date = api_client.get(list_url, {'date_debut': d_start, 'date_fin': d_end})
    assert res_date.status_code == status.HTTP_200_OK
    assert res_date.data['count'] == 2
    motifs = [item['motif'] for item in res_date.data['results']]
    assert 'Consultation J-2' in motifs
    assert 'Consultation J' in motifs
    assert 'Consultation J-10' not in motifs

    # Pagination : tester page_size=2
    res_page = api_client.get(list_url, {'page_size': 2, 'page': 1})
    assert res_page.status_code == status.HTTP_200_OK
    assert len(res_page.data['results']) == 2
    assert res_page.data['count'] == 3
    assert res_page.data['next'] is not None


@pytest.mark.django_db
def test_duplicate_consultation_for_same_rdv_refused(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')

    # Première consultation
    data1 = {
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Première consultation',
        'observations': 'Rien à signaler',
        'diagnostic': 'Bonne santé',
        'compte_rendu': 'Compte-rendu complet du praticien.'
    }
    res1 = api_client.post(url, data1, format='json')
    assert res1.status_code == status.HTTP_201_CREATED
    assert res1.data['compte_rendu'] == 'Compte-rendu complet du praticien.'

    # Seconde consultation pour le même RDV -> refusée
    data2 = {
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Deuxième consultation doublon',
        'observations': 'Doublon',
        'diagnostic': 'Doublon'
    }
    res2 = api_client.post(url, data2, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "Ce rendez-vous possède déjà une consultation." in str(res2.data)
