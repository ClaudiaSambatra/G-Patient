from django.conf import settings
from django.db import models


class EntreeJournal(models.Model):
    """
    Trace d'une action sensible (module 10 du cahier des charges) : qui a fait quoi,
    sur quelle ressource, quand et depuis quelle adresse.
    Les entrées ne sont jamais modifiées ; seule la purge par ancienneté les supprime.
    """

    class Action(models.TextChoices):
        CONNEXION = 'CONNEXION', 'Connexion'
        ECHEC_CONNEXION = 'ECHEC_CONNEXION', 'Échec de connexion'
        MOT_DE_PASSE = 'MOT_DE_PASSE', 'Mot de passe oublié'
        CONSULTATION = 'CONSULTATION', 'Consultation'
        CREATION = 'CREATION', 'Création'
        MODIFICATION = 'MODIFICATION', 'Modification'
        SUPPRESSION = 'SUPPRESSION', 'Suppression'

    date = models.DateTimeField(auto_now_add=True, db_index=True)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='entrees_journal',
    )
    # Copie du nom et du rôle : la trace reste lisible même si le compte est supprimé ensuite
    nom_utilisateur = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    ressource = models.CharField(max_length=100, blank=True, db_index=True)
    objet_id = models.CharField(max_length=50, blank=True)
    methode = models.CharField(max_length=10)
    chemin = models.CharField(max_length=500)
    statut = models.PositiveSmallIntegerField()
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    agent = models.CharField("navigateur", max_length=255, blank=True)

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = "entrée du journal d'audit"
        verbose_name_plural = "journal d'audit"

    def __str__(self):
        return f"{self.date:%Y-%m-%d %H:%M} {self.nom_utilisateur or 'anonyme'} {self.action} {self.chemin}"

    @property
    def reussie(self):
        return self.statut < 400
