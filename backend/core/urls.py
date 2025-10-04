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
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Admin
    path("admin/", admin.site.urls),
    # Authentication API
    path("api/auth/", include("authentication.urls")),
    # allauth headless (for OAuth providers)
    path("api/auth/", include("allauth.headless.urls")),
]

if "debug_toolbar" in settings.INSTALLED_APPS and getattr(settings, "DEBUG", False):
    urlpatterns += debug_toolbar_urls()
