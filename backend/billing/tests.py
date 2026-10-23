import pytest
from datetime import timedelta
from decimal import Decimal
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur, Medecin
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from prescriptions.models import Ordonnance
from billing.models import Facture


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_data():
    admin = Utilisateur.objects.create_user(username='admin_test', password='password', role='ADMIN')
    secr = Utilisateur.objects.create_user(username='secr_test', password='password', role='SECRETAIRE')
    med1_user = Utilisateur.objects.create_user(username='med1_test', password='password', role='MEDECIN')
    med2_user = Utilisateur.objects.create_user(username='med2_test', password='password', role='MEDECIN')

    med1, _ = Medecin.objects.get_or_create(utilisateur=med1_user, defaults={'specialite': 'Généraliste'})
    med2, _ = Medecin.objects.get_or_create(utilisateur=med2_user, defaults={'specialite': 'Pédiatre'})

    patient = Patient.objects.create(
        nom='Rakoto', prenom='Jean', date_naissance='1990-05-15', contact='0340011122'
    )

    return {
        'admin': admin,
        'secretaire': secr,
        'medecin1_user': med1_user,
        'medecin2_user': med2_user,
        'medecin1': med1,
        'medecin2': med2,
        'patient': patient,
    }


# 1. Création d'un rendez-vous CONSULTATION crée la facture IMPAYEE au bon montant
@pytest.mark.django_db
def test_creation_rdv_consultation_cree_facture_impayee(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    rdv_date = timezone.now() + timedelta(days=2)
    url = reverse('rendezvous-list')
    data = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin1'].id,
        'date_heure': rdv_date.isoformat(),
        'type': 'CONSULTATION',
        'motif': 'Consultation générale'
    }
    response = api_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    rdv_id = response.data['id']

    rdv = RendezVous.objects.get(id=rdv_id)
    assert hasattr(rdv, 'facture')
    facture = rdv.facture
    assert facture.statut == Facture.StatutPaiement.IMPAYEE
    assert facture.type == Facture.Type.CONSULTATION
    assert facture.montant == Decimal('20000.00')
    assert response.data['statut_paiement'] == 'IMPAYE'


# 2. CONTROLE accepté à 15 jours et refusé à 16 jours
@pytest.mark.django_db
def test_controle_accepte_a_15_jours_et_refuse_a_16_jours(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    now = timezone.now()

    # Consultation d'origine terminée
    rdv_origine = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=15),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    consultation = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv_origine,
        date_consultation=now - timedelta(days=15),
        motif='Origine',
        observations='Obs',
        diagnostic='Diag'
    )

    # RDV Contrôle exactement à 15 jours d'écart -> Accepté
    url = reverse('rendezvous-list')
    data_15j = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin1'].id,
        'date_heure': (now + timedelta(hours=1)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Contrôle à 15j'
    }
    res_15j = api_client.post(url, data_15j, format='json')
    assert res_15j.status_code == status.HTTP_201_CREATED
    assert res_15j.data['consultation_origine'] == consultation.id
    assert res_15j.data['statut_paiement'] == 'GRATUIT'

    # Ancienneté de la consultation passée à 16 jours -> Refusé
    consultation.date_consultation = now - timedelta(days=16)
    consultation.save(update_fields=['date_consultation'])

    # Nouveau contrôle -> Refusé
    data_16j = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin1'].id,
        'date_heure': (now + timedelta(hours=2)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Contrôle à 16j'
    }
    res_16j = api_client.post(url, data_16j, format='json')
    assert res_16j.status_code == status.HTTP_400_BAD_REQUEST
    assert "Aucune consultation payante de ce patient dans les 15 derniers jours : le contrôle n'est pas gratuit." in str(res_16j.data)


