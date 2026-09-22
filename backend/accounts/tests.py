import pytest
from rest_framework.test import APIClient
from rest_framework import status
from .models import Utilisateur


@pytest.mark.django_db
class TestAuthentification:
    def setup_method(self):
        self.client = APIClient()
        self.user = Utilisateur.objects.create_user(
            username="secretaire1", password="motdepasse123", role=Utilisateur.Role.SECRETAIRE
        )

    def test_connexion_reussie(self):
        response = self.client.post("/api/auth/token/", {
            "username": "secretaire1", "password": "motdepasse123"
        })
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_connexion_mauvais_mot_de_passe(self):
        response = self.client.post("/api/auth/token/", {
            "username": "secretaire1", "password": "mauvais_mdp"
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_role_correctement_assigne(self):
        assert self.user.role == Utilisateur.Role.SECRETAIRE
        assert self.user.role != Utilisateur.Role.ADMIN

    def test_me_endpoint_retourne_profil(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/accounts/me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "secretaire1"
        assert response.data["role"] == Utilisateur.Role.SECRETAIRE


@pytest.mark.django_db
class TestGestionUtilisateursAdmin:
    def setup_method(self):
        self.client = APIClient()
        self.admin = Utilisateur.objects.create_user(
            username="admin_test",
            password="adminpassword123",
            role=Utilisateur.Role.ADMIN,
            first_name="Admin",
            last_name="System",
            email="admin@hopital.local",
            is_staff=True,
            is_superuser=True
        )
        self.medecin = Utilisateur.objects.create_user(
            username="dr_dupont",
            password="password123",
            role=Utilisateur.Role.MEDECIN,
            first_name="Jean",
            last_name="Dupont",
            email="dupont@hopital.local",
            telephone="0340000001"
        )
        self.secretaire = Utilisateur.objects.create_user(
            username="sec_marie",
            password="password123",
            role=Utilisateur.Role.SECRETAIRE,
            first_name="Marie",
            last_name="Curie",
            email="marie@hopital.local"
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_liste_utilisateurs(self):
        response = self.client.get("/api/accounts/utilisateurs/")
        assert response.status_code == status.HTTP_200_OK
        usernames = [u["username"] for u in response.data["results"]]
        assert "admin_test" in usernames
        assert "dr_dupont" in usernames
        assert "sec_marie" in usernames

    def test_admin_filtre_par_role(self):
        response = self.client.get("/api/accounts/utilisateurs/?role=MEDECIN")
        assert response.status_code == status.HTTP_200_OK
        assert all(u["role"] == Utilisateur.Role.MEDECIN for u in response.data["results"])
        assert any(u["username"] == "dr_dupont" for u in response.data["results"])

    def test_admin_recherche_utilisateur(self):
        response = self.client.get("/api/accounts/utilisateurs/?search=Dupont")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["username"] == "dr_dupont"

    def test_admin_stats_utilisateurs(self):
        response = self.client.get("/api/accounts/utilisateurs/stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] >= 3
        assert response.data["medecins"] >= 1
        assert response.data["admins"] >= 1

    def test_admin_cree_utilisateur(self):
        payload = {
            "username": "dr_house",
            "first_name": "Gregory",
            "last_name": "House",
            "email": "house@hopital.local",
            "role": Utilisateur.Role.MEDECIN,
            "telephone": "0341122334",
            "password": "Diagnostic2026!",
            "is_active": True,
        }
        response = self.client.post("/api/accounts/utilisateurs/", payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["username"] == "dr_house"
        assert response.data["role"] == Utilisateur.Role.MEDECIN
        assert "password" not in response.data

        # Vérifier que le mot de passe est bien haché et que l'utilisateur peut s'authentifier
        new_user = Utilisateur.objects.get(username="dr_house")
        assert new_user.check_password("Diagnostic2026!")

    def test_admin_modifie_utilisateur(self):
        payload = {
            "first_name": "Jean-Paul",
            "last_name": "Dupont",
            "email": "jp.dupont@hopital.local",
            "role": Utilisateur.Role.MEDECIN,
            "telephone": "0349988776",
            "is_active": True,
        }
        response = self.client.patch(f"/api/accounts/utilisateurs/{self.medecin.id}/", payload)
        assert response.status_code == status.HTTP_200_OK
        self.medecin.refresh_from_db()
        assert self.medecin.first_name == "Jean-Paul"
        assert self.medecin.telephone == "0349988776"

    def test_admin_bascule_statut_actif(self):
        # Désactiver
        response = self.client.post(f"/api/accounts/utilisateurs/{self.medecin.id}/toggle-active/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_active"] is False
        self.medecin.refresh_from_db()
        assert not self.medecin.is_active

        # Réactiver
        response = self.client.post(f"/api/accounts/utilisateurs/{self.medecin.id}/toggle-active/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_active"] is True
        self.medecin.refresh_from_db()
        assert self.medecin.is_active

    def test_admin_reinitialise_mot_de_passe(self):
        payload = {
            "new_password": "NewSecretPassword2026!",
            "confirm_password": "NewSecretPassword2026!",
        }
        response = self.client.post(f"/api/accounts/utilisateurs/{self.medecin.id}/reset-password/", payload)
        assert response.status_code == status.HTTP_200_OK
        self.medecin.refresh_from_db()
        assert self.medecin.check_password("NewSecretPassword2026!")

    def test_admin_ne_peut_pas_desactiver_son_propre_compte(self):
        response = self.client.post(f"/api/accounts/utilisateurs/{self.admin.id}/toggle-active/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_ne_peut_pas_supprimer_son_propre_compte(self):
        response = self.client.delete(f"/api/accounts/utilisateurs/{self.admin.id}/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_supprime_utilisateur_cible(self):
        response = self.client.delete(f"/api/accounts/utilisateurs/{self.secretaire.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Utilisateur.objects.filter(id=self.secretaire.id).exists()


@pytest.mark.django_db
class TestPermissionsGestionUtilisateurs:
    def setup_method(self):
        self.client = APIClient()
        self.medecin = Utilisateur.objects.create_user(
            username="medecin_simple",
            password="password123",
            role=Utilisateur.Role.MEDECIN
        )
        self.secretaire = Utilisateur.objects.create_user(
            username="sec_simple",
            password="password123",
            role=Utilisateur.Role.SECRETAIRE
        )

    def test_secretaire_interdit_acces_liste_utilisateurs(self):
        self.client.force_authenticate(user=self.secretaire)
        response = self.client.get("/api/accounts/utilisateurs/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_medecin_interdit_creation_utilisateur(self):
        self.client.force_authenticate(user=self.medecin)
        response = self.client.post("/api/accounts/utilisateurs/", {
            "username": "hacker", "password": "password123", "role": "ADMIN"
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_anonyme_interdit_acces_utilisateurs(self):
        response = self.client.get("/api/accounts/utilisateurs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

