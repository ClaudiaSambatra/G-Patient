from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
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
)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class MeView(APIView):
    """
    Retourne le profil de l'utilisateur actuellement connecté.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UtilisateurSerializer(request.user)
        data = serializer.data
        data['full_name'] = request.user.get_full_name() or request.user.username
        data['role_display'] = request.user.get_role_display()
        return Response(data)


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
    """
    queryset = Medecin.objects.all().order_by('utilisateur__last_name', 'utilisateur__first_name')
    serializer_class = MedecinSerializer
    permission_classes = [IsAuthenticated]

