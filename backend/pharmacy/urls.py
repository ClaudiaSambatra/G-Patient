from rest_framework.routers import DefaultRouter
from .views import StockMedicamentViewSet

router = DefaultRouter()
router.register(r'', StockMedicamentViewSet, basename='stockmedicament')

urlpatterns = router.urls
