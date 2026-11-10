from datetime import timedelta
from django.db.models import Sum
from django.utils import timezone
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from billing.models import Facture
from .models import Utilisateur


def get_secretaire_dashboard_data(today):
    total_patients = Patient.objects.count()
    nouveaux_patients_jour = Patient.objects.filter(date_creation__date=today).count()
    rdvs_jour_qs = (
        RendezVous.objects.filter(date_heure__date=today)
        .select_related('patient', 'medecin__utilisateur', 'facture', 'consultation')
        .order_by('date_heure')
    )
    rdv_du_jour = rdvs_jour_qs.count()
    patients_en_attente = rdvs_jour_qs.filter(
        statut=RendezVous.Statut.CONFIRME,
        consultation__isnull=True
    ).count()
    rdv_a_confirmer = rdvs_jour_qs.filter(
        statut=RendezVous.Statut.PLANIFIE
    ).count()
    consultations_realisees_jour = Consultation.objects.filter(
        date_consultation__date=today
    ).count()
    factures_du_jour = Facture.objects.filter(
        date_creation__date=today
    ).count()
    paiements_agg = Facture.objects.filter(
        date_paiement__date=today,
        statut=Facture.StatutPaiement.PAYEE
    ).aggregate(total=Sum('montant'))['total'] or 0
    paiements_du_jour = float(paiements_agg)

    rdv_jour_liste = []
    for rdv in rdvs_jour_qs:
        has_cons = hasattr(rdv, 'consultation') and rdv.consultation is not None
        has_fac = hasattr(rdv, 'facture') and rdv.facture is not None
        rdv_jour_liste.append({
            'id': rdv.id,
            'heure': rdv.date_heure.strftime('%H:%M'),
            'patient_id': rdv.patient.id,
            'patient_nom': f"{rdv.patient.nom} {rdv.patient.prenom}",
            'medecin_id': rdv.medecin.id,
            'medecin_nom': f"Dr. {rdv.medecin.utilisateur.last_name} {rdv.medecin.utilisateur.first_name}",
            'type': rdv.type,
            'type_display': rdv.get_type_display(),
            'statut': rdv.statut,
            'statut_display': rdv.get_statut_display(),
            'statut_paiement': rdv.statut_paiement,
            'motif': rdv.motif or '',
            'consultation_id': rdv.consultation.id if has_cons else None,
            'facture_id': rdv.facture.id if has_fac else None,
        })

    derniers_patients = [{
        'id': p.id,
        'nom': p.nom,
        'prenom': p.prenom,
        'contact': p.contact,
        'date_creation': p.date_creation.isoformat(),
        'age': p.age,
        'sexe': p.sexe,
    } for p in Patient.objects.order_by('-date_creation')[:5]]

    return {
        "role": Utilisateur.Role.SECRETAIRE,
        "total_patients": total_patients,
        "nouveaux_patients_jour": nouveaux_patients_jour,
        "rdv_du_jour": rdv_du_jour,
        "patients_en_attente": patients_en_attente,
        "rdv_a_confirmer": rdv_a_confirmer,
        "consultations_realisees_jour": consultations_realisees_jour,
        "factures_du_jour": factures_du_jour,
        "paiements_du_jour": paiements_du_jour,
        "rdv_jour_liste": rdv_jour_liste,
        "derniers_patients": derniers_patients,
    }


