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
    photo = models.ImageField(upload_to="profils/", null=True, blank=True)

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
    date_absence = models.DateField(null=True, blank=True)

    @property
    def absent_aujourdhui(self):
        from django.utils import timezone
        return bool(self.date_absence and self.date_absence == timezone.localdate())

    def __str__(self):
        return f"Dr. {self.utilisateur.last_name} {self.utilisateur.first_name}"


class PasswordResetToken(models.Model):
    """
    Jeton et code OTP pour la réinitialisation sécurisée de mot de passe par email.
    """
    utilisateur = models.ForeignKey(
        Utilisateur, 
        on_delete=models.CASCADE, 
        related_name='password_reset_tokens'
    )
    code = models.CharField(max_length=6, db_index=True)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Jeton de réinitialisation'
        verbose_name_plural = 'Jetons de réinitialisation'

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and timezone.now() <= self.expires_at

    def __str__(self):
        return f"OTP({self.code}) pour {self.utilisateur.username}"

