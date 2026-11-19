from datetime import datetime, time, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur
from appointments.models import RendezVous
from patients.models import Patient
from .models import AbsenceMedecin, HoraireMedecin


def prochain(jour_semaine, heure, minute=0, semaines=1):
    """Datetime locale du prochain <jour_semaine> (0 = lundi) dans <semaines> semaine(s), à heure:minute."""
    aujourd_hui = timezone.localdate()
    decalage = (jour_semaine - aujourd_hui.weekday()) % 7 + 7 * semaines
    jour = aujourd_hui + timedelta(days=decalage)
    return timezone.make_aware(datetime.combine(jour, time(heure, minute)))


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def data():
    def medecin(username, nom, specialite):
        user = Utilisateur.objects.create_user(
            username=username, password='x', role='MEDECIN', last_name=nom, first_name='A'
        )
        profil = user.medecin_profile
        profil.specialite = specialite
        profil.save()
        return user, profil

    rado_user, rado = medecin('dr_rado', 'Rado', 'Généraliste')
    _, bema = medecin('dr_bema', 'Bema', 'Généraliste')
    _, kanto = medecin('dr_kanto', 'Kanto', 'Pédiatre')
    _, zo = medecin('dr_zo', 'Zo', 'Pédiatre')
    secretaire = Utilisateur.objects.create_user(username='secr', password='x', role='SECRETAIRE')
    patient = Patient.objects.create(nom='Rabe', prenom='Soa', date_naissance='1995-04-12')
    patient2 = Patient.objects.create(nom='Rasoa', prenom='Lova', date_naissance='1990-01-01')
    return {
        'rado_user': rado_user, 'rado': rado, 'bema': bema, 'kanto': kanto, 'zo': zo,
        'secretaire': secretaire, 'patient': patient, 'patient2': patient2,
    }


def creer_rdv_api(api_client, data, medecin, dt):
    api_client.force_authenticate(user=data['secretaire'])
    return api_client.post(reverse('rendezvous-list'), {
        'patient': data['patient'].id, 'medecin': medecin.id,
        'date_heure': dt.isoformat(), 'type': 'CONSULTATION', 'motif': 'Contrôle tension',
    }, format='json')


# ==============================================================================
# ABSENCES PLANIFIÉES
# ==============================================================================

@pytest.mark.django_db
def test_absence_planifiee_bloque_un_rdv_ce_jour_la(api_client, data):
    rdv_dt = prochain(1, 10)
    AbsenceMedecin.objects.create(medecin=data['rado'], date_debut=rdv_dt.date() - timedelta(days=1),
                                  date_fin=rdv_dt.date() + timedelta(days=2), type='CONGE')
    res = creer_rdv_api(api_client, data, data['rado'], rdv_dt)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'absent ce jour-là (congé)' in str(res.data['date_heure'])


@pytest.mark.django_db
def test_absence_ne_bloque_pas_les_autres_jours(api_client, data):
    rdv_dt = prochain(1, 10)
    AbsenceMedecin.objects.create(medecin=data['rado'], date_debut=rdv_dt.date() + timedelta(days=1),
                                  date_fin=rdv_dt.date() + timedelta(days=5))
    assert creer_rdv_api(api_client, data, data['rado'], rdv_dt).status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_absence_planifiee_aujourd_hui_rend_le_medecin_absent(data):
    aujourd_hui = timezone.localdate()
    assert data['rado'].absent_aujourdhui is False
    AbsenceMedecin.objects.create(medecin=data['rado'], date_debut=aujourd_hui, date_fin=aujourd_hui)
    assert data['rado'].absent_aujourdhui is True


@pytest.mark.django_db
def test_absence_dates_incoherentes_refusees(api_client, data):
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('absence-medecin-list'), {
        'medecin': data['rado'].id, 'date_debut': '2026-12-20', 'date_fin': '2026-12-10',
    }, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'date_fin' in res.data


@pytest.mark.django_db
def test_absence_indique_le_nombre_de_rdv_concernes(api_client, data):
    rdv_dt = prochain(2, 9)
    RendezVous.objects.create(patient=data['patient'], medecin=data['rado'], date_heure=rdv_dt)
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('absence-medecin-list'), {
        'medecin': data['rado'].id, 'date_debut': rdv_dt.date().isoformat(),
        'date_fin': rdv_dt.date().isoformat(), 'type': 'FORMATION',
    }, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data['nb_rdv_concernes'] == 1


# ==============================================================================
# HORAIRES DE CONSULTATION
# ==============================================================================

