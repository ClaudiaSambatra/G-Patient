from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from patients.models import Patient
from consultations.models import Consultation


class DemandeExamen(models.Model):
    """Module de prescription d'examens médicaux (Laboratoire & Imagerie externe)."""

    class Statut(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        MODIFIEE = 'MODIFIEE', 'Modifiée'
        ANNULEE = 'ANNULEE', 'Annulée'

    consultation = models.ForeignKey(
        Consultation,
        on_delete=models.PROTECT,
        related_name='demandes_examens',
        verbose_name="Consultation associée"
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.PROTECT,
        related_name='demandes_examens',
        verbose_name="Patient"
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='demandes_examens_prescrites',
        verbose_name="Médecin prescripteur"
    )
    numero = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        editable=False,
        db_index=True,
        verbose_name="Numéro de demande"
    )
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.ACTIVE
    )
    renseignements_cliniques = models.TextField(
        blank=True,
        default='',
        help_text="Renseignements cliniques indicatifs pour le biologiste / radiologue externe"
    )

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = "Demande d'examens"
        verbose_name_plural = "Demandes d'examens"

    @classmethod
    def generer_numero(cls, annee=None):
        """Génère un numéro unique et atomique au format EXAM-YYYY-XXXXX."""
        if annee is None:
            now = timezone.now()
            annee = timezone.localtime(now).year if timezone.is_aware(now) else now.year
        prefix = f"EXAM-{annee}-"
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
                        # Verrou advisory transactionnel dédié aux examens pour sérialiser la génération
                        cursor.execute("SELECT pg_advisory_xact_lock(853210);")
                self.numero = self.generer_numero()
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"Demande {self.numero or f'#{self.pk}'} — {self.patient}"


class LigneDemandeExamen(models.Model):
    """Ligne d'examen médical prescrit (analyse de biologie ou imagerie médicale)."""

    class Categorie(models.TextChoices):
        BIOLOGIE = 'BIOLOGIE', 'Analyse biologique / Laboratoire'
        IMAGERIE = 'IMAGERIE', 'Imagerie médicale / Radiologie'
        AUTRE = 'AUTRE', 'Autre examen / Exploration fonctionnelle'

    demande = models.ForeignKey(
        DemandeExamen,
        on_delete=models.CASCADE,
        related_name='lignes'
    )
    nom_examen = models.CharField(max_length=255, verbose_name="Nom de l'examen")
    categorie = models.CharField(
        max_length=50,
        choices=Categorie.choices,
        default=Categorie.BIOLOGIE,
        verbose_name="Catégorie d'examen"
    )
    instructions = models.TextField(
        blank=True,
        default='',
        verbose_name="Instructions / Précautions cliniques"
    )
    ordre = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['ordre', 'id']
        verbose_name = "Examen prescrit"
        verbose_name_plural = "Examens prescrits"

    def __str__(self):
        return f"{self.nom_examen} ({self.get_categorie_display()})"


class DemandeExamenHistorique(models.Model):
    """Audit trail médico-légal des corrections apportées à une demande d'examens."""

    demande = models.ForeignKey(
        DemandeExamen,
        on_delete=models.CASCADE,
        related_name='historique'
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='demandes_examens_modifiees'
    )
    date_modification = models.DateTimeField(auto_now_add=True)
    motif_correction = models.TextField(verbose_name="Motif obligatoire de la modification")
    champs_modifies = models.JSONField(default=list, blank=True)
    anciennes_lignes = models.JSONField(default=list, blank=True)
    nouvelles_lignes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-date_modification']
        verbose_name = "Historique de modification"
        verbose_name_plural = "Historiques de modifications"

    def __str__(self):
        return f"Correction de {self.demande} par {self.auteur} le {self.date_modification:%d/%m/%Y %H:%M}"
