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
    medecin1, _ = Medecin.objects.get_or_create(utilisateur=medecin1_user, defaults={'specialite': 'Généraliste'})
    medecin1.specialite = 'Généraliste'
    medecin1.save()
    medecin2, _ = Medecin.objects.get_or_create(utilisateur=medecin2_user, defaults={'specialite': 'Cardiologue'})
    medecin2.specialite = 'Cardiologue'
    medecin2.save()

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


# ============================================================================
# Tests : Statut de présence du médecin (du jour)
# ============================================================================

@pytest.mark.django_db
def test_medecin_modifies_own_presence(api_client, setup_data):
    med1_user = setup_data['medecin1']
    med1_profile = setup_data['medecin1_profile']
    url = reverse('medecin-presence', args=[med1_profile.id])

    # Le médecin déclare son absence
    api_client.force_authenticate(user=med1_user)
    response = api_client.post(url, {'absent': True}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['absent_aujourdhui'] is True
    med1_profile.refresh_from_db()
    assert med1_profile.absent_aujourdhui is True

    # Le médecin redevient présent
    response = api_client.post(url, {'absent': False}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['absent_aujourdhui'] is False
    med1_profile.refresh_from_db()
    assert med1_profile.absent_aujourdhui is False


@pytest.mark.django_db
def test_medecin_cannot_modify_other_medecin_presence(api_client, setup_data):
    med1_user = setup_data['medecin1']
    med2_profile = setup_data['medecin2_profile']
    url = reverse('medecin-presence', args=[med2_profile.id])

    api_client.force_authenticate(user=med1_user)
    response = api_client.post(url, {'absent': True}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_secretaire_and_admin_can_modify_any_medecin_presence(api_client, setup_data):
    med1_profile = setup_data['medecin1_profile']
    url = reverse('medecin-presence', args=[med1_profile.id])

    # Secrétaire
    api_client.force_authenticate(user=setup_data['secretaire'])
    res_sec = api_client.post(url, {'absent': True}, format='json')
    assert res_sec.status_code == status.HTTP_200_OK
    assert res_sec.data['absent_aujourdhui'] is True

    # Admin
    api_client.force_authenticate(user=setup_data['admin'])
    res_adm = api_client.post(url, {'absent': False}, format='json')
    assert res_adm.status_code == status.HTTP_200_OK
    assert res_adm.data['absent_aujourdhui'] is False


@pytest.mark.django_db
def test_rendezvous_today_refused_for_absent_medecin(api_client, setup_data):
    from django.utils import timezone
    med1_profile = setup_data['medecin1_profile']
    med1_profile.date_absence = timezone.localdate()
    med1_profile.save()

    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('rendezvous-list')

    # RDV fixé à aujourd'hui
    today_dt = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
    data = {
        'patient': setup_data['patient'].id,
        'medecin': med1_profile.id,
        'date_heure': today_dt.isoformat(),
        'motif': 'Urgence'
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Ce médecin est absent aujourd'hui." in str(response.data)


@pytest.mark.django_db
def test_rendezvous_other_day_accepted_for_absent_medecin(api_client, setup_data):
    from django.utils import timezone
    med1_profile = setup_data['medecin1_profile']
    med1_profile.date_absence = timezone.localdate()
    med1_profile.save()

    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('rendezvous-list')

    # RDV fixé à demain
    tomorrow_dt = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0) + timedelta(days=1)
    data = {
        'patient': setup_data['patient'].id,
        'medecin': med1_profile.id,
        'date_heure': tomorrow_dt.isoformat(),
        'motif': 'Suivi demain'
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_medecin_absence_resets_next_day(setup_data):
    from django.utils import timezone
    med1_profile = setup_data['medecin1_profile']
    # Simulation d'une absence posée hier
    med1_profile.date_absence = timezone.localdate() - timedelta(days=1)
    med1_profile.save()

    assert med1_profile.absent_aujourdhui is False


# ============================================================================
# Tests : Transitions de statut contrôlées
# ============================================================================

@pytest.mark.django_db
def test_allowed_status_transitions(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    future_date = make_aware(datetime.now() + timedelta(days=2))

    # PLANIFIE -> CONFIRME
    rdv1 = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date, statut=RendezVous.Statut.PLANIFIE)
    url1 = reverse('rendezvous-detail', args=[rdv1.id])
    res1 = api_client.patch(url1, {'statut': 'CONFIRME'}, format='json')
    assert res1.status_code == status.HTTP_200_OK

    # PLANIFIE -> ANNULE
    rdv2 = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date + timedelta(hours=1), statut=RendezVous.Statut.PLANIFIE)
    url2 = reverse('rendezvous-detail', args=[rdv2.id])
    res2 = api_client.patch(url2, {'statut': 'ANNULE'}, format='json')
    assert res2.status_code == status.HTTP_200_OK

    # CONFIRME -> ANNULE
    rdv3 = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date + timedelta(hours=2), statut=RendezVous.Statut.CONFIRME)
    url3 = reverse('rendezvous-detail', args=[rdv3.id])
    res3 = api_client.patch(url3, {'statut': 'ANNULE'}, format='json')
    assert res3.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_forbidden_status_transitions(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    future_date = make_aware(datetime.now() + timedelta(days=2))

    # Manuel vers TERMINE impossible
    rdv_planifie = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date, statut=RendezVous.Statut.PLANIFIE)
    url_p = reverse('rendezvous-detail', args=[rdv_planifie.id])
    res_termine = api_client.patch(url_p, {'statut': 'TERMINE'}, format='json')
    assert res_termine.status_code == status.HTTP_400_BAD_REQUEST
    assert "statut Terminé" in str(res_termine.data)

    # CONFIRME -> PLANIFIE interdit
    rdv_confirme = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date + timedelta(hours=1), statut=RendezVous.Statut.CONFIRME)
    url_c = reverse('rendezvous-detail', args=[rdv_confirme.id])
    res_back = api_client.patch(url_c, {'statut': 'PLANIFIE'}, format='json')
    assert res_back.status_code == status.HTTP_400_BAD_REQUEST

    # ANNULE est définitif
    rdv_annule = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date + timedelta(hours=2), statut=RendezVous.Statut.ANNULE)
    url_a = reverse('rendezvous-detail', args=[rdv_annule.id])
    res_annule = api_client.patch(url_a, {'statut': 'CONFIRME'}, format='json')
    assert res_annule.status_code == status.HTTP_400_BAD_REQUEST
    assert "définitif" in str(res_annule.data)

    # TERMINE est définitif
    rdv_termine = RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=future_date + timedelta(hours=3), statut=RendezVous.Statut.TERMINE)
    url_t = reverse('rendezvous-detail', args=[rdv_termine.id])
    res_term = api_client.patch(url_t, {'statut': 'ANNULE'}, format='json')
    assert res_term.status_code == status.HTTP_400_BAD_REQUEST
    assert "définitif" in str(res_term.data)


