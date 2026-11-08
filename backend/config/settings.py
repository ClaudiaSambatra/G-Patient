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

    # Applications métier
    'accounts',
    'patients',
    'appointments',
    'consultations',
    'prescriptions',
    'billing',
    'examinations',
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


# --- Validation des mots de passe -------------------------------------------
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
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Tarif de consultation (par défaut 20 000 Ar)
TARIF_CONSULTATION = config('TARIF_CONSULTATION', default=20000, cast=int)

# Accélération des tests unitaires (hasher rapide pour éviter la lenteur PBKDF2 en CI/tests)
import sys
if 'pytest' in sys.modules or any('pytest' in arg for arg in sys.argv) or 'test' in sys.argv:
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]
