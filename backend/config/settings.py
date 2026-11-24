"""
Django settings for the "Gestion de Patients" project.
Backend: Django + Django REST Framework + PostgreSQL + JWT
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Sécurité / environnement ---------------------------------------------
SECRET_KEY = config(
    'DJANGO_SECRET_KEY',
    default='django-insecure-change-me-in-.env'
)
DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config(
    'DJANGO_ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=Csv()
)
if 'backend' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('backend')
render_host = config('RENDER_EXTERNAL_HOSTNAME', default=None)
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)
if '.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('.onrender.com')

CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
    cast=Csv(),
)
if render_host:
    origin = f'https://{render_host}'
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)
if 'https://*.onrender.com' not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append('https://*.onrender.com')

# Derrière un proxy HTTPS (Caddy sur la VM) : le proxy transmet le schéma d'origine,
# pour que Django génère des liens en https:// et n'envoie les cookies qu'en HTTPS.
if config('DJANGO_DERRIERE_PROXY_HTTPS', default=False, cast=bool):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# --- Applications ------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Tiers
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',

    # Applications métier
    'accounts',
    'patients',
    'appointments',
    'consultations',
    'prescriptions',
    'billing',
    'examinations',
    'pharmacie',
    'planning',
    'audit',
]

AUTH_USER_MODEL = 'accounts.Utilisateur'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'audit.middleware.JournalAuditMiddleware',
]

try:
    import whitenoise  # noqa: F401
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': (
                'whitenoise.storage.CompressedManifestStaticFilesStorage'
            ),
        },
    }
except ImportError:
    pass

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# --- Base de données : PostgreSQL (via variables d'environnement) ----------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='gestion_patients'),
        'USER': config('POSTGRES_USER', default='postgres'),
        'PASSWORD': config('POSTGRES_PASSWORD', default='postgres'),
        'HOST': config('POSTGRES_HOST', default='db'),
        'PORT': config('POSTGRES_PORT', default='5432'),
    }
}

database_url = config('DATABASE_URL', default=None)
if database_url:
    try:
        import dj_database_url
        DATABASES['default'] = dj_database_url.parse(
            database_url,
            conn_max_age=600,
            conn_health_checks=True,
        )
    except ImportError:
        import urllib.parse
        parsed = urllib.parse.urlparse(database_url)
        DATABASES['default'] = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': parsed.username or '',
            'PASSWORD': urllib.parse.unquote(parsed.password or ''),
            'HOST': parsed.hostname or '',
            'PORT': str(parsed.port or 5432),
        }
        query_params = urllib.parse.parse_qs(parsed.query)
        if 'sslmode' in query_params:
            DATABASES['default'].setdefault('OPTIONS', {})['sslmode'] = (
                query_params['sslmode'][0]
            )

    # Si le nom de la base est manquant dans l'URL (ex: /neondb omis)
    if not DATABASES['default'].get('NAME'):
        DATABASES['default']['NAME'] = config('POSTGRES_DB', default='neondb')


# --- Validation des mots de passe -------------------------------------------
# Hachage des mots de passe : Argon2 (exigence 4.4 du cahier des charges).
# PBKDF2 reste accepté pour les comptes existants, convertis en Argon2 à leur prochaine connexion.
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- Internationalisation (FR / MG / EN prévus au cahier des charges) ------
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Indian/Antananarivo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Django REST Framework --------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# --- Journal d'audit -----------------------------------------------------------
# En production, l'API est derrière un proxy (Nginx ou Render) : l'adresse du client
# est alors lue dans X-Forwarded-For. Conservation des entrées : voir purger_journal_audit.
AUDIT_DERRIERE_PROXY = config('AUDIT_DERRIERE_PROXY', default=not DEBUG, cast=bool)
AUDIT_CONSERVATION_JOURS = config('AUDIT_CONSERVATION_JOURS', default=365, cast=int)

# --- Rendez-vous ---------------------------------------------------------------
# Durée d'un créneau de rendez-vous : deux RDV d'un même médecin (ou patient) ne
# peuvent pas commencer à moins de cette durée l'un de l'autre.
DUREE_RDV_MINUTES = config('DUREE_RDV_MINUTES', default=15, cast=int)

# --- Description OpenAPI de l'API (drf-spectacular) --------------------------
# Utilisée par le scan de sécurité OWASP ZAP du pipeline CI et, en développement,
# par la documentation interactive /api/docs/.
SPECTACULAR_SETTINGS = {
    'TITLE': 'API Gestion des patients',
    'DESCRIPTION': 'API REST du cabinet médical (Django REST Framework, authentification JWT).',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SERVERS': [{'url': config('API_PUBLIC_URL', default='http://localhost:8000')}],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
}

# --- CORS (frontend Next.js) ------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000',
    cast=Csv(),
)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https:\/\/.*\.onrender\.com$',
]


# Configuration Email (SMTP)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='mailpit')
EMAIL_PORT = config('EMAIL_PORT', default=1025, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=False, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@gestion-patients.local')
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=5, cast=int)
# Si l'email ne part pas, écrire le code de réinitialisation dans les journaux du serveur.
# Développement uniquement : en production, quiconque lit les journaux prendrait n'importe quel compte.
OTP_DANS_LES_JOURNAUX = config('OTP_DANS_LES_JOURNAUX', default=DEBUG, cast=bool)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Tarif de consultation (par défaut 20 000 Ar)
TARIF_CONSULTATION = config('TARIF_CONSULTATION', default=20000, cast=int)

# Identité du cabinet imprimée sur les reçus, ordonnances et demandes d'examens
CABINET_NOM = config('CABINET_NOM', default='CENTRE MÉDICAL GESTION PATIENTS')
CABINET_ADRESSE = config('CABINET_ADRESSE', default='Antananarivo, Madagascar')
CABINET_TELEPHONE = config('CABINET_TELEPHONE', default='+261 34 00 000 00')
CABINET_VILLE = config('CABINET_VILLE', default='Antananarivo')

# Journaux applicatifs sur la sortie standard, collectés par Alloy puis Loki
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': config('DJANGO_LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django.db.backends': {'level': 'WARNING'},
    },
}
