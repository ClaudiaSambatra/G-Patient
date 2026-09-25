from datetime import date
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

    class Sexe(models.TextChoices):
        MASCULIN = 'M', 'Masculin'
        FEMININ = 'F', 'Féminin'

    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    sexe = models.CharField(
        max_length=1, choices=Sexe.choices, default=Sexe.MASCULIN
    )
    date_naissance = models.DateField()
    contact = models.CharField(
        max_length=100, help_text="Téléphone et/ou courriel"
    )
    adresse = models.TextField(blank=True)
    antecedents = models.TextField(blank=True, help_text="Antécédents médicaux")
    allergies = models.TextField(blank=True)
    groupe_sanguin = models.CharField(
        max_length=3, choices=GroupeSanguin.choices, blank=True, null=True
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom', 'prenom']

    def __str__(self):
        return f"{self.nom} {self.prenom}"

    @property
    def age(self):
        """Calcule l'âge en années révolues à partir de la date de naissance."""
        if not self.date_naissance:
            return None
        today = date.today()
        # Retire 1 si l'anniversaire n'a pas encore eu lieu cette année
        return (
            today.year
            - self.date_naissance.year
            - (
                (today.month, today.day)
                < (self.date_naissance.month, self.date_naissance.day)
            )
        )


class DocumentMedical(models.Model):
    """Module 6 — Documents médicaux (pièces jointes)."""
    
    patient = models.ForeignKey(
        Patient, 
        on_delete=models.CASCADE, 
        related_name="documents"
    )
    nom = models.CharField(max_length=255, help_text="Nom du document (ex: Analyse sang)")
    fichier = models.FileField(upload_to="documents_patients/%Y/%m/")
    type_document = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Ex: Imagerie, Analyse de laboratoire, Ordonnance scannée"
    )
    date_depot = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date_depot']
        verbose_name = "Document Médical"
        verbose_name_plural = "Documents Médicaux"
        
    def __str__(self):
        return f"{self.nom} - {self.patient}"