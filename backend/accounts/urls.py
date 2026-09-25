from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeView, UtilisateurViewSet, DashboardStatsView

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('', include(router.urls)),
]
