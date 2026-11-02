
from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Utilisateur, Medecin
from .permissions import IsAdmin
from .serializers import (
    UtilisateurSerializer,
    UtilisateurCreateSerializer,
    UtilisateurUpdateSerializer,
    ResetPasswordSerializer,
    MedecinSerializer,
    MyTokenObtainPairSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class MeView(APIView):
    """
    Gestion du profil de l'utilisateur connecté.
    GET : retourne le profil (avec URL absolue de la photo ou null).
    PATCH : met à jour first_name, last_name, telephone, et optionnellement la photo.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UtilisateurSerializer(request.user, context={'request': request})
        data = serializer.data
        data['full_name'] = request.user.get_full_name() or request.user.username
        data['role_display'] = request.user.get_role_display()
        if hasattr(request.user, 'medecin_profile'):
            data['medecin_id'] = request.user.medecin_profile.id
            data['absent_aujourdhui'] = request.user.medecin_profile.absent_aujourdhui
        return Response(data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        full_serializer = UtilisateurSerializer(request.user, context={'request': request})
        data = full_serializer.data
        data['full_name'] = request.user.get_full_name() or request.user.username
        data['role_display'] = request.user.get_role_display()
        return Response(data, status=status.HTTP_200_OK)


class MePhotoView(APIView):
    """
    Gestion dédiée de la photo de profil.
    DELETE : supprime la photo (le fichier et la valeur en base).
    POST : permet également l'upload direct de la photo en multipart/form-data.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def delete(self, request):
        if request.user.photo:
            request.user.photo.delete(save=False)
            request.user.photo = None
            request.user.save(update_fields=['photo'])
        return Response({"message": "Photo supprimée avec succès."}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        full_serializer = UtilisateurSerializer(request.user, context={'request': request})
        data = full_serializer.data
        data['full_name'] = request.user.get_full_name() or request.user.username
        data['role_display'] = request.user.get_role_display()
        return Response(data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    Changement de mot de passe par l'utilisateur connecté.
    POST /api/accounts/me/change-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Mot de passe modifié avec succès."}, status=status.HTTP_200_OK)


class UtilisateurViewSet(viewsets.ModelViewSet):
    """
    CRUD complet et gestion des comptes utilisateurs (réservé aux Administrateurs).
    """
    queryset = Utilisateur.objects.all().order_by('-date_joined')
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'telephone']

    def get_serializer_class(self):
        if self.action == 'create':
            return UtilisateurCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UtilisateurUpdateSerializer
        elif self.action == 'reset_password':
            return ResetPasswordSerializer
        return UtilisateurSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            if is_active_param.lower() in ['true', '1']:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in ['false', '0']:
                queryset = queryset.filter(is_active=False)

        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Sécurité : un administrateur ne peut pas supprimer son propre compte
        if instance.id == request.user.id:
            return Response(
                {"detail": "Vous ne pouvez pas supprimer votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Sécurité : ne pas supprimer le dernier administrateur
        if instance.role == Utilisateur.Role.ADMIN or instance.is_superuser:
            admin_count = Utilisateur.objects.filter(
                role=Utilisateur.Role.ADMIN, is_active=True
            ).count()
            if admin_count <= 1:
                return Response(
                    {"detail": "Impossible de supprimer le dernier administrateur du système."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """
        Bascule l'état actif/inactif d'un compte utilisateur.
        """
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {"detail": "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "message": f"Compte {'activé' if user.is_active else 'désactivé'} avec succès."
        })

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Permet à un administrateur de réinitialiser le mot de passe d'un utilisateur.
        """
        user = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_password = serializer.validated_data['new_password']
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({
            "id": user.id,
            "username": user.username,
            "message": "Le mot de passe a été réinitialisé avec succès."
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Statistiques globales sur les comptes utilisateurs.
        """
        total = Utilisateur.objects.count()
        medecins = Utilisateur.objects.filter(role=Utilisateur.Role.MEDECIN).count()
        secretaires = Utilisateur.objects.filter(role=Utilisateur.Role.SECRETAIRE).count()
        admins = Utilisateur.objects.filter(role=Utilisateur.Role.ADMIN).count()
        actifs = Utilisateur.objects.filter(is_active=True).count()
        inactifs = Utilisateur.objects.filter(is_active=False).count()
        return Response({
            "total": total,
            "medecins": medecins,
            "secretaires": secretaires,
            "admins": admins,
            "actifs": actifs,
            "inactifs": inactifs,
        })


class MedecinViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Module Médecin : Lecture seule, accessible à tout utilisateur authentifié.
    Sert à peupler les listes déroulantes de praticiens lors de la création de rendez-vous.
    Permet également la mise à jour de la présence du jour.
    """
    queryset = Medecin.objects.all().order_by('utilisateur__last_name', 'utilisateur__first_name')
    serializer_class = MedecinSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='presence')
    def presence(self, request, pk=None):
        medecin = self.get_object()
        user = request.user

        # Vérification des permissions :
        # Médecin uniquement pour lui-même, Secrétaire ou Admin pour tous
        is_own_profile = hasattr(user, 'medecin_profile') and user.medecin_profile.id == medecin.id
        is_staff_or_secretaire = user.role in [Utilisateur.Role.ADMIN, Utilisateur.Role.SECRETAIRE] or user.is_superuser

        if not (is_own_profile or is_staff_or_secretaire):
            return Response(
                {"detail": "Vous ne pouvez modifier que votre propre présence."},
                status=status.HTTP_403_FORBIDDEN
            )

        absent_raw = request.data.get('absent')
        if absent_raw is None:
            return Response(
                {"detail": "Le champ 'absent' (booléen) est requis."},
                status=status.HTTP_400_BAD_REQUEST
            )
        absent = bool(absent_raw) if isinstance(absent_raw, bool) else str(absent_raw).lower() in ['true', '1']
        if absent:
            medecin.date_absence = timezone.localdate()
        else:
            medecin.date_absence = None
        medecin.save(update_fields=['date_absence'])

        return Response(MedecinSerializer(medecin, context={'request': request}).data, status=status.HTTP_200_OK)


from datetime import timedelta
from django.db.models import Sum, Count
from rest_framework.views import APIView
from django.utils import timezone
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation
from billing.models import Facture


class DashboardStatsView(APIView):
    """
    Fournit les statistiques et indicateurs pour le tableau de bord dynamique,
    sécurisé et adapté au rôle de l'utilisateur connecté (SECRETAIRE, MEDECIN, ADMIN).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate() if hasattr(timezone, 'localdate') else timezone.now().date()

        # ---------------------------------------------------------
        # 1. RÔLE SECRÉTAIRE
        # ---------------------------------------------------------
        if user.role == Utilisateur.Role.SECRETAIRE:
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

            return Response({
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
            })

        # ---------------------------------------------------------
        # 2. RÔLE MÉDECIN (Confidentialité stricte côté serveur)
        # ---------------------------------------------------------
        elif user.role == Utilisateur.Role.MEDECIN:
            medecin_profile = getattr(user, 'medecin_profile', None)

            if not medecin_profile:
                # Profil médecin manquant (mesure défensive)
                return Response({
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
                })

            # RDV du jour attribués à ce médecin
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

            # Patients en salle d'attente (Confirmés mais sans consultation commencée)
            patients_en_attente = rdvs_medecin_jour.filter(
                statut=RendezVous.Statut.CONFIRME,
                consultation__isnull=True
            ).count()

            # Consultations réalisées par lui
            consultations_jour = Consultation.objects.filter(
                medecin=user,
                date_consultation__date=today
            ).count()
            total_consultations = Consultation.objects.filter(
                medecin=user
            ).count()

            # Catégorisation disjointe des suivis (zéro double-comptage)
            # A. Suivis recommandés actifs en attente de retour (sans RDV de contrôle ni consultation de suivi)
            limite_suivi = today - timedelta(days=15)
            suivis_recommandes_actifs_qs = Consultation.objects.filter(
                medecin=user,
                suivi_recommande=True,
                date_suivi_recommandee__gte=limite_suivi,
                rendez_vous_controles__isnull=True,
                consultations_suivi__isnull=True,
            ).select_related('patient').order_by('date_suivi_recommandee')
            suivis_recommandes_actifs_count = suivis_recommandes_actifs_qs.count()

            # B. Suivis programmés à venir (RDVs de contrôle planifiés ou confirmés)
            suivis_programmes_qs = RendezVous.objects.filter(
                medecin=medecin_profile,
                type=RendezVous.Type.CONTROLE,
                date_heure__gte=timezone.now(),
                statut__in=[RendezVous.Statut.PLANIFIE, RendezVous.Statut.CONFIRME]
            ).select_related('patient').order_by('date_heure')
            suivis_programmes_count = suivis_programmes_qs.count()

            # C. Suivis déjà réalisés par ce médecin
            suivis_realises_count = Consultation.objects.filter(
                medecin=user,
                consultation_origine__isnull=False
            ).count()

            # Liste des patients à recevoir aujourd'hui
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

            return Response({
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
            })

        # ---------------------------------------------------------
        # 3. RÔLE ADMINISTRATEUR (ou superutilisateur)
        # ---------------------------------------------------------
        else:
            total_patients = Patient.objects.count()
            total_rdv = RendezVous.objects.count()
            rdv_du_jour = RendezVous.objects.filter(date_heure__date=today).count()
            total_consultations = Consultation.objects.count()
            total_factures = Facture.objects.count()

            # Statistiques financières complètes
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

            # Médecins
            medecins_actifs = Medecin.objects.filter(utilisateur__is_active=True).count()
            medecins_presents_jour = Medecin.objects.filter(
                utilisateur__is_active=True
            ).exclude(date_absence=today).count()

            # Évolution des consultations sur les 14 derniers jours
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

            # Répartition des statuts de rendez-vous
            rdv_counts = RendezVous.objects.values('statut').annotate(count=Count('id'))
            rdv_map = {item['statut']: item['count'] for item in rdv_counts}
            repartition_rdv = [
                {'statut': 'PLANIFIE', 'label': 'Planifié', 'count': rdv_map.get('PLANIFIE', 0), 'color': '#3b82f6'},
                {'statut': 'CONFIRME', 'label': 'Confirmé', 'count': rdv_map.get('CONFIRME', 0), 'color': '#10b981'},
                {'statut': 'TERMINE', 'label': 'Terminé', 'count': rdv_map.get('TERMINE', 0), 'color': '#6366f1'},
                {'statut': 'ANNULE', 'label': 'Annulé', 'count': rdv_map.get('ANNULE', 0), 'color': '#ef4444'},
            ]

            # Activité détaillée par médecin (avec rétro-compatibilité)
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

            # Dernières activités enregistrées dans la clinique
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

            return Response({
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
            })
