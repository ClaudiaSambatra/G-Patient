from rest_framework.routers import DefaultRouter
from .views import DemandeExamenViewSet

router = DefaultRouter()
router.register(r'', DemandeExamenViewSet, basename='demandes-examens')

urlpatterns = router.urls