# 3. Contrôle accepté avec un autre médecin
@pytest.mark.django_db
def test_controle_accepte_avec_autre_medecin(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    now = timezone.now()

    # Consultation initiale avec medecin 1
    rdv_origine = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=5),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    consultation = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv_origine,
        date_consultation=now - timedelta(days=5),
        motif='Consultation médecin 1',
        observations='Obs',
        diagnostic='Diag'
    )

    # RDV Contrôle avec medecin 2
    url = reverse('rendezvous-list')
    data = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin2'].id,
        'date_heure': (now + timedelta(days=1)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Contrôle avec médecin 2'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data['consultation_origine'] == consultation.id


# 4. Refusé si la consultation d'origine vient d'un autre contrôle
@pytest.mark.django_db
def test_controle_refuse_si_consultation_origine_vient_autre_controle(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    now = timezone.now()

    # Consultation liée à un RDV de type CONTROLE
    rdv_controle_prev = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=2),
        type=RendezVous.Type.CONTROLE,
        statut=RendezVous.Statut.TERMINE
    )
    Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv_controle_prev,
        date_consultation=now - timedelta(days=2),
        motif='Consultation issue de contrôle',
        observations='Obs',
        diagnostic='Diag'
    )

    url = reverse('rendezvous-list')
    data = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin1'].id,
        'date_heure': (now + timedelta(days=1)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Deuxième contrôle en chaîne'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Aucune consultation payante de ce patient dans les 15 derniers jours : le contrôle n'est pas gratuit." in str(res.data)


# 5. Refusé sans consultation préalable
@pytest.mark.django_db
def test_controle_refuse_sans_consultation_prealable(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    now = timezone.now()

    url = reverse('rendezvous-list')
    data = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin1'].id,
        'date_heure': (now + timedelta(days=1)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Contrôle direct'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Aucune consultation payante de ce patient dans les 15 derniers jours : le contrôle n'est pas gratuit." in str(res.data)


# 6. Consultation d'origine renseignée automatiquement avec la plus récente
@pytest.mark.django_db
def test_consultation_origine_renseignee_automatiquement(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    now = timezone.now()

    # Première consultation à J-10
    rdv1 = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=10),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    c1 = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv1,
        date_consultation=now - timedelta(days=10),
        motif='C1 ancienne',
        observations='Obs',
        diagnostic='Diag'
    )

    # Deuxième consultation plus récente à J-2
    rdv2 = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=2),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    c2 = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv2,
        date_consultation=now - timedelta(days=2),
        motif='C2 récente',
        observations='Obs',
        diagnostic='Diag'
    )

    url = reverse('rendezvous-list')
    data = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin2'].id,
        'date_heure': (now + timedelta(days=1)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Contrôle automatique'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data['consultation_origine'] == c2.id


# 7. Aucune facture pour un contrôle
@pytest.mark.django_db
def test_aucune_facture_pour_un_controle(api_client, test_data):
    api_client.force_authenticate(user=test_data['secretaire'])
    now = timezone.now()

    rdv_origine = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=3),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv_origine,
        date_consultation=now - timedelta(days=3),
        motif='Origine',
        observations='Obs',
        diagnostic='Diag'
    )

    factures_count_before = Facture.objects.count()
    url = reverse('rendezvous-list')
    data = {
        'patient': test_data['patient'].id,
        'medecin': test_data['medecin1'].id,
        'date_heure': (now + timedelta(days=1)).isoformat(),
        'type': 'CONTROLE',
        'motif': 'Contrôle gratuit'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    rdv_id = res.data['id']
    rdv = RendezVous.objects.get(id=rdv_id)
    assert not hasattr(rdv, 'facture')
    assert Facture.objects.count() == factures_count_before


# 8. Le médecin du contrôle lit la consultation d'origine et ses ordonnances mais pas les autres consultations du confrère
@pytest.mark.django_db
def test_medecin_controle_lit_consultation_origine_et_ordonnances_mais_pas_autres_consultations(api_client, test_data):
    now = timezone.now()

    # Médecin 1 effectue consultation 1 (avec ordonnance)
    rdv1 = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=4),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    c1 = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv1,
        date_consultation=now - timedelta(days=4),
        motif='Consultation 1 initiale',
        observations='Obs 1',
        diagnostic='Diag 1'
    )
    ord1 = Ordonnance.objects.create(
        consultation=c1,
        medicaments='Amoxicilline 500mg',
        posologie='1 gélule 3x/jour',
        duree='7 jours'
    )

    # Médecin 1 effectue une consultation 2 pour le même patient (sans rapport)
    rdv2 = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=now - timedelta(days=2),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.TERMINE
    )
    c2 = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        rendez_vous=rdv2,
        date_consultation=now - timedelta(days=2),
        motif='Consultation 2 autre sujet',
        observations='Obs 2',
        diagnostic='Diag 2'
    )

    # Médecin 2 se voit assigner le contrôle lié à c1
    rdv_controle = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin2'],
        date_heure=now + timedelta(days=1),
        type=RendezVous.Type.CONTROLE,
        consultation_origine=c1,
        statut=RendezVous.Statut.CONFIRME
    )

    # Médecin 2 se connecte
    api_client.force_authenticate(user=test_data['medecin2_user'])

    # 1. Peut lire c1
    res_c1 = api_client.get(reverse('consultation-detail', args=[c1.id]))
    assert res_c1.status_code == status.HTTP_200_OK
    assert res_c1.data['id'] == c1.id

    # 2. Peut lire les ordonnances de c1
    res_ord = api_client.get(reverse('ordonnance-list'), {'consultation': c1.id})
    assert res_ord.status_code == status.HTTP_200_OK
    assert any(o['id'] == ord1.id for o in res_ord.data['results'])

    # 3. Ne peut PAS lire c2 du confrère
    res_c2 = api_client.get(reverse('consultation-detail', args=[c2.id]))
    assert res_c2.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

    # 4. Ne peut pas modifier c1 (lecture seule)
    res_patch = api_client.patch(reverse('consultation-detail', args=[c1.id]), {'motif': 'Tentative modif'}, format='json')
    assert res_patch.status_code == status.HTTP_403_FORBIDDEN


