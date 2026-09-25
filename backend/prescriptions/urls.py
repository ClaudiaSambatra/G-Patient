from rest_framework.routers import DefaultRouter
from .views import OrdonnanceViewSet

router = DefaultRouter()
router.register(r'', OrdonnanceViewSet, basename='ordonnance')

urlpatterns = router.urls