def get_medecin_dashboard_data(user, today):
    medecin_profile = getattr(user, 'medecin_profile', None)

    if not medecin_profile:
        return {
            "role": Utilisateur.Role.MEDECIN,
            "rdv_du_jour": 0,
            "patients_en_attente": 0,
            "consultations_jour": 0,
            "total_consultations": 0,
            "suivis_recommandes_actifs": 0,
            "suivis_programmes_a_venir": 0,
            "suivis_realises": 0,
            "patients_a_recevoir": [],
            "prochains_suivis": [],
            "suivis_en_attente_retour": [],
        }

    rdvs_medecin_jour = (
        RendezVous.objects.filter(
            medecin=medecin_profile,
            date_heure__date=today
        )
        .exclude(statut=RendezVous.Statut.ANNULE)
        .select_related('patient', 'consultation')
        .order_by('date_heure')
    )
    rdv_du_jour = rdvs_medecin_jour.count()

    patients_en_attente = rdvs_medecin_jour.filter(
        statut=RendezVous.Statut.CONFIRME,
        consultation__isnull=True
    ).count()

    consultations_jour = Consultation.objects.filter(
        medecin=user,
        date_consultation__date=today
    ).count()
    total_consultations = Consultation.objects.filter(
        medecin=user
    ).count()

    limite_suivi = today - timedelta(days=15)
    suivis_recommandes_actifs_qs = Consultation.objects.filter(
        medecin=user,
        suivi_recommande=True,
        date_suivi_recommandee__gte=limite_suivi,
        rendez_vous_controles__isnull=True,
        consultations_suivi__isnull=True,
    ).select_related('patient').order_by('date_suivi_recommandee')
    suivis_recommandes_actifs_count = suivis_recommandes_actifs_qs.count()

    suivis_programmes_qs = RendezVous.objects.filter(
        medecin=medecin_profile,
        type=RendezVous.Type.CONTROLE,
        date_heure__gte=timezone.now(),
        statut__in=[RendezVous.Statut.PLANIFIE, RendezVous.Statut.CONFIRME]
    ).select_related('patient').order_by('date_heure')
    suivis_programmes_count = suivis_programmes_qs.count()

    suivis_realises_count = Consultation.objects.filter(
        medecin=user,
        consultation_origine__isnull=False
    ).count()

    patients_a_recevoir = []
    for rdv in rdvs_medecin_jour:
        has_cons = hasattr(rdv, 'consultation') and rdv.consultation is not None
        patients_a_recevoir.append({
            'rdv_id': rdv.id,
            'heure': rdv.date_heure.strftime('%H:%M'),
            'patient_id': rdv.patient.id,
            'patient_nom': f"{rdv.patient.nom} {rdv.patient.prenom}",
            'patient_age': rdv.patient.age,
            'patient_sexe': rdv.patient.sexe,
            'type': rdv.type,
            'type_display': rdv.get_type_display(),
            'statut': rdv.statut,
            'statut_display': rdv.get_statut_display(),
            'motif': rdv.motif or '',
            'en_attente': (rdv.statut == RendezVous.Statut.CONFIRME and not has_cons),
            'consultation_terminee': has_cons,
            'consultation_id': rdv.consultation.id if has_cons else None,
        })

    prochains_suivis = [{
        'id': r.id,
        'heure': r.date_heure.strftime('%d/%m/%Y %H:%M'),
        'patient_id': r.patient.id,
        'patient_nom': f"{r.patient.nom} {r.patient.prenom}",
        'motif': r.motif or 'Visite de contrôle',
        'statut': r.statut,
        'statut_display': r.get_statut_display(),
    } for r in suivis_programmes_qs[:5]]

    suivis_en_attente_retour = [{
        'consultation_id': c.id,
        'patient_id': c.patient.id,
        'patient_nom': f"{c.patient.nom} {c.patient.prenom}",
        'date_consultation': c.date_consultation.strftime('%d/%m/%Y'),
        'date_suivi_recommandee': c.date_suivi_recommandee.strftime('%d/%m/%Y') if c.date_suivi_recommandee else None,
        'motif_suivi': c.motif_suivi or 'Contrôle recommandé',
    } for c in suivis_recommandes_actifs_qs[:5]]

    return {
        "role": Utilisateur.Role.MEDECIN,
        "rdv_du_jour": rdv_du_jour,
        "patients_en_attente": patients_en_attente,
        "consultations_jour": consultations_jour,
        "total_consultations": total_consultations,
        "suivis_recommandes_actifs": suivis_recommandes_actifs_count,
        "suivis_programmes_a_venir": suivis_programmes_count,
        "suivis_realises": suivis_realises_count,
        "patients_a_recevoir": patients_a_recevoir,
        "prochains_suivis": prochains_suivis,
        "suivis_en_attente_retour": suivis_en_attente_retour,
    }
