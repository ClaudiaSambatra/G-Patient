import logging
import re

from django.conf import settings

from .models import EntreeJournal

logger = logging.getLogger(__name__)

Action = EntreeJournal.Action

# Préfixes de l'API dont la simple lecture est tracée : ce sont les données de santé
RESSOURCES_MEDICALES = ('patients', 'consultations', 'prescriptions', 'examinations')

# Adresses jamais tracées : supervision, connexion (tracée par le sérialiseur, qui connaît
# le compte visé), renouvellement du jeton (une ligne toutes les quelques minutes par onglet)
CHEMINS_IGNORES = (
    '/api/health/', '/api/metrics/', '/api/auth/token/', '/api/auth/token/refresh/',
    '/api/schema/', '/api/docs/',
)
CHEMINS_MOT_DE_PASSE = ('/api/auth/request-otp/', '/api/auth/reset-password/')

ACTIONS_ECRITURE = {
    'PUT': Action.MODIFICATION,
    'PATCH': Action.MODIFICATION,
    'DELETE': Action.SUPPRESSION,
}

IDENTIFIANT = re.compile(r'^\d+$')


def decouper_chemin(chemin):
    """
    /api/patients/12/ → ('patients', '12') ; /api/stocks/medicaments/4/reception/ → ('stocks/medicaments', '4').
    La ressource est la suite de segments qui précède le premier identifiant numérique.
    """
    segments = [s for s in chemin.split('/') if s][1:]  # sans « api »
    ressource = []
    for segment in segments:
        if IDENTIFIANT.match(segment):
            return '/'.join(ressource), segment
        ressource.append(segment)
    return '/'.join(ressource), ''


def adresse_client(request):
    # Derrière Nginx ou Render, le dernier proxy ajoute l'adresse qu'il a vue en fin de
    # X-Forwarded-For ; les valeurs précédentes viennent du client et peuvent être falsifiées.
    # Sans proxy (développement), l'en-tête entier serait falsifiable : on l'ignore
    transmise = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if transmise and settings.AUDIT_DERRIERE_PROXY:
        return transmise.split(',')[-1].strip() or None
    return request.META.get('REMOTE_ADDR') or None


def action_requete(request):
    """Action à tracer pour une requête de l'API, ou None si elle n'a pas d'intérêt pour l'audit."""
    chemin = request.path
    if not chemin.startswith('/api/') or chemin in CHEMINS_IGNORES:
        return None
    if chemin in CHEMINS_MOT_DE_PASSE:
        return Action.MOT_DE_PASSE if request.method == 'POST' else None
    # Les requêtes anonymes sont refusées par l'API : les tracer remplirait le journal
    # de bruit sans rien apprendre de plus que les journaux du serveur
    if not getattr(request, 'user', None) or not request.user.is_authenticated:
        return None

    ressource, objet_id = decouper_chemin(chemin)
    if request.method in ACTIONS_ECRITURE:
        return ACTIONS_ECRITURE[request.method]
    if request.method == 'POST':
        # POST sur un objet existant = action métier qui le modifie (annulation, réception…)
        return Action.MODIFICATION if objet_id else Action.CREATION
    if request.method == 'GET' and ressource.split('/')[0] in RESSOURCES_MEDICALES:
        # Lecture d'un dossier, ou d'une liste restreinte à un patient
        if objet_id or 'patient' in request.GET:
            return Action.CONSULTATION
    return None


def enregistrer(request, action, statut, utilisateur=None, nom_utilisateur=''):
    """Ajoute une entrée ; une panne du journal ne doit jamais faire échouer la requête."""
    try:
        if utilisateur is None and getattr(request, 'user', None) and request.user.is_authenticated:
            utilisateur = request.user
        ressource, objet_id = decouper_chemin(request.path)
        EntreeJournal.objects.create(
            utilisateur=utilisateur,
            nom_utilisateur=(utilisateur.username if utilisateur else nom_utilisateur)[:150],
            role=getattr(utilisateur, 'role', '') or '',
            action=action,
            ressource=ressource[:100],
            objet_id=objet_id,
            methode=request.method,
            chemin=request.get_full_path()[:500],
            statut=statut,
            adresse_ip=adresse_client(request),
            agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        )
    except Exception:
        logger.exception("Journal d'audit : enregistrement impossible")
