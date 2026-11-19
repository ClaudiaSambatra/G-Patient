from django.utils import timezone

from .models import AbsenceMedecin, HoraireMedecin

STATUTS_ACTIFS = ('PLANIFIE', 'CONFIRME')


def date_locale(dt):
    return timezone.localtime(dt).date() if timezone.is_aware(dt) else dt.date()


def absence_du_jour(medecin, jour):
    """Absence couvrant ce jour (absence planifiée, ou bouton « absent aujourd'hui »), sinon None."""
    absence = AbsenceMedecin.objects.filter(medecin=medecin, date_debut__lte=jour, date_fin__gte=jour).first()
    if absence:
        return absence
    if medecin.date_absence and medecin.date_absence == jour:
        return AbsenceMedecin(medecin=medecin, date_debut=jour, date_fin=jour,
                              type=AbsenceMedecin.Type.AUTRE, motif="Absent aujourd'hui")
    return None


def est_absent(medecin, jour):
    return absence_du_jour(medecin, jour) is not None


def dans_les_horaires(medecin, dt):
    """Vrai si dt tombe dans une plage du médecin, ou s'il n'a défini aucune plage."""
    horaires = HoraireMedecin.objects.filter(medecin=medecin)
    if not horaires.exists():
        return True
    local = timezone.localtime(dt) if timezone.is_aware(dt) else dt
    heure = local.time()
    return horaires.filter(jour=local.weekday(), heure_debut__lte=heure, heure_fin__gt=heure).exists()


def nom_court(medecin):
    return f"Dr. {medecin.utilisateur.last_name or medecin.utilisateur.username}"


def indisponibilite(medecin, dt):
    """Raison pour laquelle le médecin ne peut pas recevoir à dt, ou None s'il est disponible."""
    jour = date_locale(dt)
    absence = absence_du_jour(medecin, jour)
    if absence:
        quand = "aujourd'hui" if jour == timezone.localdate() else "ce jour-là"
        detail = f" ({absence.get_type_display().lower()})" if absence.type != AbsenceMedecin.Type.AUTRE else ""
        return f"{nom_court(medecin)} est absent {quand}{detail}."
    if not dans_les_horaires(medecin, dt):
        return f"En dehors des horaires de consultation de {nom_court(medecin)}."
    return None


def rdv_a_reaffecter(medecin=None):
    """RDV à venir (planifiés ou confirmés) dont le médecin n'est plus disponible à la date prévue."""
    from appointments.models import RendezVous

    qs = RendezVous.objects.filter(
        statut__in=STATUTS_ACTIFS, date_heure__date__gte=timezone.localdate(),
    ).select_related('patient', 'medecin__utilisateur').order_by('date_heure')
    if medecin:
        qs = qs.filter(medecin=medecin)
    resultat = []
    for rdv in qs:
        raison = indisponibilite(rdv.medecin, rdv.date_heure)
        if raison:
            resultat.append((rdv, raison))
    return resultat


def remplacants_possibles(rdv):
    """Médecins disponibles au créneau du RDV, sans autre RDV à la même heure ; même spécialité d'abord."""
    from accounts.models import Medecin
    from appointments.models import RendezVous

    occupes = RendezVous.objects.filter(
        date_heure=rdv.date_heure, statut__in=STATUTS_ACTIFS,
    ).exclude(pk=rdv.pk).values_list('medecin_id', flat=True)
    candidats = Medecin.objects.exclude(pk=rdv.medecin_id).exclude(pk__in=occupes).filter(
        utilisateur__is_active=True
    ).select_related('utilisateur')
    disponibles = [m for m in candidats if indisponibilite(m, rdv.date_heure) is None]
    specialite = (rdv.medecin.specialite or '').strip().lower()
    disponibles.sort(key=lambda m: ((m.specialite or '').strip().lower() != specialite, m.utilisateur.last_name))
    return disponibles
