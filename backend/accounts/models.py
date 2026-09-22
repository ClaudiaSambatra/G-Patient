from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """
    Utilisateur du système, avec un rôle métier.
    Couvre les acteurs définis au cahier des charges :
    Administrateur, Médecin, Secrétaire / Réceptionniste.
    (Le rôle "Patient" concerne le portail V2, optionnel.)
    """

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrateur'
        MEDECIN = 'MEDECIN', 'Médecin'
        SECRETAIRE = 'SECRETAIRE', 'Secrétaire / Réceptionniste'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SECRETAIRE)
    telephone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"


class Medecin(models.Model):
    """
    Profil étendu pour les utilisateurs ayant le rôle MEDECIN.
    """
    utilisateur = models.OneToOneField(
        Utilisateur, 
        on_delete=models.CASCADE, 
        related_name='medecin_profile',
        limit_choices_to={'role': 'MEDECIN'}
    )
    specialite = models.CharField(max_length=100, blank=True)
    numero_ordre = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Dr. {self.utilisateur.last_name} {self.utilisateur.first_name}"

