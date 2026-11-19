from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class HoraireMedecin(models.Model):
    """
    Module 15 — Plage de consultation hebdomadaire d'un médecin (ex. lundi 8h-12h).
    Un médecin sans aucune plage n'a pas de restriction d'horaire (comportement historique).
    """

    class Jour(models.IntegerChoices):
        LUNDI = 0, 'Lundi'
        MARDI = 1, 'Mardi'
        MERCREDI = 2, 'Mercredi'
        JEUDI = 3, 'Jeudi'
        VENDREDI = 4, 'Vendredi'
        SAMEDI = 5, 'Samedi'
        DIMANCHE = 6, 'Dimanche'

    medecin = models.ForeignKey('accounts.Medecin', on_delete=models.CASCADE, related_name='horaires')
    jour = models.PositiveSmallIntegerField(choices=Jour.choices)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()

    class Meta:
        ordering = ['medecin', 'jour', 'heure_debut']
        verbose_name = "Horaire de consultation"
        verbose_name_plural = "Horaires de consultation"

    def clean(self):
        if self.heure_debut and self.heure_fin and self.heure_debut >= self.heure_fin:
            raise ValidationError({'heure_fin': "L'heure de fin doit être après l'heure de début."})
        chevauchement = HoraireMedecin.objects.filter(
            medecin_id=self.medecin_id, jour=self.jour,
            heure_debut__lt=self.heure_fin, heure_fin__gt=self.heure_debut,
        ).exclude(pk=self.pk)
        if chevauchement.exists():
            raise ValidationError({'heure_debut': "Cette plage chevauche une plage existante le même jour."})

    def __str__(self):
        return f"{self.medecin} — {self.get_jour_display()} {self.heure_debut:%H:%M}-{self.heure_fin:%H:%M}"


class AbsenceMedecin(models.Model):
    """Absence planifiée d'un médecin (congé, formation…) du date_debut au date_fin inclus."""

    class Type(models.TextChoices):
        CONGE = 'CONGE', 'Congé'
        FORMATION = 'FORMATION', 'Formation'
        MALADIE = 'MALADIE', 'Maladie'
        AUTRE = 'AUTRE', 'Autre'

    medecin = models.ForeignKey('accounts.Medecin', on_delete=models.CASCADE, related_name='absences')
    date_debut = models.DateField()
    date_fin = models.DateField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.CONGE)
    motif = models.CharField(max_length=255, blank=True, default='')
    creee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='absences_declarees'
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_debut']
        verbose_name = "Absence de médecin"
        verbose_name_plural = "Absences de médecins"

    def clean(self):
        if self.date_debut and self.date_fin and self.date_debut > self.date_fin:
            raise ValidationError({'date_fin': "La date de fin doit être le même jour ou après la date de début."})

    def __str__(self):
        return f"{self.medecin} — {self.get_type_display()} du {self.date_debut:%d/%m/%Y} au {self.date_fin:%d/%m/%Y}"