# ============================================================================
# Tests : Conflits de date et heure (médecin, patient, auto-conflit)
# ============================================================================

@pytest.mark.django_db
def test_update_rendezvous_no_false_conflict_with_itself(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    rdv_date = make_aware(datetime.now() + timedelta(days=5))

    rdv = RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=rdv_date,
        motif="Contrôle initial"
    )
    url = reverse('rendezvous-detail', args=[rdv.id])

    # Modifier le motif sans modifier la date : ne doit pas lever de conflit
    res = api_client.patch(url, {'motif': "Contrôle modifié"}, format='json')
    assert res.status_code == status.HTTP_200_OK
    rdv.refresh_from_db()
    assert rdv.motif == "Contrôle modifié"


@pytest.mark.django_db
def test_medecin_same_datetime_conflict(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    rdv_date = make_aware(datetime.now() + timedelta(days=5, hours=1))

    # Premier rendez-vous pour médecin 1
    RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=rdv_date
    )

    # Autre patient tente de prendre RDV avec le même médecin à la même date et heure -> refusé
    patient2 = Patient.objects.create(nom='Martin', prenom='Alice', date_naissance='1995-02-02', contact='987654')
    url = reverse('rendezvous-list')
    data = {
        'patient': patient2.id,
        'medecin': setup_data['medecin1_profile'].id,
        'date_heure': rdv_date.isoformat(),
        'motif': 'Deuxième RDV même heure médecin'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Le médecin a déjà un rendez-vous à cette date et cette heure." in str(res.data)


@pytest.mark.django_db
def test_patient_same_datetime_conflict(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    rdv_date = make_aware(datetime.now() + timedelta(days=5, hours=2))

    # Patient a un RDV avec medecin 1
    RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=rdv_date
    )

    # Même patient essaie d'avoir un RDV exactement à la même date et heure avec medecin 2 -> refusé
    url = reverse('rendezvous-list')
    data = {
        'patient': setup_data['patient'].id,
        'medecin': setup_data['medecin2_profile'].id,
        'date_heure': rdv_date.isoformat(),
        'motif': 'Autre consultation même heure'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Le patient a déjà un rendez-vous à cette date et cette heure." in str(res.data)


@pytest.mark.django_db
def test_cancelled_or_finished_rdv_frees_slot(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    rdv_date = make_aware(datetime.now() + timedelta(days=6))

    # RDV annulé
    RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=rdv_date,
        statut=RendezVous.Statut.ANNULE
    )

    # Un nouveau RDV à la même heure exacte doit être accepté
    patient2 = Patient.objects.create(nom='Martin', prenom='Alice', date_naissance='1995-02-02', contact='987654')
    url = reverse('rendezvous-list')
    data = {
        'patient': patient2.id,
        'medecin': setup_data['medecin1_profile'].id,
        'date_heure': rdv_date.isoformat(),
        'motif': 'RDV sur créneau annulé'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_201_CREATED


# ============================================================================
# Tests : Date passée
# ============================================================================

@pytest.mark.django_db
def test_past_date_refused(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    url = reverse('rendezvous-list')
    past_date = make_aware(datetime.now() - timedelta(days=1))

    data = {
        'patient': setup_data['patient'].id,
        'medecin': setup_data['medecin1_profile'].id,
        'date_heure': past_date.isoformat(),
        'motif': 'Passé'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "passé" in str(res.data)


# ============================================================================
# Tests : Annulation libère le créneau
# ============================================================================

@pytest.mark.django_db
def test_cancellation_frees_slot(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    rdv_date = make_aware(datetime.now() + timedelta(days=6, hours=4))

    rdv = RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=rdv_date,
        statut=RendezVous.Statut.PLANIFIE
    )

    # Annulation via action dédiée
    url_annuler = reverse('rendezvous-annuler', args=[rdv.id])
    res_annuler = api_client.post(url_annuler)
    assert res_annuler.status_code == status.HTTP_200_OK
    rdv.refresh_from_db()
    assert rdv.statut == RendezVous.Statut.ANNULE

    # Nouveau rendez-vous créé exactement sur le même créneau pour le même médecin -> accepté !
    patient2 = Patient.objects.create(nom='Martin', prenom='Alice', date_naissance='1995-02-02', contact='987654')
    url_list = reverse('rendezvous-list')
    data = {
        'patient': patient2.id,
        'medecin': setup_data['medecin1_profile'].id,
        'date_heure': rdv_date.isoformat(),
        'motif': 'Nouveau créneau libéré'
    }
    res_new = api_client.post(url_list, data, format='json')
    assert res_new.status_code == status.HTTP_201_CREATED


# ============================================================================
# Tests : Suppression réservée à l'ADMIN et bloquée si TERMINE ou Consultation
# ============================================================================

@pytest.mark.django_db
def test_destroy_rendezvous_admin_only_and_checks(api_client, setup_data):
    from consultations.models import Consultation
    future_date = make_aware(datetime.now() + timedelta(days=7))

    rdv_planifie = RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=future_date,
        statut=RendezVous.Statut.PLANIFIE
    )

    url = reverse('rendezvous-detail', args=[rdv_planifie.id])

    # Secrétaire tente de supprimer -> 403 Forbidden
    api_client.force_authenticate(user=setup_data['secretaire'])
    res_sec = api_client.delete(url)
    assert res_sec.status_code == status.HTTP_403_FORBIDDEN

    # Admin supprime un rdv PLANIFIE -> 204 No Content
    api_client.force_authenticate(user=setup_data['admin'])
    res_adm = api_client.delete(url)
    assert res_adm.status_code == status.HTTP_204_NO_CONTENT

    # Tentative de suppression sur RDV TERMINE
    rdv_termine = RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=future_date + timedelta(hours=1),
        statut=RendezVous.Statut.TERMINE
    )
    url_term = reverse('rendezvous-detail', args=[rdv_termine.id])
    res_del_term = api_client.delete(url_term)
    assert res_del_term.status_code == status.HTTP_400_BAD_REQUEST
    assert "terminé ou lié à une consultation" in str(res_del_term.data)

    # Tentative de suppression sur RDV lié à une consultation
    rdv_avec_consult = RendezVous.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1_profile'],
        date_heure=future_date + timedelta(hours=2),
        statut=RendezVous.Statut.PLANIFIE
    )
    Consultation.objects.create(
        patient=setup_data['patient'],
        medecin=setup_data['medecin1'],
        rendez_vous=rdv_avec_consult,
        motif='Consultation test'
    )
    url_consult = reverse('rendezvous-detail', args=[rdv_avec_consult.id])
    res_del_consult = api_client.delete(url_consult)
    assert res_del_consult.status_code == status.HTTP_400_BAD_REQUEST
    assert "terminé ou lié à une consultation" in str(res_del_consult.data)


# ============================================================================
# Tests : Filtres et pagination
# ============================================================================

@pytest.mark.django_db
def test_filters_and_pagination(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['secretaire'])
    base_date = make_aware(datetime.now() + timedelta(days=10))

    # Créer plusieurs rendez-vous à différentes dates / statuts / médecins
    RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=base_date, statut=RendezVous.Statut.PLANIFIE)
    RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin1_profile'], date_heure=base_date + timedelta(days=1), statut=RendezVous.Statut.CONFIRME)
    RendezVous.objects.create(patient=setup_data['patient'], medecin=setup_data['medecin2_profile'], date_heure=base_date + timedelta(days=2), statut=RendezVous.Statut.ANNULE)

    url = reverse('rendezvous-list')

    # Filtre par statut
    res_statut = api_client.get(url, {'statut': 'PLANIFIE'})
    assert res_statut.status_code == status.HTTP_200_OK
    assert all(r['statut'] == 'PLANIFIE' for r in res_statut.data['results'])

    # Filtre par médecin
    res_med = api_client.get(url, {'medecin': setup_data['medecin2_profile'].id})
    assert res_med.status_code == status.HTTP_200_OK
    assert all(r['medecin'] == setup_data['medecin2_profile'].id for r in res_med.data['results'])

    # Filtre par intervalle de dates
    res_range = api_client.get(url, {
        'date_debut': base_date.date().isoformat(),
        'date_fin': (base_date + timedelta(days=1)).date().isoformat()
    })
    assert res_range.status_code == status.HTTP_200_OK
    assert res_range.data['count'] == 2
