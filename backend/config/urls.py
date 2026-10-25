from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from accounts.views import MedecinViewSet, MyTokenObtainPairView
from accounts.password_reset_views import RequestOTPView, ResetPasswordView

medecin_router = DefaultRouter()
medecin_router.register(r'', MedecinViewSet, basename='medecin')

from django.http import HttpResponse, JsonResponse
import prometheus_client


def health(request):
    return JsonResponse({'status': 'ok'})


def metrics(request):
    return HttpResponse(
        prometheus_client.generate_latest(),
        content_type=prometheus_client.CONTENT_TYPE_LATEST
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/metrics/', metrics, name='metrics'),

    # Authentification JWT
    path('api/auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Mot de passe oublié
    path('api/auth/request-otp/', RequestOTPView.as_view(), name='request_otp'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),

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
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
