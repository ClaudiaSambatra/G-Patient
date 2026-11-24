from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AbsenceMedecinViewSet, CreneauxLibresView, GardeMedecinViewSet, HoraireMedecinViewSet, RdvAReaffecterViewSet,
)

router = DefaultRouter()
router.register(r'horaires', HoraireMedecinViewSet, basename='horaire-medecin')
router.register(r'absences', AbsenceMedecinViewSet, basename='absence-medecin')
router.register(r'gardes', GardeMedecinViewSet, basename='garde-medecin')
router.register(r'rdv-a-reaffecter', RdvAReaffecterViewSet, basename='rdv-a-reaffecter')

urlpatterns = [
    path('creneaux/', CreneauxLibresView.as_view(), name='creneaux-libres'),
] + router.urls
