from datetime import timedelta
from django.db.models import Sum, Count
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from billing.models import Facture
from .models import Utilisateur, Medecin


def get_admin_dashboard_data(today):
    total_patients = Patient.objects.count()
    total_rdv = RendezVous.objects.count()
    rdv_du_jour = RendezVous.objects.filter(date_heure__date=today).count()
    total_consultations = Consultation.objects.count()
    total_factures = Facture.objects.count()

    total_encaisse_agg = Facture.objects.filter(
        statut=Facture.StatutPaiement.PAYEE
    ).aggregate(total=Sum('montant'))['total'] or 0
    total_encaisse = float(total_encaisse_agg)

    factures_impayees_qs = Facture.objects.filter(
        statut=Facture.StatutPaiement.IMPAYEE
    )
    total_impaye_agg = factures_impayees_qs.aggregate(total=Sum('montant'))['total'] or 0
    total_impaye = float(total_impaye_agg)
    factures_impayees = factures_impayees_qs.count()

    total_financier = total_encaisse + total_impaye
    taux_recouvrement = round((total_encaisse / total_financier * 100), 1) if total_financier > 0 else 100.0

    medecins_actifs = Medecin.objects.filter(utilisateur__is_active=True).count()
    medecins_presents_jour = Medecin.objects.filter(
        utilisateur__is_active=True
    ).exclude(date_absence=today).count()

    dates_14j = [today - timedelta(days=i) for i in reversed(range(14))]
    consultations_14j = (
        Consultation.objects.filter(date_consultation__date__gte=dates_14j[0])
        .values('date_consultation__date')
        .annotate(count=Count('id'))
    )
    cons_map = {item['date_consultation__date']: item['count'] for item in consultations_14j}
    evolution_consultations = [
        {
            'date': d.isoformat(),
            'label': d.strftime('%d/%m'),
            'total': cons_map.get(d, 0)
        }
        for d in dates_14j
    ]

    rdv_counts = RendezVous.objects.values('statut').annotate(count=Count('id'))
    rdv_map = {item['statut']: item['count'] for item in rdv_counts}
    repartition_rdv = [
        {'statut': 'PLANIFIE', 'label': 'Planifié', 'count': rdv_map.get('PLANIFIE', 0), 'color': '#3b82f6'},
        {'statut': 'CONFIRME', 'label': 'Confirmé', 'count': rdv_map.get('CONFIRME', 0), 'color': '#10b981'},
        {'statut': 'TERMINE', 'label': 'Terminé', 'count': rdv_map.get('TERMINE', 0), 'color': '#6366f1'},
        {'statut': 'ANNULE', 'label': 'Annulé', 'count': rdv_map.get('ANNULE', 0), 'color': '#ef4444'},
    ]

    activite_medecins = []
    for m in Medecin.objects.filter(utilisateur__is_active=True).select_related('utilisateur'):
        cons_m = Consultation.objects.filter(medecin=m.utilisateur).count()
        rdv_m_jour = RendezVous.objects.filter(medecin=m, date_heure__date=today).count()
        activite_medecins.append({
            'id': m.id,
            'medecin': f"Dr. {m.utilisateur.last_name} {m.utilisateur.first_name}",
            'specialite': m.specialite or 'Médecine générale',
            'consultations': cons_m,
            'rdv_jour': rdv_m_jour,
            'absent': m.absent_aujourdhui,
        })

    activites = []
    for c in Consultation.objects.select_related('patient', 'medecin').order_by('-date_consultation')[:5]:
        activites.append({
            'id': f"cons-{c.id}",
            'type': 'CONSULTATION',
            'titre': f"Consultation — {c.patient.nom} {c.patient.prenom}",
            'description': f"Prise en charge par Dr. {c.medecin.last_name}",
            'date': c.date_consultation.isoformat(),
            'lien': f"/consultations/{c.id}",
        })
    for p in Patient.objects.order_by('-date_creation')[:3]:
        activites.append({
            'id': f"pat-{p.id}",
            'type': 'PATIENT',
            'titre': f"Nouveau patient — {p.nom} {p.prenom}",
            'description': f"Dossier médical créé ({p.age or '-'} ans)",
            'date': p.date_creation.isoformat(),
            'lien': f"/patients/{p.id}",
        })
    for f in Facture.objects.filter(
        statut=Facture.StatutPaiement.PAYEE,
        date_paiement__isnull=False
    ).select_related('patient').order_by('-date_paiement')[:3]:
        activites.append({
            'id': f"fac-{f.id}",
            'type': 'PAIEMENT',
            'titre': f"Paiement encaissé — {float(f.montant):,.0f} Ar",
            'description': f"{f.patient.nom} {f.patient.prenom} ({f.designation})",
            'date': f.date_paiement.isoformat(),
            'lien': "/factures",
        })
    activites.sort(key=lambda x: x['date'], reverse=True)
    dernieres_activites = activites[:8]

    return {
        "role": Utilisateur.Role.ADMIN,
        "total_patients": total_patients,
        "total_rdv": total_rdv,
        "rdv_du_jour": rdv_du_jour,
        "total_consultations": total_consultations,
        "total_factures": total_factures,
        "total_encaisse": total_encaisse,
        "total_impaye": total_impaye,
        "taux_recouvrement": taux_recouvrement,
        "factures_impayees": factures_impayees,
        "medecins_actifs": medecins_actifs,
        "medecins_presents_jour": medecins_presents_jour,
        "evolution_consultations": evolution_consultations,
        "repartition_rdv": repartition_rdv,
        "activite_medecins": activite_medecins,
        "dernieres_activites": dernieres_activites,
    }
