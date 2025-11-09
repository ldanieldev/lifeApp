"""Django settings for the core backend application.

This module configures environment variables, installed apps, middleware,
database, cache, authentication, internationalization, and other settings.
"""

from pathlib import Path

import environ

env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = env.bool("DEBUG", default=False)

SECRET_KEY = env("SECRET_KEY", default="django-insecure-2)%v=6)niyb7)mu*k8b$aj5_l^3uar&t$tm8z$uf#oy*#z8n3&")
REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

# Debug toolbar configuration
INTERNAL_IPS = [
    "127.0.0.1",
]

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True


# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django_extensions",
    "debug_toolbar",
    "corsheaders",
    "drf_spectacular",
    "rest_framework",
    "django_filters",
    # django-allauth (headless mode)
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
    "allauth.mfa",
    "allauth.headless",
    "allauth.usersessions",
    # Custom apps
    "users",
    "authentication",
    "emails",
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",  # Required for allauth
    "allauth.usersessions.middleware.UserSessionsMiddleware",  # rack user sessions
    # Transform allauth responses to camelCase
    "core.middleware.AllauthCamelCaseMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# Database configuration
DATABASES = {"default": env.db()}

# Cache configuration
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# Session storage using Redis
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# Elasticsearch Configuration
ELASTICSEARCH_DSL = {
    "default": {"hosts": env("ELASTICSEARCH_URL", default="http://elasticsearch:9200")},
}

# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@lifeapp.com")
SERVER_EMAIL = env("SERVER_EMAIL", default="server@lifeapp.com")


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SITE_ID = 1

# Custom User Model
AUTH_USER_MODEL = "users.User"

# Authentication Backend
AUTHENTICATION_BACKENDS = ("allauth.account.auth_backends.AuthenticationBackend",)

# django-allauth Headless Configuration
HEADLESS_ONLY = True  # Disable template-based views
HEADLESS_FRONTEND_URLS = {
    "account_confirm_email": "http://localhost:3000/auth/verify-email/{key}",
    "account_reset_password": "http://localhost:3000/auth/password/reset",
    "account_reset_password_from_key": "http://localhost:3000/auth/password/reset/{key}",
    "account_signup": "http://localhost:3000/auth/signup",
    # OAuth callback - use single callback URL for all providers (not per-provider)
    "socialaccount_login_error": "http://localhost:3000/auth/oauth/callback",
}
# Serve OpenAPI spec at /_allauth/openapi.html
HEADLESS_SERVE_SPECIFICATION = True

# Account Settings
ACCOUNT_LOGIN_METHODS = {"email"}  # Use email for login (no username)
ACCOUNT_USER_MODEL_USERNAME_FIELD = None  # No username field - email only
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]  # Required signup fields
# Required for email/password accounts
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_BY_CODE_ENABLED = True  # Magic link login
ACCOUNT_EMAIL_VERIFICATION_BY_CODE_ENABLED = True  # Code-based verification
# Allow resending verification codes
ACCOUNT_EMAIL_VERIFICATION_SUPPORTS_RESEND = True
ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE = False

# Social Account Settings
SOCIALACCOUNT_AUTO_SIGNUP = True  # Auto-create account from social login
# Skip verification for social accounts
SOCIALACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_QUERY_EMAIL = True  # Auto-link by email across providers
SOCIALACCOUNT_STORE_TOKENS = True  # Store OAuth tokens for profile sync
# Allow login via OAuth with matching email
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
# Auto-link OAuth to existing account with same email
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True

# MFA/WebAuthn/Passkey Configuration
MFA_SUPPORTED_TYPES = ["totp", "recovery_codes", "webauthn"]
MFA_PASSKEY_LOGIN_ENABLED = True  # Allow login with passkey
MFA_PASSKEY_SIGNUP_ENABLED = True  # Allow signup with passkey

# User Sessions Configuration
# Track IP address, user agent, and last seen timestamp
USERSESSIONS_TRACK_ACTIVITY = True

# OAuth Provider Configuration
# NOTE: OAuth providers are configured via SocialApp database entries, not here.
# See: python manage.py shell -> SocialApp.objects.all()
# Run: python manage.py setup_oauth_providers
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": [
            "profile",
            "email",
        ],
        "AUTH_PARAMS": {
            "access_type": "online",
        },
    },
    "github": {
        "SCOPE": [
            "user",
            "user:email",
        ],
    },
}

REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": [
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        # XSessionTokenAuthentication can be added here for mobile app mode
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Life App API",
    "DESCRIPTION": "Authentication and user management API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api",
}

# Environment-specific configuration
if DEBUG:
    # Debug toolbar middleware
    MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")

    # Browsable API renderer with camelCase support
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(
        "djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer"
    )

    # Development email - Mailpit
    EMAIL_HOST = env("EMAIL_HOST", default="mailpit")
    EMAIL_PORT = env.int("EMAIL_PORT", default=1025)
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = False

    # CSRF trusted origins for development (frontend on different port)
    CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000", "http://127.0.0.1:3000"])

    # Allow insecure origin for WebAuthn in development (localhost)
    MFA_WEBAUTHN_ALLOW_INSECURE_ORIGIN = True
else:
    # Production email - SMTP
    EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")

    # Secure cookies when using HTTPS (even behind reverse proxy)
    SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
    CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)

    # CSRF protection for cross-origin requests from React frontend
    # Example: CSRF_TRUSTED_ORIGINS=https://app.example.com,https://example.com
    CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

    # WebAuthn requires HTTPS in production
    MFA_WEBAUTHN_ALLOW_INSECURE_ORIGIN = False
