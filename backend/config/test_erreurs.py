import pytest
from django.test import override_settings


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_adresse_api_inconnue_repond_en_json(client):
    res = client.get('/api/nexiste-pas/')
    assert res.status_code == 404
    assert res['Content-Type'] == 'application/json'
    assert res.json() == {'detail': 'Ressource introuvable.'}


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_adresse_hors_api_garde_la_page_html(client):
    res = client.get('/nexiste-pas/')
    assert res.status_code == 404
    assert res['Content-Type'].startswith('text/html')


# Paramètres d'adresse invalides : erreur 400 explicite, jamais 500 (sonde faite après le scan OWASP ZAP)
ROUTES_FILTRES = [
    ('/api/rendezvous/', 'medecin'), ('/api/rendezvous/', 'date'), ('/api/rendezvous/', 'date_debut'),
    ('/api/rendezvous/historique-suivi/', 'patient'),
    ('/api/consultations/', 'patient'), ('/api/consultations/', 'rendez_vous'), ('/api/consultations/', 'date_fin'),
    ('/api/prescriptions/', 'consultation'), ('/api/prescriptions/', 'patient'), ('/api/prescriptions/', 'date_debut'),
    ('/api/billing/', 'patient'), ('/api/billing/', 'rendez_vous'),
    ('/api/examinations/', 'patient'), ('/api/examinations/', 'consultation'), ('/api/examinations/', 'date_fin'),
    ('/api/patients/documents/', 'patient'),
    ('/api/stocks/mouvements/', 'medicament'),
]


@pytest.mark.django_db
@pytest.mark.parametrize('route,param', ROUTES_FILTRES)
@pytest.mark.parametrize('valeur', ['abc', 'A' * 3000, '9' * 30])
def test_parametre_invalide_renvoie_400(route, param, valeur):
    from rest_framework.test import APIClient
    from accounts.models import Utilisateur
    admin = Utilisateur.objects.create_user(username='admin_sonde', password='x', role='ADMIN')
    client = APIClient()
    client.force_authenticate(user=admin)
    res = client.get(route, {param: valeur})
    assert res.status_code == 400, res.content[:200]
    assert param in res.json()


def test_lire_identifiant():
    from config.parametres import lire_identifiant
    assert lire_identifiant('12') == 12
    assert lire_identifiant(' 7 ') == 7
    for valeur in ['abc', '', None, '0', '-1', '1.5', '9' * 30]:
        assert lire_identifiant(valeur) is None
