from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from accounts.models import Medecin
from billing.models import Facture
from consultations.models import Consultation
from consultations.services import calculer_eligibilite_controle
from patients.models import Patient
from .models import RendezVous


def traiter_accueil_consultation(serializer_class, patient_id, medecin_id, motif):
    """
    Parcours A : Accueil pour consultation normale.
    - Crée un rendez-vous immédiat de type CONSULTATION au statut CONFIRME.
    - Place le patient dans la file d'attente du médecin.
    - Déclenche atomiquement la facturation (création de la Facture IMPAYEE selon tarif).
    - Protection anti-doublon et idempotence.
    """
    if not patient_id:
        return Response({"patient": "Le patient est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
    if not medecin_id:
        return Response({"medecin": "Le médecin est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

    patient = Patient.objects.filter(pk=patient_id).first()
    if not patient:
        return Response({"patient": "Patient introuvable."}, status=status.HTTP_404_NOT_FOUND)

    medecin = Medecin.objects.filter(pk=medecin_id).first()
    if not medecin:
        return Response({"medecin": "Médecin introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if getattr(medecin, 'absent_aujourdhui', False):
        return Response(
            {"medecin": f"Dr. {medecin.utilisateur.last_name} est absent aujourd'hui."},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()

    with transaction.atomic():
        # Protection contre les doubles-clics rapides (5 secondes)
        recent_rdv = RendezVous.objects.filter(
            patient=patient,
            medecin=medecin,
            type=RendezVous.Type.CONSULTATION,
            statut=RendezVous.Statut.CONFIRME,
            date_creation__gte=now - timezone.timedelta(seconds=5)
        ).first()
        if recent_rdv:
            serializer = serializer_class(recent_rdv)
            return Response(serializer.data, status=status.HTTP_200_OK)

        rdv = RendezVous(
            patient=patient,
            medecin=medecin,
            date_heure=now,
            statut=RendezVous.Statut.CONFIRME,
            type=RendezVous.Type.CONSULTATION,
            motif=motif or "Consultation normale"
        )
        rdv.save()

        # Garantie d'idempotence facture : une seule facture de consultation par visite
        facture = Facture.objects.filter(rendez_vous=rdv).first()
        if not facture:
            tarif = getattr(settings, 'TARIF_CONSULTATION', 20000)
            facture = Facture.objects.create(
                patient=patient,
                rendez_vous=rdv,
                type=Facture.Type.CONSULTATION,
                montant=Decimal(str(tarif)),
                designation="Frais de consultation",
                actes="Frais de consultation",
                statut=Facture.StatutPaiement.IMPAYEE
            )

    serializer = serializer_class(rdv)
    data = serializer.data
    data['facture_id'] = facture.id if facture else None
    data['facture_montant'] = str(facture.montant) if facture else "20000.00"
    return Response(data, status=status.HTTP_201_CREATED)


def traiter_accueil_suivi(serializer_class, patient_id, medecin_id, consultation_origine_id, motif):
    """
    Parcours B : Accueil pour suivi de consultation.
    - Vérifie l'éligibilité de la consultation d'origine (15 jours, payante, non encore suivie).
    - Permet d'orienter vers le médecin d'origine s'il est présent, ou vers un confrère présent.
    - Crée un rendez-vous immédiat de type CONTROLE au statut CONFIRME lié à la consultation d'origine.
    - RÈGLE ABSOLUE FACTURATION : STRICTEMENT AUCUNE FACTURE N'EST CRÉÉE (pas de 0 Ar, pas de ligne).
    """
    if not patient_id:
        return Response({"patient": "Le patient est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
    if not consultation_origine_id:
        return Response({"consultation_origine": "La consultation d'origine est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

    patient = Patient.objects.filter(pk=patient_id).first()
    if not patient:
        return Response({"patient": "Patient introuvable."}, status=status.HTTP_404_NOT_FOUND)

    consult_origine = Consultation.objects.filter(pk=consultation_origine_id, patient=patient).first()
    if not consult_origine:
        return Response({"consultation_origine": "Consultation d'origine introuvable pour ce patient."}, status=status.HTTP_404_NOT_FOUND)

    # Vérification d'éligibilité formelle
    eligibilite = calculer_eligibilite_controle(patient, consultation_id=consult_origine.id)
    if not eligibilite.get('est_gratuit', False):
        return Response({
            "detail": eligibilite.get('explication', "Ce patient n'est pas éligible au suivi gratuit."),
            "statut_eligibilite": eligibilite.get('statut', 'NON_ELIGIBLE')
        }, status=status.HTTP_400_BAD_REQUEST)

    # Détermination du médecin pour ce suivi : par défaut médecin de la consultation initiale si présent
    if medecin_id:
        medecin = Medecin.objects.filter(pk=medecin_id).first()
    else:
        medecin = Medecin.objects.filter(utilisateur=consult_origine.medecin).first()

    if not medecin:
        return Response({"medecin": "Médecin introuvable pour la prise en charge."}, status=status.HTTP_404_NOT_FOUND)

    if getattr(medecin, 'absent_aujourdhui', False):
        return Response({
            "medecin": f"Dr. {medecin.utilisateur.last_name} est absent aujourd'hui. Veuillez sélectionner un confrère présent."
        }, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()

    with transaction.atomic():
        # Protection anti-double clic
        recent_suivi = RendezVous.objects.filter(
            patient=patient,
            consultation_origine=consult_origine,
            type=RendezVous.Type.CONTROLE,
            date_creation__gte=now - timezone.timedelta(seconds=5)
        ).first()
        if recent_suivi:
            serializer = serializer_class(recent_suivi)
            return Response(serializer.data, status=status.HTTP_200_OK)

        rdv = RendezVous(
            patient=patient,
            medecin=medecin,
            date_heure=now,
            statut=RendezVous.Statut.CONFIRME,
            type=RendezVous.Type.CONTROLE,
            consultation_origine=consult_origine,
            motif=motif or "Suivi de consultation"
        )
        rdv.save()
        # STRICTEMENT AUCUNE FACTURE CRÉÉE ICI.

    serializer = serializer_class(rdv)
    data = serializer.data
    data['explication_eligibilite'] = eligibilite.get('explication')
    return Response(data, status=status.HTTP_201_CREATED)
