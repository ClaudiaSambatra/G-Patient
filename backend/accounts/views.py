
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


from rest_framework.views import APIView
from django.utils import timezone
from patients.models import Patient
from appointments.models import RendezVous
from consultations.models import Consultation


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()

        patients_count = Patient.objects.count()
        rdv_du_jour = RendezVous.objects.filter(date_heure__date=today).count()
        consultations_count = Consultation.objects.count()
        medecins_actifs = Medecin.objects.filter(utilisateur__is_active=True).count()

        # Activité par médecin
        activite_medecins = []
        for m in Medecin.objects.filter(utilisateur__is_active=True):
            consultations_medecin = Consultation.objects.filter(medecin=m.utilisateur).count()
            activite_medecins.append({
                'medecin': f"Dr. {m.utilisateur.last_name}",
                'consultations': consultations_medecin
            })

        from billing.models import Facture
        factures_impayees = Facture.objects.filter(statut=Facture.StatutPaiement.IMPAYEE).count()

        return Response({
            "total_patients": patients_count,
            "rdv_du_jour": rdv_du_jour,
            "total_consultations": consultations_count,
            "medecins_actifs": medecins_actifs,
            "factures_impayees": factures_impayees,
            "activite_medecins": activite_medecins
        })
