from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Utilisateur
from .dashboard_services import (
    get_secretaire_dashboard_data,
    get_medecin_dashboard_data,
)
from .dashboard_admin_services import get_admin_dashboard_data


class DashboardStatsView(APIView):
    """
    Fournit les statistiques et indicateurs pour le tableau de bord dynamique,
    sécurisé et adapté au rôle de l'utilisateur connecté (SECRETAIRE, MEDECIN, ADMIN).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate() if hasattr(timezone, 'localdate') else timezone.now().date()

        if user.role == Utilisateur.Role.SECRETAIRE:
            return Response(get_secretaire_dashboard_data(today))
        elif user.role == Utilisateur.Role.MEDECIN:
            return Response(get_medecin_dashboard_data(user, today))
        else:
            return Response(get_admin_dashboard_data(today))
