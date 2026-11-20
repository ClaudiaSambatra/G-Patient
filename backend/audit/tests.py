from datetime import timedelta
from io import StringIO
from unittest import mock

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Utilisateur
from patients.models import Patient
from .journal import decouper_chemin
from .models import EntreeJournal

Action = EntreeJournal.Action
MOT_DE_PASSE = "motdepasse123"


def creer_utilisateur(username, role):
    return Utilisateur.objects.create_user(username=username, password=MOT_DE_PASSE, role=role)


def client_jwt(username):
    """Client authentifié par un vrai jeton JWT, comme le frontend (et non par force_authenticate)."""
    client = APIClient()
    reponse = client.post("/api/auth/token/", {"username": username, "password": MOT_DE_PASSE})
    assert reponse.status_code == status.HTTP_200_OK
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {reponse.data['access']}")
    EntreeJournal.objects.all().delete()  # on ne garde que les traces du test lui-même
    return client


@pytest.fixture
def secretaire(db):
    return creer_utilisateur("secretaire1", Utilisateur.Role.SECRETAIRE)


@pytest.fixture
def admin(db):
    return creer_utilisateur("admin1", Utilisateur.Role.ADMIN)


@pytest.fixture
def patient(db):
    return Patient.objects.create(nom="Rakoto", prenom="Jean", date_naissance="1990-05-12")


class TestDecoupage:
    @pytest.mark.parametrize("chemin, attendu", [
        ("/api/patients/", ("patients", "")),
        ("/api/patients/12/", ("patients", "12")),
        ("/api/patients/documents/3/", ("patients/documents", "3")),
        ("/api/stocks/medicaments/4/reception/", ("stocks/medicaments", "4")),
        ("/api/accounts/me/", ("accounts/me", "")),
    ])
    def test_ressource_et_identifiant(self, chemin, attendu):
        assert decouper_chemin(chemin) == attendu


@pytest.mark.django_db
class TestConnexion:
    def test_connexion_reussie(self, secretaire):
        APIClient().post("/api/auth/token/", {"username": "secretaire1", "password": MOT_DE_PASSE},
                         REMOTE_ADDR="10.0.0.5")
        entree = EntreeJournal.objects.get()
        assert entree.action == Action.CONNEXION
        assert entree.utilisateur == secretaire
        assert entree.role == Utilisateur.Role.SECRETAIRE
        assert entree.statut == 200
        assert entree.adresse_ip == "10.0.0.5"

    def test_echec_de_connexion_garde_le_nom_saisi(self, secretaire):
        reponse = APIClient().post("/api/auth/token/", {"username": "secretaire1", "password": "mauvais"})
        assert reponse.status_code == status.HTTP_401_UNAUTHORIZED
        entree = EntreeJournal.objects.get()
        assert entree.action == Action.ECHEC_CONNEXION
        assert entree.utilisateur is None
        assert entree.nom_utilisateur == "secretaire1"
        assert not entree.reussie

    def test_compte_inexistant(self, db):
        APIClient().post("/api/auth/token/", {"username": "inconnu", "password": "x"})
        assert EntreeJournal.objects.get().nom_utilisateur == "inconnu"

    def test_le_mot_de_passe_n_est_jamais_trace(self, secretaire):
        APIClient().post("/api/auth/token/", {"username": "secretaire1", "password": "SecretTresPrive"})
        entree = EntreeJournal.objects.get()
        assert "SecretTresPrive" not in str(entree.__dict__)

    def test_mot_de_passe_oublie(self, db):
        APIClient().post("/api/auth/request-otp/", {"email": "personne@example.com"})
        entree = EntreeJournal.objects.get()
        assert entree.action == Action.MOT_DE_PASSE
        assert entree.utilisateur is None


@pytest.mark.django_db
class TestRequetesTracees:
    def test_consultation_d_un_dossier_patient(self, secretaire, patient):
        client = client_jwt("secretaire1")
        assert client.get(f"/api/patients/{patient.id}/").status_code == 200
        entree = EntreeJournal.objects.get()
        assert entree.action == Action.CONSULTATION
        assert entree.utilisateur == secretaire
        assert (entree.ressource, entree.objet_id) == ("patients", str(patient.id))

    def test_liste_restreinte_a_un_patient(self, secretaire, patient):
        client = client_jwt("secretaire1")
        client.get(f"/api/patients/documents/?patient={patient.id}")
        entree = EntreeJournal.objects.get()
        assert entree.action == Action.CONSULTATION
        assert entree.chemin == f"/api/patients/documents/?patient={patient.id}"

    def test_liste_generale_et_donnees_non_medicales_non_tracees(self, secretaire):
        client = client_jwt("secretaire1")
        client.get("/api/patients/")
        client.get("/api/accounts/me/")
        client.get("/api/health/")
        assert not EntreeJournal.objects.exists()

    def test_creation_modification_suppression(self, secretaire):
        client = client_jwt("secretaire1")
        reponse = client.post("/api/patients/", {"nom": "Rasoa", "prenom": "Jeanne", "date_naissance": "1995-02-10"})
        identifiant = reponse.data["id"]
        client.patch(f"/api/patients/{identifiant}/", {"prenom": "Jeannette"})
        # Une secrétaire n'a pas le droit de supprimer : la tentative refusée est tracée aussi
        assert client.delete(f"/api/patients/{identifiant}/").status_code == 403
        traces = list(EntreeJournal.objects.order_by("id").values_list("action", "objet_id", "statut"))
        assert traces == [
            (Action.CREATION, "", 201),
            (Action.MODIFICATION, str(identifiant), 200),
            (Action.SUPPRESSION, str(identifiant), 403),
        ]

    def test_requetes_anonymes_non_tracees(self, patient):
        assert APIClient().get(f"/api/patients/{patient.id}/").status_code == 401
        assert not EntreeJournal.objects.exists()

    def test_compte_supprime_la_trace_reste_lisible(self, secretaire, patient):
        client_jwt("secretaire1").get(f"/api/patients/{patient.id}/")
        secretaire.delete()
        entree = EntreeJournal.objects.get()
        assert entree.utilisateur is None
        assert entree.nom_utilisateur == "secretaire1"

    def test_panne_du_journal_sans_effet_sur_la_requete(self, secretaire, patient):
        client = client_jwt("secretaire1")
        with mock.patch.object(EntreeJournal.objects, "create", side_effect=RuntimeError("base indisponible")):
            assert client.get(f"/api/patients/{patient.id}/").status_code == 200


