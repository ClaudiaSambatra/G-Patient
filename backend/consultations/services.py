from django.utils import timezone
from appointments.models import RendezVous


def calculer_eligibilite_controle(patient, reference_date=None):
    """
    Calcule l'éligibilité d'un patient à un contrôle gratuit selon la règle métier :
    - Une consultation initiale payante (rendez_vous__type='CONSULTATION', rendez_vous__statut='TERMINE')
      doit avoir eu lieu dans les 15 derniers jours calendaires.
    - Retourne un dictionnaire explicite avec le statut (ELIGIBLE, NON_ELIGIBLE, A_VERIFIER)
      et l'explication détaillée des critères appliqués.
    """
    from .models import Consultation

    if reference_date is None:
        reference_date = timezone.now().date()
    elif hasattr(reference_date, 'date'):
        reference_date = reference_date.date()

    if not patient:
        return {
            'statut': 'A_VERIFIER',
            'est_gratuit': False,
            'consultation_origine_id': None,
            'delai_jours': None,
            'date_controle_recommandee': None,
            'explication': "Dossier patient non précisé. Vérification manuelle requise."
        }

    # Recherche de la dernière consultation terminée de type CONSULTATION
    derniere_consult = Consultation.objects.filter(
        patient=patient,
        rendez_vous__type=RendezVous.Type.CONSULTATION,
        rendez_vous__statut=RendezVous.Statut.TERMINE
    ).order_by('-date_consultation', '-id').first()

    if not derniere_consult:
        return {
            'statut': 'NON_ELIGIBLE',
            'est_gratuit': False,
            'consultation_origine_id': None,
            'delai_jours': None,
            'date_controle_recommandee': None,
            'explication': "Aucune consultation payante terminée n'a été trouvée pour ce patient. Le contrôle n'est pas gratuit."
        }

    consult_date = timezone.localtime(derniere_consult.date_consultation).date() if timezone.is_aware(derniere_consult.date_consultation) else derniere_consult.date_consultation.date()
    jours_ecoules = (reference_date - consult_date).days

    recommandee_str = derniere_consult.date_controle_recommandee.strftime('%d/%m/%Y') if derniere_consult.date_controle_recommandee else None

    # Situation incohérente dans le temps
    if jours_ecoules < 0:
        return {
            'statut': 'A_VERIFIER',
            'est_gratuit': False,
            'consultation_origine_id': derniere_consult.id,
            'delai_jours': jours_ecoules,
            'date_controle_recommandee': recommandee_str,
            'explication': f"La date de référence ({reference_date:%d/%m/%Y}) est antérieure à la date de consultation ({consult_date:%d/%m/%Y}). Situation à vérifier."
        }

    info_rec = f" (Date recommandée par le praticien : {recommandee_str})" if recommandee_str else ""

    if jours_ecoules <= 15:
        # Vérifions si un contrôle précédent a déjà été consommé pour cette consultation d'origine
        controle_existant = RendezVous.objects.filter(
            consultation_origine=derniere_consult,
            type=RendezVous.Type.CONTROLE
        ).exclude(statut=RendezVous.Statut.ANNULE).first()

        if controle_existant:
            return {
                'statut': 'A_VERIFIER',
                'est_gratuit': False,
                'consultation_origine_id': derniere_consult.id,
                'delai_jours': jours_ecoules,
                'date_controle_recommandee': recommandee_str,
                'explication': f"Dernière consultation payante le {consult_date:%d/%m/%Y} (il y a {jours_ecoules} jour(s)). Un contrôle a déjà été enregistré pour celle-ci (RDV #{controle_existant.id}). Situation à vérifier.{info_rec}"
            }

        return {
            'statut': 'ELIGIBLE',
            'est_gratuit': True,
            'consultation_origine_id': derniere_consult.id,
            'delai_jours': jours_ecoules,
            'date_controle_recommandee': recommandee_str,
            'explication': f"Éligible au contrôle gratuit : consultation payante initiale réalisée le {consult_date:%d/%m/%Y} (il y a {jours_ecoules} jour(s), délai <= 15 jours respecté).{info_rec}"
        }
    else:
        return {
            'statut': 'NON_ELIGIBLE',
            'est_gratuit': False,
            'consultation_origine_id': derniere_consult.id,
            'delai_jours': jours_ecoules,
            'date_controle_recommandee': recommandee_str,
            'explication': f"Délai dépassé : la dernière consultation payante date du {consult_date:%d/%m/%Y} ({jours_ecoules} jours écoulés, maximum 15 jours autorisés). Le passage donne lieu à une consultation standard.{info_rec}"
        }
