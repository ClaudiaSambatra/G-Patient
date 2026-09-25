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
    # Comptes
    path('api/accounts/', include('accounts.urls')),

    # Médecins (Endpoint spécifique du Lot A)
    path('api/medecins/', include(medecin_router.urls)),

    # Modules métier
    path('api/patients/', include('patients.urls')),
    path('api/rendezvous/', include('appointments.urls')),
    path('api/consultations/', include('consultations.urls')),
    path('api/prescriptions/', include('prescriptions.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/pharmacy/', include('pharmacy.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
