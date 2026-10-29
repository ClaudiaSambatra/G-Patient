from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from consultations.models import Consultation


class Ordonnance(models.Model):
    """Module 5 — Prescriptions / ordonnances médicales."""

    class Statut(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        MODIFIEE = 'MODIFIEE', 'Modifiée'
        ANNULEE = 'ANNULEE', 'Annulée'

    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.CASCADE,
        related_name='ordonnances'
    )
    numero = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        editable=False,
        db_index=True,
        verbose_name="Numéro d'ordonnance"
    )
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.ACTIVE
    )

    # Champs textuels conservés pour rétro-compatibilité
    medicaments = models.TextField(blank=True, default='', help_text="Liste des médicaments (texte global)")
    posologie = models.TextField(blank=True, default='', help_text="Posologie globale")
    duree = models.CharField(max_length=100, blank=True, default='', help_text="Durée globale")

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    @classmethod
    def generer_numero(cls, annee=None):
        """Génère un numéro d'ordonnance unique et atomique au format ORD-YYYY-XXXXX."""
        if annee is None:
            annee = timezone.now().year
        prefix = f"ORD-{annee}-"
        with transaction.atomic():
            dernier = cls.objects.select_for_update().filter(
                numero__startswith=prefix
            ).order_by('-numero').first()

            if dernier and dernier.numero:
                try:
                    num_seq = int(dernier.numero.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    num_seq = 1
            else:
                num_seq = 1

            while True:
                candidat = f"{prefix}{num_seq:05d}"
                if not cls.objects.filter(numero=candidat).exists():
                    return candidat
                num_seq += 1

    def save(self, *args, **kwargs):
        if not self.numero:
            with transaction.atomic():
                from django.db import connection
                if connection.vendor == 'postgresql':
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT pg_advisory_xact_lock(742199);")
                self.numero = self.generer_numero()
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"Ordonnance {self.numero or f'#{self.pk}'} — {self.consultation}"


class LigneOrdonnance(models.Model):
    """Ligne structurée de prescription pour un médicament spécifique."""

    ordonnance = models.ForeignKey(
        Ordonnance,
        on_delete=models.CASCADE,
        related_name='lignes'
    )
    medicament = models.CharField(max_length=255, verbose_name="Nom du médicament")
    dosage = models.CharField(max_length=100, blank=True, default='', verbose_name="Dosage / Concentration")
    forme = models.CharField(max_length=100, blank=True, default='', verbose_name="Forme pharmaceutique")
    dose_par_prise = models.CharField(max_length=100, blank=True, default='', verbose_name="Dose par prise")
    voie_administration = models.CharField(max_length=100, blank=True, default='Orale', verbose_name="Voie d'administration")
    frequence = models.CharField(max_length=150, blank=True, default='', verbose_name="Fréquence de prise")
    duree = models.CharField(max_length=100, blank=True, default='', verbose_name="Durée du traitement")
    instructions = models.TextField(blank=True, default='', verbose_name="Instructions particulières")
    ordre = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['ordre', 'id']

    def __str__(self):
        desc = self.medicament
        if self.dosage:
            desc += f" {self.dosage}"
        if self.forme:
            desc += f" ({self.forme})"
        return desc


class OrdonnanceHistorique(models.Model):
    """Audit trail médico-légal des corrections apportées à une ordonnance."""

    ordonnance = models.ForeignKey(
        Ordonnance,
        on_delete=models.CASCADE,
        related_name='historique'
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='ordonnances_modifiees'
    )
    date_modification = models.DateTimeField(auto_now_add=True)
    motif_correction = models.TextField(verbose_name="Motif obligatoire de la modification")
    champs_modifies = models.JSONField(default=list, blank=True)
    anciennes_lignes = models.JSONField(default=list, blank=True)
    nouvelles_lignes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-date_modification']

    def __str__(self):
        return f"Correction de {self.ordonnance} par {self.auteur} le {self.date_modification:%d/%m/%Y %H:%M}"