@pytest.mark.django_db
class TestAdresseIP:
    def test_en_tete_ignore_sans_proxy(self, settings, secretaire, patient):
        settings.AUDIT_DERRIERE_PROXY = False
        client_jwt("secretaire1").get(f"/api/patients/{patient.id}/",
                                      HTTP_X_FORWARDED_FOR="1.2.3.4", REMOTE_ADDR="10.0.0.9")
        assert EntreeJournal.objects.get().adresse_ip == "10.0.0.9"

    def test_derriere_proxy_adresse_ajoutee_par_le_proxy(self, settings, secretaire, patient):
        settings.AUDIT_DERRIERE_PROXY = True
        # « 6.6.6.6 » est envoyé par le client lui-même ; « 41.188.1.2 » est ajouté par le proxy
        client_jwt("secretaire1").get(f"/api/patients/{patient.id}/",
                                      HTTP_X_FORWARDED_FOR="6.6.6.6, 41.188.1.2", REMOTE_ADDR="172.18.0.3")
        assert EntreeJournal.objects.get().adresse_ip == "41.188.1.2"


@pytest.mark.django_db
class TestConsultationDuJournal:
    def test_reserve_aux_administrateurs(self, admin, secretaire):
        assert client_jwt("secretaire1").get("/api/audit/").status_code == 403
        medecin = creer_utilisateur("medecin1", Utilisateur.Role.MEDECIN)
        assert medecin
        assert client_jwt("medecin1").get("/api/audit/").status_code == 403
        assert client_jwt("admin1").get("/api/audit/").status_code == 200

    def test_lecture_seule(self, admin):
        client = client_jwt("admin1")
        assert client.post("/api/audit/", {"action": "CONNEXION"}).status_code == 405
        entree = EntreeJournal.objects.create(action=Action.CONNEXION, methode="POST", chemin="/", statut=200)
        assert client.delete(f"/api/audit/{entree.id}/").status_code == 405
        assert client.patch(f"/api/audit/{entree.id}/", {"statut": 500}).status_code == 405

    def test_filtres(self, admin, secretaire, patient):
        APIClient().post("/api/auth/token/", {"username": "secretaire1", "password": "mauvais"})
        client_secretaire = APIClient()
        client_secretaire.force_authenticate(secretaire)
        client_secretaire.get(f"/api/patients/{patient.id}/")
        client = APIClient()
        client.force_authenticate(admin)

        echecs = client.get("/api/audit/?echecs=1").data
        assert [e["action"] for e in echecs["results"]] == [Action.ECHEC_CONNEXION]
        consultations = client.get(f"/api/audit/?action=CONSULTATION&utilisateur={secretaire.id}").data
        assert consultations["count"] == 1
        assert consultations["results"][0]["action_display"] == "Consultation"
        assert client.get("/api/audit/?ressource=patients").data["count"] == 1
        aujourd_hui = timezone.localdate().isoformat()
        assert client.get(f"/api/audit/?du={aujourd_hui}&au={aujourd_hui}").data["count"] == 2
        assert client.get("/api/audit/?du=2000-01-01&au=2000-01-02").data["count"] == 0
        assert client.get("/api/audit/?du=hier").status_code == 400
        assert client.get("/api/audit/?utilisateur=abc").status_code == 400


@pytest.mark.django_db
class TestPurge:
    def test_supprime_seulement_les_entrees_anciennes(self):
        ancienne = EntreeJournal.objects.create(action=Action.CONNEXION, methode="POST", chemin="/", statut=200)
        EntreeJournal.objects.filter(pk=ancienne.pk).update(date=timezone.now() - timedelta(days=400))
        recente = EntreeJournal.objects.create(action=Action.CONNEXION, methode="POST", chemin="/", statut=200)
        sortie = StringIO()
        call_command("purger_journal_audit", "--jours", "365", stdout=sortie)
        assert list(EntreeJournal.objects.all()) == [recente]
        assert "1 entrée(s)" in sortie.getvalue()
