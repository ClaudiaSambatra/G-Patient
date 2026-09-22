<<<<<<< HEAD
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeView, UtilisateurViewSet

router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('', include(router.urls)),
=======
from django.urls import path
from .views import MeView

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
>>>>>>> 86992173ce1b8931dd2418e19997e70d831a2897
]
