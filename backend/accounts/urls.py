from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MeView,
    MePhotoView,
    ChangePasswordView,
    UtilisateurViewSet,
    DashboardStatsView,
)

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('me/photo/', MePhotoView.as_view(), name='me_photo'),
    path('me/change-password/', ChangePasswordView.as_view(), name='me_change_password'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('', include(router.urls)),
]
