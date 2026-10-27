from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConsultationViewSet, RetourSansRendezVousViewSet

router = DefaultRouter()
router.register(r'retours-sans-rdv', RetourSansRendezVousViewSet, basename='retour-sans-rdv')
router.register(r'', ConsultationViewSet, basename='consultation')

urlpatterns = [
    path('', include(router.urls)),
]
