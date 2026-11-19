from rest_framework.routers import DefaultRouter

from .views import MouvementStockViewSet, StockMedicamentViewSet

router = DefaultRouter()
router.register(r'medicaments', StockMedicamentViewSet, basename='stock-medicament')
router.register(r'mouvements', MouvementStockViewSet, basename='mouvement-stock')

urlpatterns = router.urls
