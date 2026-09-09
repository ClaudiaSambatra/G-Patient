from datetime import date

import pytest
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Utilisateur
from .models import Patient


@pytest.mark.django_db
class TestPatientAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = Utilisateur.objects.create_user(
            username="secretaire1", password="motdepasse123", role=Utilisateur.Role.SECRETAIRE
        )
        self.client.force_authenticate(user=self.user)

    def test_creer_patient(self):
        payload = {
            "nom": "Rakoto",
            "prenom": "Jean",
            "date_naissance": "1990-05-12",
            "contact": "034 00 000 00",
        }
        response = self.client.post("/api/patients/", payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert Patient.objects.count() == 1

    def test_lister_patients(self):
        Patient.objects.create(
            nom="Rasoa", prenom="Marie", date_naissance=date(1985, 1, 1), contact="034 11 111 11"
        )
        response = self.client.get("/api/patients/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1


@pytest.mark.django_db
class TestPatientPermissions:
    def setup_method(self):
        self.client = APIClient()
        self.patient = Patient.objects.create(
            nom="Rabe", prenom="Paul", date_naissance=date(1980, 3, 15), contact="034 22 222 22"
        )

    def test_secretaire_ne_peut_pas_supprimer(self):
        secretaire = Utilisateur.objects.create_user(
            username="secretaire2", password="motdepasse123", role=Utilisateur.Role.SECRETAIRE
        )
        self.client.force_authenticate(user=secretaire)
        response = self.client.delete(f"/api/patients/{self.patient.id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_peut_supprimer(self):
        admin = Utilisateur.objects.create_user(
            username="admin2", password="motdepasse123", role=Utilisateur.Role.ADMIN
        )
        self.client.force_authenticate(user=admin)
        response = self.client.delete(f"/api/patients/{self.patient.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
