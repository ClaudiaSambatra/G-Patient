from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, DocumentMedicalViewSet

router = DefaultRouter()
router.register(r'documents', DocumentMedicalViewSet, basename='document-medical')
router.register(r'', PatientViewSet, basename='patient')

urlpatterns = router.urls
