from datetime import datetime, time, timedelta

from django.conf import settings
from django.utils import timezone

from .models import AbsenceMedecin, HoraireMedecin

STATUTS_ACTIFS = ('PLANIFIE', 'CONFIRME')

# Journée affichée pour un médecin qui n'a pas encore défini d'horaires
JOURNEE_PAR_DEFAUT = (time(8, 0), time(17, 0))


def duree_rdv():
    return timedelta(minutes=settings.DUREE_RDV_MINUTES)


def rdv_qui_chevauchent(dt, exclure_pk=None, **filtres):
    """RDV actifs dont le créneau [début, début + durée[ chevauche celui qui commence à dt."""
    from appointments.models import RendezVous

    qs = RendezVous.objects.filter(
        statut__in=STATUTS_ACTIFS,
        date_heure__gt=dt - duree_rdv(),
        date_heure__lt=dt + duree_rdv(),
        **filtres,
    )
    if exclure_pk:
        qs = qs.exclude(pk=exclure_pk)
    return qs


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
    """Vrai si tout le créneau (début → début + durée) tient dans une plage du médecin, ou s'il n'en a aucune."""
    horaires = HoraireMedecin.objects.filter(medecin=medecin)
    if not horaires.exists():
        return True
    local = timezone.localtime(dt) if timezone.is_aware(dt) else dt
    fin = local + duree_rdv()
    if fin.date() != local.date():
        return False
    return horaires.filter(jour=local.weekday(), heure_debut__lte=local.time(), heure_fin__gte=fin.time()).exists()


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

    occupes = rdv_qui_chevauchent(rdv.date_heure, exclure_pk=rdv.pk).values_list('medecin_id', flat=True)
    candidats = Medecin.objects.exclude(pk=rdv.medecin_id).exclude(pk__in=occupes).filter(
        utilisateur__is_active=True
    ).select_related('utilisateur')
    disponibles = [m for m in candidats if indisponibilite(m, rdv.date_heure) is None]
    specialite = (rdv.medecin.specialite or '').strip().lower()
    disponibles.sort(key=lambda m: ((m.specialite or '').strip().lower() != specialite, m.utilisateur.last_name))
    return disponibles


def creneaux_libres(medecin, jour):
    """
    Heures de début libres (pas de DUREE_RDV_MINUTES) pour un médecin un jour donné :
    dans ses plages horaires (ou 8h-17h s'il n'en a pas), hors absence, sans chevauchement
    avec un RDV actif, et pas dans le passé.
    """
    if est_absent(medecin, jour):
        return []
    plages = [(h.heure_debut, h.heure_fin) for h in HoraireMedecin.objects.filter(medecin=medecin, jour=jour.weekday())]
    if not plages and not HoraireMedecin.objects.filter(medecin=medecin).exists():
        plages = [JOURNEE_PAR_DEFAUT]

    debut_jour = timezone.make_aware(datetime.combine(jour, time.min))
    occupes = list(rdv_qui_chevauchent_journee(medecin, debut_jour))
    maintenant = timezone.now()
    pas = duree_rdv()
    libres = []
    for heure_debut, heure_fin in sorted(plages):
        dt = timezone.make_aware(datetime.combine(jour, heure_debut))
        fin_plage = timezone.make_aware(datetime.combine(jour, heure_fin))
        while dt + pas <= fin_plage:
            if dt > maintenant and not any(abs(o - dt) < pas for o in occupes):
                libres.append(timezone.localtime(dt).strftime('%H:%M'))
            dt += pas
    return libres


def rdv_qui_chevauchent_journee(medecin, debut_jour):
    """Débuts des RDV actifs du médecin ce jour-là (avec la marge d'une durée de part et d'autre)."""
    from appointments.models import RendezVous

    return RendezVous.objects.filter(
        medecin=medecin, statut__in=STATUTS_ACTIFS,
        date_heure__gte=debut_jour - duree_rdv(), date_heure__lt=debut_jour + timedelta(days=1) + duree_rdv(),
    ).values_list('date_heure', flat=True)
