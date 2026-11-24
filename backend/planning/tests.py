from datetime import datetime, time, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur
from appointments.models import RendezVous
from patients.models import Patient
from .models import AbsenceMedecin, GardeMedecin, HoraireMedecin


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
def test_medecin_consulte_son_planning_sans_le_modifier(api_client, data):
    HoraireMedecin.objects.create(medecin=data['rado'], jour=0, heure_debut=time(8), heure_fin=time(12))
    api_client.force_authenticate(user=data['rado_user'])
    res = api_client.get(reverse('horaire-medecin-list'), {'medecin': data['rado'].id})
    assert res.status_code == status.HTTP_200_OK and len(res.data) == 1
    for nom, donnees in (
        ('absence-medecin-list', {'medecin': data['rado'].id, 'date_debut': '2026-12-24', 'date_fin': '2026-12-26'}),
        ('horaire-medecin-list', {'medecin': data['rado'].id, 'jour': 1, 'heure_debut': '08:00', 'heure_fin': '12:00'}),
        ('garde-medecin-list', {'medecin': data['rado'].id, 'date': '2026-12-24',
                                'heure_debut': '18:00', 'heure_fin': '08:00'}),
    ):
        assert api_client.post(reverse(nom), donnees).status_code == status.HTTP_403_FORBIDDEN, nom
    horaire = HoraireMedecin.objects.get(medecin=data['rado'])
    url = reverse('horaire-medecin-detail', args=[horaire.pk])
    assert api_client.delete(url).status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get(reverse('rdv-a-reaffecter-list')).status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_secretaire_gere_le_planning_de_tous_les_medecins(api_client, data):
    api_client.force_authenticate(user=data['secretaire'])
    for medecin in (data['rado'], data['bema']):
        res = api_client.post(reverse('absence-medecin-list'),
                              {'medecin': medecin.id, 'date_debut': '2026-12-24', 'date_fin': '2026-12-26'})
        assert res.status_code == status.HTTP_201_CREATED


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


# ==============================================================================
# CRÉNEAUX DE 15 MINUTES
# ==============================================================================

@pytest.mark.django_db
def test_deux_rdv_a_moins_de_15_minutes_refuses(api_client, data):
    dt = prochain(1, 10)
    assert creer_rdv_api(api_client, data, data['bema'], dt).status_code == status.HTTP_201_CREATED
    # même médecin, autre patient, 10 minutes plus tard : chevauchement
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('rendezvous-list'), {
        'patient': data['patient2'].id, 'medecin': data['bema'].id,
        'date_heure': (dt + timedelta(minutes=10)).isoformat(), 'type': 'CONSULTATION',
    }, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'déjà un rendez-vous à 10:00' in str(res.data['date_heure'])
    res = api_client.post(reverse('rendezvous-list'), {
        'patient': data['patient2'].id, 'medecin': data['bema'].id,
        'date_heure': (dt + timedelta(minutes=15)).isoformat(), 'type': 'CONSULTATION',
    }, format='json')
    assert res.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_le_creneau_doit_finir_avant_la_fin_de_la_plage(api_client, data):
    HoraireMedecin.objects.create(medecin=data['rado'], jour=0, heure_debut=time(8), heure_fin=time(12))
    assert creer_rdv_api(api_client, data, data['rado'], prochain(0, 11, 50)).status_code == 400  # finirait à 12h05
    assert creer_rdv_api(api_client, data, data['rado'], prochain(0, 11, 45)).status_code == 201


@pytest.mark.django_db
def test_creneaux_libres_tiennent_compte_des_horaires_et_des_rdv(api_client, data):
    lundi = prochain(0, 8)
    HoraireMedecin.objects.create(medecin=data['rado'], jour=0, heure_debut=time(8), heure_fin=time(9))
    RendezVous.objects.create(patient=data['patient'], medecin=data['rado'], date_heure=lundi + timedelta(minutes=10))
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.get(reverse('creneaux-libres'), {'medecin': data['rado'].id, 'date': lundi.date().isoformat()})
    assert res.status_code == status.HTTP_200_OK
    # le RDV de 8h10 bloque les créneaux de 8h00 et 8h15
    assert res.data['creneaux'] == ['08:30', '08:45']
    assert res.data['duree_minutes'] == 15
    assert res.data['horaires_definis'] is True
    # mardi : pas de plage ce jour-là
    mardi = (lundi + timedelta(days=1)).date().isoformat()
    assert api_client.get(reverse('creneaux-libres'), {'medecin': data['rado'].id, 'date': mardi}).data['creneaux'] == []


