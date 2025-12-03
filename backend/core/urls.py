"""URL configuration for the core backend module."""

from debug_toolbar.toolbar import debug_toolbar_urls
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # django-allauth OAuth redirect endpoints (now under /api for consistency)
    path("api/accounts/", include("allauth.urls")),
    # django-allauth Headless API
    path("api/_allauth/", include("allauth.headless.urls")),
    # Custom authentication endpoints
    path("api/auth/", include("authentication.urls")),
    # Todos API
    path("api/todos/", include("todos.urls")),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Prometheus metrics endpoint (for Mimir/Prometheus to scrape)
    path("", include("django_prometheus.urls")),
]

if "debug_toolbar" in settings.INSTALLED_APPS and getattr(settings, "DEBUG", False):
    urlpatterns += debug_toolbar_urls()