@pytest.mark.django_db
def test_rdv_hors_horaires_refuse_et_dans_les_horaires_accepte(api_client, data):
    HoraireMedecin.objects.create(medecin=data['rado'], jour=0, heure_debut=time(8), heure_fin=time(12))
    res = creer_rdv_api(api_client, data, data['rado'], prochain(0, 15))  # lundi 15h
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'horaires de consultation' in str(res.data['date_heure'])
    res = creer_rdv_api(api_client, data, data['rado'], prochain(1, 9))  # mardi : pas de plage
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert creer_rdv_api(api_client, data, data['rado'], prochain(0, 9, 30)).status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_medecin_sans_horaires_reste_sans_restriction(api_client, data):
    assert creer_rdv_api(api_client, data, data['bema'], prochain(6, 21)).status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_plages_qui_se_chevauchent_refusees(api_client, data):
    api_client.force_authenticate(user=data['secretaire'])
    url = reverse('horaire-medecin-list')
    base = {'medecin': data['rado'].id, 'jour': 0}
    assert api_client.post(url, {**base, 'heure_debut': '08:00', 'heure_fin': '12:00'}).status_code == 201
    res = api_client.post(url, {**base, 'heure_debut': '11:00', 'heure_fin': '14:00'})
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert api_client.post(url, {**base, 'heure_debut': '14:00', 'heure_fin': '18:00'}).status_code == 201
    res = api_client.post(url, {**base, 'jour': 1, 'heure_debut': '18:00', 'heure_fin': '08:00'})
    assert res.status_code == status.HTTP_400_BAD_REQUEST


# ==============================================================================
# DROITS
# ==============================================================================

@pytest.mark.django_db
def test_medecin_gere_son_planning_mais_pas_celui_des_autres(api_client, data):
    api_client.force_authenticate(user=data['rado_user'])
    url = reverse('absence-medecin-list')
    ok = api_client.post(url, {'medecin': data['rado'].id, 'date_debut': '2026-12-24', 'date_fin': '2026-12-26'})
    assert ok.status_code == status.HTTP_201_CREATED
    ko = api_client.post(url, {'medecin': data['bema'].id, 'date_debut': '2026-12-24', 'date_fin': '2026-12-26'})
    assert ko.status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get(reverse('rdv-a-reaffecter-list')).status_code == status.HTTP_403_FORBIDDEN


# ==============================================================================
# RÉAFFECTATION (REMPLACEMENT)
# ==============================================================================

@pytest.fixture
def rdv_pendant_absence(data):
    rdv_dt = prochain(3, 10)
    rdv = RendezVous.objects.create(patient=data['patient'], medecin=data['kanto'], date_heure=rdv_dt,
                                    motif='Vaccin')
    AbsenceMedecin.objects.create(medecin=data['kanto'], date_debut=rdv_dt.date(), date_fin=rdv_dt.date())
    return rdv


@pytest.mark.django_db
def test_rdv_a_reaffecter_liste_les_rdv_pendant_une_absence(api_client, data, rdv_pendant_absence):
    RendezVous.objects.create(patient=data['patient2'], medecin=data['bema'], date_heure=prochain(3, 11))
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.get(reverse('rdv-a-reaffecter-list'))
    assert res.status_code == status.HTTP_200_OK
    assert [r['id'] for r in res.data] == [rdv_pendant_absence.id]
    assert 'absent ce jour-là' in res.data[0]['raison']


@pytest.mark.django_db
def test_remplacants_disponibles_meme_specialite_d_abord(api_client, data, rdv_pendant_absence):
    # Bema a déjà un RDV à la même heure : il n'est pas proposé
    RendezVous.objects.create(patient=data['patient2'], medecin=data['bema'], date_heure=rdv_pendant_absence.date_heure)
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.get(reverse('rdv-a-reaffecter-remplacants', args=[rdv_pendant_absence.id]))
    noms = [m['nom'] for m in res.data]
    assert noms[0].startswith('Dr. Zo')  # pédiatre comme Kanto
    assert res.data[0]['meme_specialite'] is True
    assert not any(n.startswith('Dr. Bema') or n.startswith('Dr. Kanto') for n in noms)


@pytest.mark.django_db
def test_reaffecter_un_rdv_a_un_remplacant(api_client, data, rdv_pendant_absence):
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('rdv-a-reaffecter-reaffecter', args=[rdv_pendant_absence.id]),
                          {'medecin': data['zo'].id}, format='json')
    assert res.status_code == status.HTTP_200_OK, res.data
    rdv_pendant_absence.refresh_from_db()
    assert rdv_pendant_absence.medecin == data['zo']
    assert 'Remplace Dr. Kanto' in rdv_pendant_absence.motif
    assert api_client.get(reverse('rdv-a-reaffecter-list')).data == []


@pytest.mark.django_db
def test_reaffecter_a_un_medecin_indisponible_refuse(api_client, data, rdv_pendant_absence):
    AbsenceMedecin.objects.create(medecin=data['zo'], date_debut=rdv_pendant_absence.date_heure.date(),
                                  date_fin=rdv_pendant_absence.date_heure.date())
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('rdv-a-reaffecter-reaffecter', args=[rdv_pendant_absence.id]),
                          {'medecin': data['zo'].id}, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'absent' in str(res.data['medecin'])
    rdv_pendant_absence.refresh_from_db()
    assert rdv_pendant_absence.medecin == data['kanto']
