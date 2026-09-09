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
