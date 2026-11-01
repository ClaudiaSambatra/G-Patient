from django.utils import timezone
from appointments.models import RendezVous


def calculer_eligibilite_controle(patient, reference_date=None, consultation_id=None):
    """
    Calcule l'éligibilité d'un patient à un contrôle / suivi gratuit selon la règle métier :
    - Une consultation initiale payante (rendez_vous__type='CONSULTATION', rendez_vous__statut='TERMINE')
      doit avoir eu lieu dans les 15 derniers jours calendaires (15ème jour inclus).
    - Un seul suivi gratuit est autorisé par consultation initiale.
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
            'date_suivi_recommandee': None,
            'suivi_recommande': False,
            'motif_suivi': '',
            'explication': "Dossier patient non précisé. Vérification manuelle requise."
        }

    # Si une consultation spécifique est demandée
    if consultation_id:
        consultation = Consultation.objects.filter(
            pk=consultation_id,
            patient=patient,
            rendez_vous__type=RendezVous.Type.CONSULTATION,
            rendez_vous__statut=RendezVous.Statut.TERMINE
        ).first()
        if not consultation:
            return {
                'statut': 'NON_ELIGIBLE',
                'est_gratuit': False,
                'consultation_origine_id': None,
                'delai_jours': None,
                'date_controle_recommandee': None,
                'date_suivi_recommandee': None,
                'suivi_recommande': False,
                'motif_suivi': '',
                'explication': "La consultation spécifiée est introuvable ou n'est pas une consultation payante terminée."
            }
        cible_consult = consultation
    else:
        # Recherche par défaut : privilégier la consultation la plus récente avec suivi recommandé et éligible (< 15j)
        eligible_candidates = Consultation.objects.filter(
            patient=patient,
            rendez_vous__type=RendezVous.Type.CONSULTATION,
            rendez_vous__statut=RendezVous.Statut.TERMINE
        ).order_by('-date_consultation', '-id')

        # Trouver la première consultation non encore suivie et dans les 15 jours
        cible_consult = None
        for c in eligible_candidates:
            c_date = timezone.localtime(c.date_consultation).date() if timezone.is_aware(c.date_consultation) else c.date_consultation.date()
            if 0 <= (reference_date - c_date).days <= 15:
                # Vérifier si déjà suivie
                deja_suivie = RendezVous.objects.filter(
                    consultation_origine=c,
                    type=RendezVous.Type.CONTROLE
                ).exclude(statut=RendezVous.Statut.ANNULE).exists()
                if not deja_suivie:
                    cible_consult = c
                    break

        # Si aucune éligible trouvée, prendre la toute dernière pour afficher le motif de non-éligibilité
        if not cible_consult:
            cible_consult = eligible_candidates.first()

    if not cible_consult:
        return {
            'statut': 'NON_ELIGIBLE',
            'est_gratuit': False,
            'consultation_origine_id': None,
            'delai_jours': None,
            'date_controle_recommandee': None,
            'date_suivi_recommandee': None,
            'suivi_recommande': False,
            'motif_suivi': '',
            'explication': "Aucune consultation payante terminée n'a été trouvée pour ce patient. Le suivi ne peut pas être pris en charge gratuitement."
        }

    consult_date = timezone.localtime(cible_consult.date_consultation).date() if timezone.is_aware(cible_consult.date_consultation) else cible_consult.date_consultation.date()
    jours_ecoules = (reference_date - consult_date).days

    date_rec = cible_consult.date_suivi_recommandee or cible_consult.date_controle_recommandee
    recommandee_str = date_rec.strftime('%d/%m/%Y') if date_rec else None

    # Situation incohérente dans le temps
    if jours_ecoules < 0:
        return {
            'statut': 'A_VERIFIER',
            'est_gratuit': False,
            'consultation_origine_id': cible_consult.id,
            'delai_jours': jours_ecoules,
            'date_controle_recommandee': recommandee_str,
            'date_suivi_recommandee': date_rec.isoformat() if date_rec else None,
            'suivi_recommande': cible_consult.suivi_recommande,
            'motif_suivi': cible_consult.motif_suivi,
            'explication': f"La date de référence ({reference_date:%d/%m/%Y}) est antérieure à la date de consultation ({consult_date:%d/%m/%Y}). Situation à vérifier."
        }

    info_rec = f" (Date recommandée par le praticien : {recommandee_str})" if recommandee_str else ""

    if jours_ecoules <= 15:
        # Vérifions si un contrôle précédent a déjà été consommé pour cette consultation d'origine
        controle_existant = RendezVous.objects.filter(
            consultation_origine=cible_consult,
            type=RendezVous.Type.CONTROLE
        ).exclude(statut=RendezVous.Statut.ANNULE).first()

        if controle_existant:
            return {
                'statut': 'A_VERIFIER',
                'est_gratuit': False,
                'consultation_origine_id': cible_consult.id,
                'delai_jours': jours_ecoules,
                'date_controle_recommandee': recommandee_str,
                'date_suivi_recommandee': date_rec.isoformat() if date_rec else None,
                'suivi_recommande': cible_consult.suivi_recommande,
                'motif_suivi': cible_consult.motif_suivi,
                'explication': f"Situation à vérifier : dernière consultation payante le {consult_date:%d/%m/%Y} (il y a {jours_ecoules} jour(s)). Un suivi gratuit a déjà été enregistré pour celle-ci (RDV #{controle_existant.id}). Le patient doit être orienté vers une consultation normale."
            }

        return {
            'statut': 'ELIGIBLE',
            'est_gratuit': True,
            'consultation_origine_id': cible_consult.id,
            'delai_jours': jours_ecoules,
            'date_controle_recommandee': recommandee_str,
            'date_suivi_recommandee': date_rec.isoformat() if date_rec else None,
            'suivi_recommande': cible_consult.suivi_recommande,
            'motif_suivi': cible_consult.motif_suivi,
            'medecin_initial_id': cible_consult.medecin.id if cible_consult.medecin else None,
            'medecin_initial_nom': f"Dr. {cible_consult.medecin.last_name} {cible_consult.medecin.first_name}".strip() if cible_consult.medecin else "Praticien",
            'explication': f"Éligible au contrôle gratuit / suivi : consultation payante initiale réalisée le {consult_date:%d/%m/%Y} (il y a {jours_ecoules} jour(s), délai <= 15 jours respecté).{info_rec}"
        }
    else:
        return {
            'statut': 'NON_ELIGIBLE',
            'est_gratuit': False,
            'consultation_origine_id': cible_consult.id,
            'delai_jours': jours_ecoules,
            'date_controle_recommandee': recommandee_str,
            'date_suivi_recommandee': date_rec.isoformat() if date_rec else None,
            'suivi_recommande': cible_consult.suivi_recommande,
            'motif_suivi': cible_consult.motif_suivi,
            'medecin_initial_id': cible_consult.medecin.id if cible_consult.medecin else None,
            'medecin_initial_nom': f"Dr. {cible_consult.medecin.last_name} {cible_consult.medecin.first_name}".strip() if cible_consult.medecin else "Praticien",
            'explication': f"Délai dépassé (plus de 15 jours) : la consultation initiale date du {consult_date:%d/%m/%Y} ({jours_ecoules} jours écoulés, maximum 15 jours autorisés). Le passage donne lieu à une consultation standard.{info_rec}"
        }


def lister_consultations_suivi_possibles(patient, reference_date=None):
    """
    Retourne la liste des consultations antérieures d'un patient avec leur statut d'éligibilité
    au suivi gratuit (15 jours, médecin initial, date de suivi recommandée, motif de suivi).
    Permet à la secrétaire de visualiser l'historique complet et de sélectionner la consultation d'origine.
    """
    from .models import Consultation
    if reference_date is None:
        reference_date = timezone.now().date()
    elif hasattr(reference_date, 'date'):
        reference_date = reference_date.date()

    if not patient:
        return []

    consultations = Consultation.objects.filter(
        patient=patient,
        rendez_vous__type=RendezVous.Type.CONSULTATION,
        rendez_vous__statut=RendezVous.Statut.TERMINE
    ).select_related('medecin', 'rendez_vous').order_by('-date_consultation')

    resultats = []
    for c in consultations:
        consult_date = timezone.localtime(c.date_consultation).date() if timezone.is_aware(c.date_consultation) else c.date_consultation.date()
        jours_ecoules = (reference_date - consult_date).days
        date_rec = c.date_suivi_recommandee or c.date_controle_recommandee
        recommandee_str = date_rec.strftime('%d/%m/%Y') if date_rec else None

        # Vérification si un contrôle a déjà été consommé pour cette consultation
        suivi_existant = RendezVous.objects.filter(
            consultation_origine=c,
            type=RendezVous.Type.CONTROLE
        ).exclude(statut=RendezVous.Statut.ANNULE).first()

        est_eligible = (0 <= jours_ecoules <= 15) and (suivi_existant is None)

        medecin_nom = f"Dr. {c.medecin.last_name} {c.medecin.first_name}".strip() if c.medecin else "Praticien inconnu"
        # Vérifier si le médecin est absent aujourd'hui
        medecin_profile = getattr(c.medecin, 'profil_medecin', None)
        medecin_absent = getattr(medecin_profile, 'absent_aujourdhui', False) if medecin_profile else False

        statut_libelle = "ELIGIBLE" if est_eligible else ("DEJA_SUIVI" if suivi_existant else "DELAI_DEPASSE")

        if est_eligible:
            explication = f"Éligible au suivi gratuit (J+{jours_ecoules}, consultation du {consult_date:%d/%m/%Y})."
        elif suivi_existant:
            explication = f"Suivi déjà effectué pour cette consultation (RDV #{suivi_existant.id} du {suivi_existant.date_heure:%d/%m/%Y})."
        elif jours_ecoules > 15:
            explication = f"Délai des 15 jours dépassé ({jours_ecoules} jours écoulés depuis le {consult_date:%d/%m/%Y})."
        else:
            explication = "Non éligible."

        resultats.append({
            'id': c.id,
            'date_consultation': c.date_consultation.isoformat(),
            'date_consultation_formatee': consult_date.strftime('%d/%m/%Y'),
            'jours_ecoules': jours_ecoules,
            'medecin_id': c.medecin.id if c.medecin else None,
            'medecin_nom': medecin_nom,
            'medecin_absent_aujourdhui': medecin_absent,
            'suivi_recommande': c.suivi_recommande or bool(date_rec),
            'date_suivi_recommandee': date_rec.isoformat() if date_rec else None,
            'date_suivi_recommandee_formatee': recommandee_str,
            'motif_suivi': c.motif_suivi,
            'motif': c.motif,
            'est_eligible': est_eligible,
            'statut_eligibilite': statut_libelle,
            'explication': explication,
            'suivi_existant_rdv_id': suivi_existant.id if suivi_existant else None
        })

    return resultats
