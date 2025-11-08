"""App configuration for the authentication application."""

from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    """Configuration for the authentication app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "authentication"
    verbose_name = "Authentication"

    def ready(self):
        """Import signal handlers when app is ready."""
        import authentication.signals  # noqa: F401