@pytest.mark.django_db
def test_creneaux_libres_medecin_sans_horaires_et_absent(api_client, data):
    jour = prochain(2, 8).date()
    api_client.force_authenticate(user=data['secretaire'])
    url = reverse('creneaux-libres')
    creneaux = api_client.get(url, {'medecin': data['bema'].id, 'date': jour.isoformat()}).data['creneaux']
    assert creneaux[0] == '08:00' and creneaux[-1] == '16:45' and len(creneaux) == 36
    AbsenceMedecin.objects.create(medecin=data['bema'], date_debut=jour, date_fin=jour, type='FORMATION')
    res = api_client.get(url, {'medecin': data['bema'].id, 'date': jour.isoformat()})
    assert res.data['creneaux'] == [] and res.data['absence'] == 'Formation'
    assert api_client.get(url, {'medecin': data['bema'].id}).status_code == status.HTTP_400_BAD_REQUEST


# ==============================================================================
# STATUT « NON VENU »
# ==============================================================================

def rdv_avec_facture(data, dt, statut='CONFIRME'):
    # La facture de consultation est créée automatiquement avec le RDV
    rdv = RendezVous.objects.create(patient=data['patient'], medecin=data['bema'], date_heure=dt, statut=statut)
    return rdv


@pytest.mark.django_db
def test_patient_non_venu_annule_la_facture_impayee(api_client, data):
    rdv = rdv_avec_facture(data, timezone.now() - timedelta(hours=2))
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.patch(reverse('rendezvous-detail', args=[rdv.id]), {'statut': 'NON_VENU'}, format='json')
    assert res.status_code == status.HTTP_200_OK, res.data
    rdv.refresh_from_db()
    assert rdv.statut == 'NON_VENU'
    assert rdv.facture.statut == 'ANNULEE'

    # erreur de saisie : retour à « Confirmé », la facture redevient à payer
    res = api_client.patch(reverse('rendezvous-detail', args=[rdv.id]), {'statut': 'CONFIRME'}, format='json')
    assert res.status_code == status.HTTP_200_OK, res.data
    rdv.refresh_from_db()


