from rest_framework.routers import DefaultRouter

from .views import AbsenceMedecinViewSet, HoraireMedecinViewSet, RdvAReaffecterViewSet

router = DefaultRouter()
router.register(r'horaires', HoraireMedecinViewSet, basename='horaire-medecin')
router.register(r'absences', AbsenceMedecinViewSet, basename='absence-medecin')
router.register(r'rdv-a-reaffecter', RdvAReaffecterViewSet, basename='rdv-a-reaffecter')

urlpatterns = router.urls
