from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import RendezVous
from .serializers import RendezVousSerializer
from accounts.permissions import (
    IsSecretaireOuMedecinOuAdmin,
    IsSecretaireOuAdmin,
    IsAdmin,
)


class RendezVousViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les rendez-vous.
    Lecture accessible aux Secrétaires, Médecins, et Admins.
    Création/Modification réservées aux Secrétaires et Admins.
    Suppression définitive réservée exclusivement aux Administrateurs.
    """
    serializer_class = RendezVousSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['motif', 'patient__nom', 'patient__prenom', 'medecin__utilisateur__last_name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'controle_eligible', 'historique_suivi']:
            permission_classes = [IsAuthenticated, IsSecretaireOuMedecinOuAdmin]
        elif self.action == 'destroy':
            permission_classes = [IsAuthenticated, IsAdmin]
        else:
            permission_classes = [IsAuthenticated, IsSecretaireOuAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        queryset = RendezVous.objects.all().select_related(
            'patient', 'medecin__utilisateur', 'consultation', 'consultation_origine', 'facture'
        )

        # Si l'utilisateur est un médecin, il ne voit que ses rendez-vous
        if user.role == 'MEDECIN':
            queryset = queryset.filter(medecin__utilisateur=user)
        else:
            medecin_id = self.request.query_params.get('medecin')
            if medecin_id:
                queryset = queryset.filter(medecin_id=medecin_id)

        # Filtre statut
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        # Filtre type
        type_rdv = self.request.query_params.get('type')
        if type_rdv:
            queryset = queryset.filter(type=type_rdv)

        # Filtres par date (jour exact ou intervalle)
        date_str = self.request.query_params.get('date')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if date_str:
            queryset = queryset.filter(date_heure__date=date_str)
        if date_debut:
            queryset = queryset.filter(date_heure__date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_heure__date__lte=date_fin)

        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.statut == RendezVous.Statut.TERMINE or (hasattr(instance, 'consultation') and instance.consultation is not None):
            return Response(
                {"detail": "Impossible de supprimer un rendez-vous terminé ou lié à une consultation."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='controle-eligible')
    def controle_eligible(self, request):
        patient_id = request.query_params.get('patient')
        date_str = request.query_params.get('date')

        if not patient_id or not date_str:
            return Response({"eligible": False, "consultation_origine": None})

        from datetime import datetime, timedelta, date as dt_date
        from consultations.models import Consultation

        try:
            if 'T' in date_str:
                target_date = datetime.fromisoformat(date_str).date()
            else:
                target_date = dt_date.fromisoformat(date_str)
        except Exception:
            return Response({"eligible": False, "consultation_origine": None})

        date_min = target_date - timedelta(days=15)

        eligible_consult = Consultation.objects.filter(
            patient_id=patient_id,
            rendez_vous__type=RendezVous.Type.CONSULTATION,
            rendez_vous__statut=RendezVous.Statut.TERMINE,
            date_consultation__date__gte=date_min,
            date_consultation__date__lte=target_date
        ).order_by('-date_consultation', '-id').first()

        if eligible_consult:
            return Response({"eligible": True, "consultation_origine": eligible_consult.id})
        return Response({"eligible": False, "consultation_origine": None})

    @action(detail=True, methods=['post'], url_path='annuler')
    def annuler(self, request, pk=None):
        instance = self.get_object()
        if instance.statut in [RendezVous.Statut.ANNULE, RendezVous.Statut.TERMINE]:
            return Response(
                {"detail": f"Un rendez-vous avec le statut '{instance.get_statut_display()}' ne peut plus être annulé."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.statut = RendezVous.Statut.ANNULE
        instance.save()
        if hasattr(instance, 'facture') and instance.facture and instance.facture.statut == 'IMPAYEE':
            instance.facture.statut = 'ANNULEE'
            instance.facture.save(update_fields=['statut'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='retablir')
    def retablir(self, request, pk=None):
        instance = self.get_object()
        if instance.statut != RendezVous.Statut.ANNULE:
            return Response(
                {"detail": "Seul un rendez-vous annulé peut être rétabli en 'Planifié'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.statut = RendezVous.Statut.PLANIFIE
        instance.save()
        if hasattr(instance, 'facture') and instance.facture and instance.facture.statut == 'ANNULEE':
            instance.facture.statut = 'IMPAYEE'
            instance.facture.save(update_fields=['statut'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='accueil-consultation')
    def accueil_consultation(self, request):
        """
        Parcours A : Accueil pour consultation normale.
        - Crée un rendez-vous immédiat de type CONSULTATION au statut CONFIRME.
        - Place le patient dans la file d'attente du médecin.
        - Déclenche atomiquement la facturation (création de la Facture IMPAYEE selon tarif).
        - Protection anti-doublon et idempotence.
        """
        patient_id = request.data.get('patient')
        medecin_id = request.data.get('medecin')
        motif = (request.data.get('motif') or '').strip()

        if not patient_id:
            return Response({"patient": "Le patient est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        if not medecin_id:
            return Response({"medecin": "Le médecin est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        from patients.models import Patient
        from accounts.models import Medecin
        from django.db import transaction
        from django.utils import timezone
        from billing.models import Facture
        from decimal import Decimal
        from django.conf import settings

        patient = Patient.objects.filter(pk=patient_id).first()
        if not patient:
            return Response({"patient": "Patient introuvable."}, status=status.HTTP_404_NOT_FOUND)

        medecin = Medecin.objects.filter(pk=medecin_id).first()
        if not medecin:
            return Response({"medecin": "Médecin introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if getattr(medecin, 'absent_aujourdhui', False):
            return Response({"medecin": f"Dr. {medecin.utilisateur.last_name} est absent aujourd'hui."}, status=status.HTTP_400_BAD_REQUEST)

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
                serializer = self.get_serializer(recent_rdv)
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

        serializer = self.get_serializer(rdv)
        data = serializer.data
        data['facture_id'] = facture.id if facture else None
        data['facture_montant'] = str(facture.montant) if facture else "20000.00"
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='accueil-suivi')
    def accueil_suivi(self, request):
        """
        Parcours B : Accueil pour suivi de consultation.
        - Vérifie l'éligibilité de la consultation d'origine (15 jours, payante, non encore suivie).
        - Permet d'orienter vers le médecin d'origine s'il est présent, ou vers un confrère présent.
        - Crée un rendez-vous immédiat de type CONTROLE au statut CONFIRME lié à la consultation d'origine.
        - RÈGLE ABSOLUE FACTURATION : STRICTEMENT AUCUNE FACTURE N'EST CRÉÉE (pas de 0 Ar, pas de ligne).
        """
        patient_id = request.data.get('patient')
        medecin_id = request.data.get('medecin')
        consultation_origine_id = request.data.get('consultation_origine')
        motif = (request.data.get('motif') or '').strip()

        if not patient_id:
            return Response({"patient": "Le patient est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        if not consultation_origine_id:
            return Response({"consultation_origine": "La consultation d'origine est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        from patients.models import Patient
        from accounts.models import Medecin
        from consultations.models import Consultation
        from consultations.services import calculer_eligibilite_controle
        from django.db import transaction
        from django.utils import timezone

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
            return Response({"medecin": f"Dr. {medecin.utilisateur.last_name} est absent aujourd'hui. Veuillez sélectionner un confrère présent."}, status=status.HTTP_400_BAD_REQUEST)

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
                serializer = self.get_serializer(recent_suivi)
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

        serializer = self.get_serializer(rdv)
        data = serializer.data
        data['explication_eligibilite'] = eligibilite.get('explication')
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='historique-suivi')
    def historique_suivi(self, request):
        """
        Retourne l'historique complet des consultations d'un patient avec recommandation de suivi,
        disponibilité du praticien initial, et statut d'éligibilité pour le choix de la secrétaire.
        """
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response({"detail": "Le paramètre 'patient' est requis."}, status=status.HTTP_400_BAD_REQUEST)

        from patients.models import Patient
        from consultations.services import lister_consultations_suivi_possibles, calculer_eligibilite_controle

        patient = Patient.objects.filter(pk=patient_id).first()
        if not patient:
            return Response({"detail": "Patient introuvable."}, status=status.HTTP_404_NOT_FOUND)

        consultations_suivi = lister_consultations_suivi_possibles(patient)
        eligibilite_globale = calculer_eligibilite_controle(patient)

        return Response({
            'patient_id': patient.id,
            'patient_nom': f"{patient.nom} {patient.prenom}".strip(),
            'patient_contact': patient.contact,
            'patient_allergies': patient.allergies,
            'patient_antecedents': patient.antecedents,
            'eligibilite_globale': eligibilite_globale,
            'consultations': consultations_suivi
        })