@pytest.mark.django_db
def test_non_venu_impossible_avant_l_heure_du_rdv(api_client, data):
    rdv = rdv_avec_facture(data, prochain(2, 10))
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.patch(reverse('rendezvous-detail', args=[rdv.id]), {'statut': 'NON_VENU'}, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "après l'heure du rendez-vous" in str(res.data)


@pytest.mark.django_db
def test_non_venu_ne_peut_etre_que_corrige_en_confirme(api_client, data):
    rdv = rdv_avec_facture(data, timezone.now() - timedelta(hours=1), statut='NON_VENU')
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.patch(reverse('rendezvous-detail', args=[rdv.id]), {'statut': 'PLANIFIE'}, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST


# ==============================================================================
# GARDES
# ==============================================================================

def garde(medecin, debut_dt, heure_fin, motif='Garde de nuit'):
    return GardeMedecin.objects.create(medecin=medecin, date=debut_dt.date(), heure_debut=debut_dt.time(),
                                       heure_fin=time(heure_fin), motif=motif)


@pytest.mark.django_db
def test_garde_de_nuit_autorise_un_rdv_hors_horaires(api_client, data):
    HoraireMedecin.objects.create(medecin=data['rado'], jour=5, heure_debut=time(8), heure_fin=time(12))
    garde(data['rado'], prochain(5, 18), 8)  # samedi 18h → dimanche 8h
    assert creer_rdv_api(api_client, data, data['rado'], prochain(5, 20)).status_code == status.HTTP_201_CREATED
    # après minuit, toujours pendant la garde
    dimanche_2h = prochain(5, 2) + timedelta(days=1)
    assert creer_rdv_api(api_client, data, data['rado'], dimanche_2h).status_code == status.HTTP_201_CREATED
    # après la fin de la garde : de nouveau hors horaires
    res = creer_rdv_api(api_client, data, data['rado'], prochain(5, 9) + timedelta(days=1))
    assert res.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_hors_horaires_propose_le_medecin_de_garde(api_client, data):
    for m in (data['rado'], data['bema']):
        HoraireMedecin.objects.create(medecin=m, jour=5, heure_debut=time(8), heure_fin=time(12))
    garde(data['bema'], prochain(5, 18), 23)
    res = creer_rdv_api(api_client, data, data['rado'], prochain(5, 20))
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'De garde à cette heure : Dr. Bema' in str(res.data['date_heure'])


@pytest.mark.django_db
def test_plusieurs_medecins_de_garde_en_meme_temps(api_client, data):
    debut = prochain(6, 8)
    garde(data['rado'], debut, 20)
    garde(data['kanto'], debut, 20)
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.get(reverse('garde-medecin-list'), {'a_venir': 1})
    assert res.status_code == status.HTTP_200_OK
    assert {g['medecin'] for g in res.data['results']} == {data['rado'].id, data['kanto'].id}


@pytest.mark.django_db
def test_garde_qui_chevauche_une_autre_garde_du_meme_medecin_refusee(api_client, data):
    garde(data['rado'], prochain(4, 20), 8)  # vendredi 20h → samedi 8h
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('garde-medecin-list'), {
        'medecin': data['rado'].id, 'date': (prochain(4, 0) + timedelta(days=1)).date().isoformat(),
        'heure_debut': '06:00', 'heure_fin': '12:00',
    }, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'chevauche' in str(res.data['heure_debut'])


@pytest.mark.django_db
def test_garde_refusee_si_le_medecin_est_absent(api_client, data):
    jour = prochain(2, 0).date()
    AbsenceMedecin.objects.create(medecin=data['rado'], date_debut=jour, date_fin=jour, type='CONGE')
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.post(reverse('garde-medecin-list'), {
        'medecin': data['rado'].id, 'date': jour.isoformat(), 'heure_debut': '18:00', 'heure_fin': '08:00',
    }, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'date' in res.data


@pytest.mark.django_db
def test_medecin_ne_cree_pas_de_garde(api_client, data):
    api_client.force_authenticate(user=data['rado_user'])
    res = api_client.post(reverse('garde-medecin-list'), {
        'medecin': data['bema'].id, 'date': prochain(2, 0).date().isoformat(),
        'heure_debut': '18:00', 'heure_fin': '08:00',
    }, format='json')
    assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_creneaux_libres_incluent_la_garde_et_la_fin_de_la_garde_de_la_veille(api_client, data):
    HoraireMedecin.objects.create(medecin=data['rado'], jour=5, heure_debut=time(8), heure_fin=time(9))
    garde(data['rado'], prochain(5, 22), 2)  # samedi 22h → dimanche 2h
    api_client.force_authenticate(user=data['secretaire'])
    samedi, dimanche = prochain(5, 0).date(), prochain(5, 0).date() + timedelta(days=1)
    res = api_client.get(reverse('creneaux-libres'), {'medecin': data['rado'].id, 'date': samedi.isoformat()})
    assert '08:00' in res.data['creneaux'] and '22:00' in res.data['creneaux']
    assert '20:00' not in res.data['creneaux']
    res = api_client.get(reverse('creneaux-libres'), {'medecin': data['rado'].id, 'date': dimanche.isoformat()})
    assert '00:00' in res.data['creneaux'] and '02:00' not in res.data['creneaux']


@pytest.mark.django_db
def test_gardes_en_cours(api_client, data):
    # garde commencée il y a une heure, qui finit dans deux heures (passe minuit si besoin)
    debut = (timezone.localtime() - timedelta(hours=1)).replace(second=0, microsecond=0)
    garde(data['rado'], debut, (debut + timedelta(hours=3)).hour, motif='Garde en cours')
    garde(data['bema'], prochain(2, 18), 23, motif='Garde à venir')
    api_client.force_authenticate(user=data['secretaire'])
    res = api_client.get(reverse('garde-medecin-en-cours'))
    assert res.status_code == status.HTTP_200_OK
    assert [g['medecin'] for g in res.data] == [data['rado'].id]
