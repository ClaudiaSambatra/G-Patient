from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RendezVousViewSet, AbsenceMedecinViewSet

router = DefaultRouter()
router.register(r'absences', AbsenceMedecinViewSet, basename='absence')
router.register(r'', RendezVousViewSet, basename='rendezvous')

urlpatterns = [
    path('', include(router.urls)),
]
