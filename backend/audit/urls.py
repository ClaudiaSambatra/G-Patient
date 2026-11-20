from rest_framework.routers import DefaultRouter

from .views import EntreeJournalViewSet

router = DefaultRouter()
router.register(r'', EntreeJournalViewSet, basename='journal-audit')

urlpatterns = router.urls
