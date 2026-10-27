from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from patients.models import Patient
from appointments.models import RendezVous


class Consultation(models.Model):
    """Module 4 — Gestion des consultations médicales."""

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="consultations"
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        limit_choices_to={'role': 'MEDECIN'},
        related_name="consultations"
    )
    rendez_vous = models.OneToOneField(
        RendezVous,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation"
    )

    date_consultation = models.DateTimeField(default=timezone.now)
    motif = models.TextField()
    observations = models.TextField(help_text="Observations cliniques et examen du praticien")
    diagnostic = models.TextField()
    compte_rendu = models.TextField(blank=True, default='', help_text="Compte rendu médical de la consultation")

    date_controle_recommandee = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de contrôle recommandée",
        help_text="Date recommandée par le praticien pour une visite de contrôle (indicatif, sans RDV auto)"
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_consultation']

    def __str__(self):
        return f"Consultation de {self.patient} le {self.date_consultation:%d/%m/%Y}"


class ConstantesVitales(models.Model):
    """Constantes physiologiques mesurées lors d'une consultation."""

    consultation = models.OneToOneField(
        Consultation,
        on_delete=models.CASCADE,
        related_name="constantes"
    )
    temperature = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="Température (°C)",
        validators=[
            MinValueValidator(Decimal('30.0'), message="La température doit être d'au moins 30.0 °C"),
            MaxValueValidator(Decimal('45.0'), message="La température ne peut excéder 45.0 °C")
        ]
    )
    poids = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Poids (kg)",
        validators=[
            MinValueValidator(Decimal('0.5'), message="Le poids doit être d'au moins 0.5 kg"),
            MaxValueValidator(Decimal('500.0'), message="Le poids ne peut excéder 500 kg")
        ]
    )
    taille = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="Taille (cm)",
        validators=[
            MinValueValidator(Decimal('20.0'), message="La taille doit être d'au moins 20.0 cm"),
            MaxValueValidator(Decimal('300.0'), message="La taille ne peut excéder 300.0 cm")
        ]
    )
    tension_arterielle = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="Tension artérielle",
        validators=[
            RegexValidator(
                regex=r'^\d{1,3}/\d{1,3}$',
                message="La tension artérielle doit être au format '120/80' ou '12/8'."
            )
        ],
        help_text="Format: Systolique/Diastolique, ex: 120/80"
    )
    frequence_cardiaque = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Fréquence cardiaque (bpm)",
        validators=[
            MinValueValidator(20, message="La fréquence cardiaque doit être d'au moins 20 bpm"),
            MaxValueValidator(300, message="La fréquence cardiaque ne peut excéder 300 bpm")
        ]
    )
    date_prise = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Constantes vitales"
        verbose_name_plural = "Constantes vitales"

    def __str__(self):
        return f"Constantes de {self.consultation}"


class ConsultationHistorique(models.Model):
    """Traçabilité et audit trail des modifications apportées à une consultation."""

    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name="historique"
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="modifications_consultations"
    )
    date_modification = models.DateTimeField(auto_now_add=True)
    motif_correction = models.TextField(
        help_text="Motif médical ou administratif justifiant obligatoirement la modification"
    )
    champs_modifies = models.JSONField(
        default=list,
        help_text="Liste des champs modifiés"
    )
    anciennes_valeurs = models.JSONField(
        default=dict,
        help_text="Valeurs des champs avant modification"
    )
    nouvelles_valeurs = models.JSONField(
        default=dict,
        help_text="Nouvelles valeurs enregistrées"
    )

    class Meta:
        ordering = ['-date_modification']
        verbose_name = "Historique de consultation"
        verbose_name_plural = "Historiques de consultations"

    def __str__(self):
        return f"Correction de {self.consultation.id} le {self.date_modification:%d/%m/%Y %H:%M} par {self.auteur}"


class RetourSansRendezVous(models.Model):
    """
    Signalement administratif d'un patient se présentant sans rendez-vous.
    Permet à la secrétaire d'enregistrer l'accueil et de vérifier l'éligibilité au contrôle
    sans avoir accès aux données médicales sensibles (observations, diagnostic, compte-rendu).
    """

    class Statut(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente'
        PRIS_EN_CHARGE = 'PRIS_EN_CHARGE', 'Pris en charge'
        ANNULE = 'ANNULE', 'Annulé'

    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="retours_sans_rdv"
    )
    medecin_souhaite = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'MEDECIN'},
        related_name="retours_patients_attribues"
    )
    signale_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="retours_sans_rdv_signales"
    )
    date_signalement = models.DateTimeField(default=timezone.now)
    motif_administratif = models.TextField(
        blank=True,
        default='',
        help_text="Motif administratif du passage (sans information clinique confidentielle)"
    )
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE
    )
    rendez_vous_cree = models.OneToOneField(
        RendezVous,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="retour_sans_rdv_origine",
        help_text="Rendez-vous immédiat créé par la secrétaire (Option A)"
    )

    class Meta:
        ordering = ['-date_signalement']
        verbose_name = "Retour sans rendez-vous"
        verbose_name_plural = "Retours sans rendez-vous"

    def __str__(self):
        return f"Retour sans RDV : {self.patient} ({self.date_signalement:%d/%m/%Y %H:%M})"
