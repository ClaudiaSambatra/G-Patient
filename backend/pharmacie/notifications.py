import logging

from django.conf import settings
from django.core.mail import send_mail

from accounts.models import Utilisateur
from .models import StockMedicament

logger = logging.getLogger(__name__)


def destinataires_stock():
    """Secrétaires et administrateurs actifs ayant une adresse e-mail : ce sont eux qui gèrent le stock."""
    return list(
        Utilisateur.objects.filter(
            is_active=True,
            role__in=[Utilisateur.Role.SECRETAIRE, Utilisateur.Role.ADMIN],
        ).exclude(email='').values_list('email', flat=True)
    )


def notifier_seuil_atteint(medicament_id):
    """E-mail envoyé une seule fois, au moment où un médicament passe à ou sous son seuil d'alerte."""
    med = StockMedicament.objects.filter(pk=medicament_id).first()
    destinataires = destinataires_stock()
    if not med or not destinataires:
        return

    if med.quantite == 0:
        sujet = f"[Pharmacie] Rupture de stock : {med}"
        etat = "est en rupture de stock"
    else:
        sujet = f"[Pharmacie] Stock bas : {med}"
        etat = f"n'a plus que {med.quantite} {med.unite}(s) en stock"

    message = (
        f"Bonjour,\n\n"
        f"Le médicament {med} {etat} (seuil d'alerte : {med.seuil_alerte}).\n"
        f"Pensez à passer commande, puis à enregistrer la réception dans « Pharmacie & stocks ».\n\n"
        f"{settings.FRONTEND_URL.rstrip('/')}/stocks\n\n"
        f"Gestion des patients — EJ Logiciel"
    )
    try:
        send_mail(sujet, message, settings.DEFAULT_FROM_EMAIL, destinataires, fail_silently=False)
    except Exception:
        # Une panne SMTP ne doit jamais bloquer un encaissement ou un inventaire.
        logger.exception("Échec de l'envoi de l'alerte de stock pour %s", med)
