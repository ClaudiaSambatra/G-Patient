from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from accounts.views import MedecinViewSet, MyTokenObtainPairView

medecin_router = DefaultRouter()
medecin_router.register(r'', MedecinViewSet, basename='medecin')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentification JWT
    path('api/auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
<<<<<<< HEAD
    
    # Comptes
    path('api/accounts/', include('accounts.urls')),

    # Médecins (Endpoint spécifique du Lot A)
    path('api/medecins/', include(medecin_router.urls)),

    # Modules métier
    path('api/patients/', include('patients.urls')),
    path('api/rendezvous/', include('appointments.urls')),
    path('api/consultations/', include('consultations.urls')),
=======
    path('api/auth/', include('accounts.urls')),
    # Modules métier
    path('api/patients/', include('patients.urls')),
    
>>>>>>> 86992173ce1b8931dd2418e19997e70d831a2897
]
