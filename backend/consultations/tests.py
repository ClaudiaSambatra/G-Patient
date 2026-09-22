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
    medecin = Medecin.objects.create(utilisateur=medecin_user, specialite='Généraliste')
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
        'rendezvous': setup_data['rdv'].id,
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
        'rendezvous': setup_data['rdv'].id,
        'motif': 'Test'
    }
    
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Consultation.objects.count() == 0

@pytest.mark.django_db
def test_get_consultations_by_patient(api_client, setup_data):
    Consultation.objects.create(
        rendezvous=setup_data['rdv'],
        motif='Visite de routine'
    )
    
    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('consultation-list')
    
    response = api_client.get(url, {'patient': setup_data['patient'].id})
    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] == 1
