from django.db import models


class Patient(models.Model):
    class GroupeSanguin(models.TextChoices):
        A_POS = 'A+', 'A+'
        A_NEG = 'A-', 'A-'
        B_POS = 'B+', 'B+'
        B_NEG = 'B-', 'B-'
        AB_POS = 'AB+', 'AB+'
        AB_NEG = 'AB-', 'AB-'
        O_POS = 'O+', 'O+'
        O_NEG = 'O-', 'O-'

    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField()
    contact = models.CharField(max_length=100, help_text="Téléphone et/ou courriel")
    adresse = models.TextField(blank=True)
    antecedents = models.TextField(blank=True, help_text="Antécédents médicaux")
    allergies = models.TextField(blank=True)
    groupe_sanguin = models.CharField(
        max_length=3, choices=GroupeSanguin.choices, blank=True
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom', 'prenom']

    def __str__(self):
        return f"{self.nom} {self.prenom}"