# 9. Encaissement passe la facture à PAYEE et confirme le rendez-vous
@pytest.mark.django_db
def test_encaissement_passe_facture_payee_et_confirme_rendezvous(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=2),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.PLANIFIE
    )
    facture = rdv.facture
    assert facture.statut == Facture.StatutPaiement.IMPAYEE

    api_client.force_authenticate(user=test_data['secretaire'])
    url = reverse('facture-encaisser', args=[facture.id])
    res = api_client.post(url, format='json')
    assert res.status_code == status.HTTP_200_OK
    assert res.data['statut'] == Facture.StatutPaiement.PAYEE
    assert res.data['date_paiement'] is not None

    facture.refresh_from_db()
    rdv.refresh_from_db()
    assert facture.statut == Facture.StatutPaiement.PAYEE
    assert facture.encaisse_par == test_data['secretaire']
    assert rdv.statut == RendezVous.Statut.CONFIRME


# 9b. L'administrateur a aussi les droits de secrétaire et peut encaisser
@pytest.mark.django_db
def test_admin_a_les_droits_secretaire_et_peut_encaisser(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=2),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.PLANIFIE
    )
    facture = rdv.facture
    assert facture.statut == Facture.StatutPaiement.IMPAYEE

    api_client.force_authenticate(user=test_data['admin'])
    url = reverse('facture-encaisser', args=[facture.id])
    res = api_client.post(url, format='json')
    assert res.status_code == status.HTTP_200_OK
    assert res.data['statut'] == Facture.StatutPaiement.PAYEE
    assert res.data['date_paiement'] is not None

    facture.refresh_from_db()
    rdv.refresh_from_db()
    assert facture.statut == Facture.StatutPaiement.PAYEE
    assert facture.encaisse_par == test_data['admin']
    assert rdv.statut == RendezVous.Statut.CONFIRME


# 10. La consultation reste possible quand la facture est impayée
@pytest.mark.django_db
def test_consultation_possible_quand_facture_impayee(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=1),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.CONFIRME
    )
    assert rdv.facture.statut == Facture.StatutPaiement.IMPAYEE

    # Médecin effectue la consultation
    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('consultation-list')
    data = {
        'rendez_vous': rdv.id,
        'motif': 'Consultation effectuée malgré facture impayée',
        'observations': 'Tension normale',
        'diagnostic': 'État général satisfaisant'
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data['rendez_vous'] == rdv.id

    rdv.refresh_from_db()
    assert rdv.statut == RendezVous.Statut.TERMINE


# 11. Annulation d'un rendez-vous impayé passe la facture à ANNULEE
@pytest.mark.django_db
def test_annulation_rdv_impaye_passe_facture_annulee(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=3),
        type=RendezVous.Type.CONSULTATION,
        statut=RendezVous.Statut.PLANIFIE
    )
    facture = rdv.facture
    assert facture.statut == Facture.StatutPaiement.IMPAYEE

    api_client.force_authenticate(user=test_data['secretaire'])
    res = api_client.post(reverse('rendezvous-annuler', args=[rdv.id]))
    assert res.status_code == status.HTTP_200_OK

    facture.refresh_from_db()
    assert facture.statut == Facture.StatutPaiement.ANNULEE


