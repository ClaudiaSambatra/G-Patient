from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from accounts.views import MedecinViewSet, MyTokenObtainPairView
from accounts.password_reset_views import RequestOTPView, ResetPasswordView

medecin_router = DefaultRouter()
medecin_router.register(r'', MedecinViewSet, basename='medecin')

from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_safe
import prometheus_client


@require_safe
def root_view(request):
    return JsonResponse({
        'name': 'API Cabinet Médical',
        'status': 'online',
        'health': '/api/health/',
        'admin': '/admin/',
    })


def erreur_404(request, exception=None):
    # Une API répond toujours en JSON, même pour une adresse inconnue (relevé par OWASP ZAP)
    if request.path.startswith('/api/'):
        return JsonResponse({'detail': 'Ressource introuvable.'}, status=404)
    from django.views.defaults import page_not_found
    return page_not_found(request, exception)


def erreur_500(request):
    if request.path.startswith('/api/'):
        return JsonResponse({'detail': 'Erreur interne du serveur.'}, status=500)
    from django.views.defaults import server_error
    return server_error(request)


handler404 = erreur_404
handler500 = erreur_500


@require_safe
def health(request):
    return JsonResponse({'status': 'ok'})


@require_safe
def metrics(request):
    return HttpResponse(
        prometheus_client.generate_latest(),
        content_type=prometheus_client.CONTENT_TYPE_LATEST
    )


urlpatterns = [
    path('', root_view, name='root'),
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
    path('api/examinations/', include('examinations.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/stocks/', include('pharmacie.urls')),
    path('api/planning/', include('planning.urls')),

    # Journal d'audit (administrateurs)
    path('api/audit/', include('audit.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    # Documentation interactive de l'API, en développement uniquement
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ]
