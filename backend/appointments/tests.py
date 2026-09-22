import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import Utilisateur, Medecin
from patients.models import Patient
from appointments.models import RendezVous
from datetime import datetime, timedelta
from django.utils.timezone import make_aware

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data():
    # Utilisateurs
    admin = Utilisateur.objects.create_user(username='admin', password='password', role='ADMIN')
    medecin1_user = Utilisateur.objects.create_user(username='med1', password='password', role='MEDECIN')
    medecin2_user = Utilisateur.objects.create_user(username='med2', password='password', role='MEDECIN')
    secretaire = Utilisateur.objects.create_user(username='secr', password='password', role='SECRETAIRE')
    
    # Médecins
    medecin1 = Medecin.objects.create(utilisateur=medecin1_user, specialite='Généraliste')
    medecin2 = Medecin.objects.create(utilisateur=medecin2_user, specialite='Cardiologue')
    
    # Patient
    patient = Patient.objects.create(
        nom='Dupont', prenom='Jean', date_naissance='1990-01-01', contact='0123456789'
    )
    
    return {
        'admin': admin,
        'medecin1': medecin1_user,
        'medecin2': medecin2_user,
        'medecin1_profile': medecin1,
        'medecin2_profile': medecin2,
        'secretaire': secretaire,
        'patient': patient,
    }

@pytest.mark.django_db
def test_secretaire_can_create_rendezvous(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('rendezvous-list')
    date_rdv = make_aware(datetime.now() + timedelta(days=1))
    
    data = {
        'patient': setup_data['patient'].id,
        'medecin': setup_data['medecin1_profile'].id,
        'date_heure': date_rdv.isoformat(),
        'motif': 'Consultation de suivi'
    }
    
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    assert RendezVous.objects.count() == 1

@pytest.mark.django_db
def test_medecin_sees_only_own_rendezvous(api_client, setup_data):
    date_rdv = make_aware(datetime.now() + timedelta(days=1))
    # Créer 2 RDV pour medecin 1
    RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=date_rdv)
    RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=date_rdv)
    # Créer 1 RDV pour medecin 2
    RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin2_profile'], date_heure=date_rdv)
    
    url = reverse('rendezvous-list')
    
    # Connecté en tant que médecin 1
    api_client.force_authenticate(user=setup_data['medecin1'])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] == 2  # Il ne voit que ses 2 RDV
    
    # Connecté en tant que secrétaire
    api_client.force_authenticate(user=setup_data['secretaire'])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['count'] == 3  # Elle voit tout

@pytest.mark.django_db
def test_patch_rendezvous_status(api_client, setup_data):
    date_rdv = make_aware(datetime.now() + timedelta(days=1))
    rdv = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=date_rdv)
    
    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('rendezvous-detail', args=[rdv.id])
    
    data = {'statut': 'CONFIRME'}
    response = api_client.patch(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    
    rdv.refresh_from_db()
    assert rdv.statut == 'CONFIRME'
