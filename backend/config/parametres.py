"""
Lecture sûre des paramètres d'adresse (?patient=12, ?date_debut=2026-11-19).

Sans contrôle, une valeur comme « abc » arrive telle quelle dans la requête SQL et provoque une
erreur 500 (relevé par le scan OWASP ZAP). Ces fonctions renvoient une erreur 400 explicite.
"""
from datetime import date

from rest_framework.exceptions import ValidationError

# Plus grande valeur d'une clé primaire BigAutoField (PostgreSQL bigint)
ID_MAX = 2 ** 63 - 1


def lire_identifiant(valeur):
    """Identifiant strictement positif, ou None si la valeur n'en est pas un (texte, nombre géant…)."""
    try:
        identifiant = int(str(valeur).strip())
    except (TypeError, ValueError):
        return None
    return identifiant if 0 < identifiant <= ID_MAX else None


def param_identifiant(request, nom):
    """Identifiant passé en paramètre d'adresse, None s'il est absent, erreur 400 s'il est invalide."""
    valeur = request.query_params.get(nom)
    if valeur in (None, ''):
        return None
    identifiant = lire_identifiant(valeur)
    if identifiant is None:
        raise ValidationError({nom: "Identifiant invalide."})
    return identifiant


def param_date(request, nom):
    """Date AAAA-MM-JJ passée en paramètre d'adresse, None si absente, erreur 400 si invalide."""
    valeur = request.query_params.get(nom)
    if valeur in (None, ''):
        return None
    try:
        return date.fromisoformat(valeur.strip()[:10])
    except ValueError:
        raise ValidationError({nom: "Date invalide (format attendu : AAAA-MM-JJ)."})
