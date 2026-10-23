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


@pytest.mark.django_db
class TestRecuperationMotDePasse:
    def setup_method(self):
        from .models import PasswordResetToken
        from django.core import mail
        self.client = APIClient()
        self.user = Utilisateur.objects.create_user(
            username="docteur_test",
            password="AncienPassword123!",
            email="docteur.test@hopital.local",
            role=Utilisateur.Role.MEDECIN,
            first_name="Jean",
            last_name="Martin"
        )
        self.mail = mail

    def test_demande_otp_email_valide(self):
        from .models import PasswordResetToken
        response = self.client.post("/api/auth/request-otp/", {
            "email": "docteur.test@hopital.local"
        })
        assert response.status_code == status.HTTP_200_OK
        assert "docteur.test@hopital.local" in response.data["message"]
        
        # Vérifier que le jeton est créé en base
        token_obj = PasswordResetToken.objects.filter(utilisateur=self.user, is_used=False).first()
        assert token_obj is not None
        assert len(token_obj.code) == 6
        assert token_obj.is_valid()

        # Vérifier que l'email a été envoyé
        assert len(self.mail.outbox) >= 1
        sent_email = self.mail.outbox[-1]
        assert "docteur.test@hopital.local" in sent_email.to
        assert "[Gestion Patients] Réinitialisation de votre mot de passe" in sent_email.subject
        assert token_obj.code in sent_email.body

    def test_demande_otp_insensible_a_la_casse(self):
        from .models import PasswordResetToken
        response = self.client.post("/api/auth/request-otp/", {
            "email": "DOCTEUR.TEST@HOPITAL.LOCAL"
        })
        assert response.status_code == status.HTTP_200_OK
        assert PasswordResetToken.objects.filter(utilisateur=self.user, is_used=False).exists()

    def test_demande_otp_email_inexistant(self):
        response = self.client.post("/api/auth/request-otp/", {
            "email": "inconnu@hopital.local"
        })
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_demande_otp_sans_email(self):
        response = self.client.post("/api/auth/request-otp/", {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reinitialisation_succes_avec_code(self):
        from .models import PasswordResetToken
        # 1. Demande OTP
        self.client.post("/api/auth/request-otp/", {"email": self.user.email})
        token_obj = PasswordResetToken.objects.filter(utilisateur=self.user, is_used=False).first()
        
        # 2. Reset
        reset_res = self.client.post("/api/auth/reset-password/", {
            "email": self.user.email,
            "otp": token_obj.code,
            "new_password": "NouveauSuperPassword2026!"
        })
        assert reset_res.status_code == status.HTTP_200_OK
        token_obj.refresh_from_db()
        assert token_obj.is_used is True

        # 3. Vérification de la connexion avec le nouveau mot de passe
        login_res = self.client.post("/api/auth/token/", {
            "username": self.user.username,
            "password": "NouveauSuperPassword2026!"
        })
        assert login_res.status_code == status.HTTP_200_OK

    def test_reinitialisation_echec_code_invalide(self):
        self.client.post("/api/auth/request-otp/", {"email": self.user.email})
        reset_res = self.client.post("/api/auth/reset-password/", {
            "email": self.user.email,
            "otp": "000000",
            "new_password": "NouveauSuperPassword2026!"
        })
        assert reset_res.status_code == status.HTTP_400_BAD_REQUEST

    def test_reinitialisation_echec_code_expire(self):
        from .models import PasswordResetToken
        from django.utils import timezone
        from datetime import timedelta
        self.client.post("/api/auth/request-otp/", {"email": self.user.email})
        token_obj = PasswordResetToken.objects.filter(utilisateur=self.user, is_used=False).first()
        token_obj.expires_at = timezone.now() - timedelta(minutes=1)
        token_obj.save()

        reset_res = self.client.post("/api/auth/reset-password/", {
            "email": self.user.email,
            "otp": token_obj.code,
            "new_password": "NouveauSuperPassword2026!"
        })
        assert reset_res.status_code == status.HTTP_400_BAD_REQUEST

    def test_reinitialisation_echec_reutilisation_code(self):
        from .models import PasswordResetToken
        self.client.post("/api/auth/request-otp/", {"email": self.user.email})
        token_obj = PasswordResetToken.objects.filter(utilisateur=self.user, is_used=False).first()
        
        # Première utilisation
        self.client.post("/api/auth/reset-password/", {
            "email": self.user.email,
            "otp": token_obj.code,
            "new_password": "NouveauPassword1!"
        })
        
        # Deuxième utilisation
        second_res = self.client.post("/api/auth/reset-password/", {
            "email": self.user.email,
            "otp": token_obj.code,
            "new_password": "AutreNouveauPassword2!"
        })
        assert second_res.status_code == status.HTTP_400_BAD_REQUEST

    def test_reinitialisation_mot_de_passe_faible(self):
        from .models import PasswordResetToken
        self.client.post("/api/auth/request-otp/", {"email": self.user.email})
        token_obj = PasswordResetToken.objects.filter(utilisateur=self.user, is_used=False).first()

        reset_res = self.client.post("/api/auth/reset-password/", {
            "email": self.user.email,
            "otp": token_obj.code,
            "new_password": "123"
        })
        assert reset_res.status_code == status.HTTP_400_BAD_REQUEST
        assert "trop court" in reset_res.data["error"]


import io
import os
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile


def get_test_image(format='JPEG', size=(50, 50), color=(0, 128, 255)):
    buf = io.BytesIO()
    img = Image.new('RGB', size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()


@pytest.mark.django_db
class TestMonProfil:
    def setup_method(self):
        self.client = APIClient()
        self.user = Utilisateur.objects.create_user(
            username="docteur_test",
            password="AncienMotDePasse123!",
            role=Utilisateur.Role.MEDECIN,
            first_name="Marc",
            last_name="Lavoisier",
            email="docteur@hopital.local",
            telephone="0341122334"
        )
        self.client.force_authenticate(user=self.user)

    def teardown_method(self):
        if self.user.photo:
            try:
                self.user.photo.delete(save=False)
            except Exception:
                pass

    def test_lecture_profil(self):
        # 1. Lecture du profil sans photo
        response = self.client.get("/api/accounts/me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "docteur_test"
        assert response.data["first_name"] == "Marc"
        assert response.data["last_name"] == "Lavoisier"
        assert response.data["role"] == Utilisateur.Role.MEDECIN
        assert response.data["photo"] is None

    def test_modification_autorisee(self):
        # 2. Modification autorisée (nom, prénom, téléphone)
        response = self.client.patch("/api/accounts/me/", {
            "first_name": "Marcus",
            "last_name": "Lavoisier-Modif",
            "telephone": "0329988776"
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == "Marcus"
        assert response.data["last_name"] == "Lavoisier-Modif"
        assert response.data["telephone"] == "0329988776"

        self.user.refresh_from_db()
        assert self.user.first_name == "Marcus"
        assert self.user.last_name == "Lavoisier-Modif"
        assert self.user.telephone == "0329988776"

    def test_modification_champs_proteges_refusee(self):
        # 3. Tentative de modifier rôle, is_active ou email refusée
        res_role = self.client.patch("/api/accounts/me/", {"role": Utilisateur.Role.ADMIN}, format="json")
        assert res_role.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in res_role.data

        res_active = self.client.patch("/api/accounts/me/", {"is_active": False}, format="json")
        assert res_active.status_code == status.HTTP_400_BAD_REQUEST
        assert "is_active" in res_active.data

        res_email = self.client.patch("/api/accounts/me/", {"email": "pirate@test.local"}, format="json")
        assert res_email.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in res_email.data

        res_username = self.client.patch("/api/accounts/me/", {"username": "nouveau_pseudo"}, format="json")
        assert res_username.status_code == status.HTTP_400_BAD_REQUEST
        assert "username" in res_username.data

    def test_upload_photo_valide_et_formats(self):
        # 4. Upload photo valide (JPEG, PNG, WEBP)
        for fmt, ext, ctype in [("JPEG", "jpg", "image/jpeg"), ("PNG", "png", "image/png"), ("WEBP", "webp", "image/webp")]:
            img_bytes = get_test_image(format=fmt)
            upload_file = SimpleUploadedFile(f"avatar.{ext}", img_bytes, content_type=ctype)
            response = self.client.patch("/api/accounts/me/", {"photo": upload_file}, format="multipart")
            assert response.status_code == status.HTTP_200_OK
            assert response.data["photo"] is not None
            assert response.data["photo"].startswith("http")

            self.user.refresh_from_db()
            assert bool(self.user.photo)
            assert os.path.exists(self.user.photo.path)
            # Nettoyer
            self.user.photo.delete(save=False)

    def test_refus_fichier_non_image(self):
        # 5.a Refus d'un fichier texte renommé en image
        fake_file = SimpleUploadedFile("fake.jpg", b"ceci n'est pas une image", content_type="image/jpeg")
        response = self.client.patch("/api/accounts/me/", {"photo": fake_file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "photo" in response.data

    def test_refus_format_interdit(self):
        # 5.b Refus d'un format interdit (ex: GIF, BMP)
        gif_bytes = get_test_image(format="GIF")
        gif_file = SimpleUploadedFile("avatar.gif", gif_bytes, content_type="image/gif")
        response = self.client.patch("/api/accounts/me/", {"photo": gif_file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "photo" in response.data

    def test_refus_fichier_plus_de_2mo(self):
        # 5.c Refus d'un fichier > 2 Mo
        large_img = Image.frombytes('RGB', (1024, 1024), os.urandom(1024 * 1024 * 3))
        buf = io.BytesIO()
        large_img.save(buf, format='PNG')
        large_bytes = buf.getvalue()
        assert len(large_bytes) > 2 * 1024 * 1024

        large_file = SimpleUploadedFile("heavy.png", large_bytes, content_type="image/png")
        response = self.client.patch("/api/accounts/me/", {"photo": large_file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "photo" in response.data

    def test_remplacement_photo_supprime_ancien_fichier(self):
        # 6. Remplacement de photo (ancien fichier supprimé)
        img1 = SimpleUploadedFile("photo1.jpg", get_test_image(format="JPEG", color=(255, 0, 0)), content_type="image/jpeg")
        res1 = self.client.patch("/api/accounts/me/", {"photo": img1}, format="multipart")
        assert res1.status_code == status.HTTP_200_OK

        self.user.refresh_from_db()
        old_path = self.user.photo.path
        assert os.path.exists(old_path)

        # Deuxième photo
        img2 = SimpleUploadedFile("photo2.png", get_test_image(format="PNG", color=(0, 255, 0)), content_type="image/png")
        res2 = self.client.patch("/api/accounts/me/", {"photo": img2}, format="multipart")
        assert res2.status_code == status.HTTP_200_OK

        self.user.refresh_from_db()
        new_path = self.user.photo.path
        assert new_path != old_path
        assert not os.path.exists(old_path), "L'ancien fichier de photo doit être supprimé du disque"
        assert os.path.exists(new_path), "Le nouveau fichier de photo doit exister sur le disque"

        # Nettoyage
        self.user.photo.delete(save=False)

    def test_suppression_photo(self):
        # 7. Suppression de photo
        img = SimpleUploadedFile("avatar.jpg", get_test_image(format="JPEG"), content_type="image/jpeg")
        self.client.patch("/api/accounts/me/", {"photo": img}, format="multipart")
        self.user.refresh_from_db()
        photo_path = self.user.photo.path
        assert os.path.exists(photo_path)

        res_delete = self.client.delete("/api/accounts/me/photo/")
        assert res_delete.status_code == status.HTTP_200_OK

        self.user.refresh_from_db()
        assert not self.user.photo
        assert not os.path.exists(photo_path)

    def test_changement_mot_de_passe_succes(self):
        # 8. Changement de mot de passe réussi
        res = self.client.post("/api/accounts/me/change-password/", {
            "ancien_mot_de_passe": "AncienMotDePasse123!",
            "nouveau_mot_de_passe": "NouveauSuperMotDePasse2026!",
            "confirmation": "NouveauSuperMotDePasse2026!"
        })
        assert res.status_code == status.HTTP_200_OK

        self.user.refresh_from_db()
        assert self.user.check_password("NouveauSuperMotDePasse2026!")

        # Vérifier connexion avec le nouveau mot de passe
        login_res = self.client.post("/api/auth/token/", {
            "username": "docteur_test",
            "password": "NouveauSuperMotDePasse2026!"
        })
        assert login_res.status_code == status.HTTP_200_OK

    def test_changement_mot_de_passe_ancien_incorrect(self):
        # 9. Ancien mot de passe incorrect et non concordance confirmation
        res_wrong_old = self.client.post("/api/accounts/me/change-password/", {
            "ancien_mot_de_passe": "FauxMotDePasse123",
            "nouveau_mot_de_passe": "NouveauMotDePasse2026!",
            "confirmation": "NouveauMotDePasse2026!"
        })
        assert res_wrong_old.status_code == status.HTTP_400_BAD_REQUEST
        assert "ancien_mot_de_passe" in res_wrong_old.data

        res_mismatch = self.client.post("/api/accounts/me/change-password/", {
            "ancien_mot_de_passe": "AncienMotDePasse123!",
            "nouveau_mot_de_passe": "NouveauMotDePasse2026!",
            "confirmation": "AutreChoseDifferente!"
        })
        assert res_mismatch.status_code == status.HTTP_400_BAD_REQUEST
        assert "confirmation" in res_mismatch.data

    def test_acces_non_authentifie_refuse(self):
        # 10. Accès sans authentification refusé
        anon_client = APIClient()

        assert anon_client.get("/api/accounts/me/").status_code == status.HTTP_401_UNAUTHORIZED
        assert anon_client.patch("/api/accounts/me/", {"first_name": "Test"}).status_code == status.HTTP_401_UNAUTHORIZED
        assert anon_client.delete("/api/accounts/me/photo/").status_code == status.HTTP_401_UNAUTHORIZED
        assert anon_client.post("/api/accounts/me/change-password/", {}).status_code == status.HTTP_401_UNAUTHORIZED

