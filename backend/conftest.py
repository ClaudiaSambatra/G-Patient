import pytest


@pytest.fixture(autouse=True)
def hachage_rapide_des_mots_de_passe(settings):
    """
    Tests uniquement : MD5 au lieu de PBKDF2 pour accélérer la création des comptes de test.
    Ce réglage n'existe que pendant pytest, jamais dans settings.py (relevé par SonarCloud).
    """
    settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
