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
    secretaire = Utilisateur.objects.create_user(username='secr', password='password', role='SECRETAIRE')
    
    patient = Patient.objects.create(
        nom='Dupont', prenom='Jean', date_naissance='1990-01-01', contact='0123456789'
    )
    
    rdv = RendezVous.objects.create(
        patient=patient, 
        medecin=medecin, 
        date_heure=make_aware(datetime.now() + timedelta(days=1)),
        statut='CONFIRME'
    )
    
    return {
        'medecin_user': medecin_user,
        'secretaire': secretaire,
        'patient': patient,
        'rdv': rdv,
    }

@pytest.mark.django_db
def test_medecin_can_create_consultation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')
    
    data = {
        'patient': setup_data['patient'].id,
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Douleurs abdominales',
        'observations': 'Patient se plaint depuis 3 jours',
        'diagnostic': 'Gastro-entérite'
    }
    
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert Consultation.objects.count() == 1
    
    # Vérifier que le statut du RDV est passé à TERMINE
    setup_data['rdv'].refresh_from_db()
    assert setup_data['rdv'].statut == 'TERMINE'

@pytest.mark.django_db
def test_secretaire_cannot_create_consultation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('consultation-list')
    
    data = {
        'patient': setup_data['patient'].id,
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Test',
        'observations': 'Test',
        'diagnostic': 'Test'
    }
    
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Consultation.objects.count() == 0

@pytest.mark.django_db
def test_get_consultations_by_patient(api_client, setup_data):
    Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin_user'],
        rendez_vous=setup_data['rdv'],
        motif='Visite de routine',
        observations='Rien à signaler',
        diagnostic='Bonne santé'
    )
    
    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('consultation-list')
    
    response = api_client.get(url, {'patient': setup_data['patient'].id})
    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] == 1


@pytest.mark.django_db
def test_duplicate_consultation_for_same_rdv_refused(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['medecin_user'])
    url = reverse('consultation-list')

    # Première consultation
    data1 = {
        'patient': setup_data['patient'].id,
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
        'patient': setup_data['patient'].id,
        'rendez_vous': setup_data['rdv'].id,
        'motif': 'Deuxième consultation doublon',
        'observations': 'Doublon',
        'diagnostic': 'Doublon'
    }
    res2 = api_client.post(url, data2, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "Ce rendez-vous possède déjà une consultation." in str(res2.data)