# 12. Facture payée non supprimable ni modifiable
@pytest.mark.django_db
def test_facture_payee_non_supprimable_ni_modifiable(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=2),
        type=RendezVous.Type.CONSULTATION
    )
    facture = rdv.facture
    facture.statut = Facture.StatutPaiement.PAYEE
    facture.date_paiement = timezone.now()
    facture.encaisse_par = test_data['secretaire']
    facture.save()

    # Tentative de suppression par l'Admin -> 400
    api_client.force_authenticate(user=test_data['admin'])
    res_del = api_client.delete(reverse('facture-detail', args=[facture.id]))
    assert res_del.status_code == status.HTTP_400_BAD_REQUEST

    # Tentative de modification -> 400
    res_patch = api_client.patch(reverse('facture-detail', args=[facture.id]), {'montant': 50000}, format='json')
    assert res_patch.status_code == status.HTTP_400_BAD_REQUEST


# 13. Reçu refusé pour une facture impayée et accepté si payée
@pytest.mark.django_db
def test_recu_refuse_pour_facture_impayee_et_accepte_si_payee(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=2),
        type=RendezVous.Type.CONSULTATION
    )
    facture = rdv.facture
    assert facture.statut == Facture.StatutPaiement.IMPAYEE

    api_client.force_authenticate(user=test_data['secretaire'])
    recu_url = reverse('facture-recu', args=[facture.id])

    # Reçu refusé quand impayée
    res_impayee = api_client.get(recu_url)
    assert res_impayee.status_code == status.HTTP_400_BAD_REQUEST

    # Encaissement
    api_client.post(reverse('facture-encaisser', args=[facture.id]))

    # Reçu accepté quand payée
    res_payee = api_client.get(recu_url)
    assert res_payee.status_code == status.HTTP_200_OK
    assert res_payee['Content-Type'] == 'application/pdf'
    assert res_payee.content.startswith(b'%PDF')


# 14. Création de la facture MEDICAMENTS liée à l'ordonnance
@pytest.mark.django_db
def test_creation_facture_medicaments_liee_a_ordonnance(api_client, test_data):
    consultation = Consultation.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1_user'],
        motif='Consultation',
        observations='Obs',
        diagnostic='Diag'
    )
    ordonnance = Ordonnance.objects.create(
        consultation=consultation,
        medicaments='Paracétamol 1g',
        posologie='1 comp. 3x/jour',
        duree='5 jours'
    )

    api_client.force_authenticate(user=test_data['secretaire'])
    url = reverse('facture-list')
    data = {
        'patient': test_data['patient'].id,
        'ordonnance': ordonnance.id,
        'type': 'MEDICAMENTS',
        'montant': 15000,
        'designation': f"Médicaments, ordonnance n°{ordonnance.id}"
    }
    res = api_client.post(url, data, format='json')
    assert res.status_code == status.HTTP_201_CREATED
    assert res.data['type'] == 'MEDICAMENTS'
    assert res.data['ordonnance'] == ordonnance.id
    assert res.data['montant'] == '15000.00'

    facture = Facture.objects.get(id=res.data['id'])
    assert facture.ordonnance == ordonnance


# 15. Le médecin ne peut pas encaisser
@pytest.mark.django_db
def test_medecin_ne_peut_pas_encaisser(api_client, test_data):
    rdv = RendezVous.objects.create(
        patient=test_data['patient'],
        medecin=test_data['medecin1'],
        date_heure=timezone.now() + timedelta(days=2),
        type=RendezVous.Type.CONSULTATION
    )
    facture = rdv.facture

    api_client.force_authenticate(user=test_data['medecin1_user'])
    url = reverse('facture-encaisser', args=[facture.id])
    res = api_client.post(url, format='json')
    assert res.status_code == status.HTTP_403_FORBIDDEN
