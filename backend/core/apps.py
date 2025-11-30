"""Core application configuration."""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Configuration for the core application."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        """Initialize application components when Django starts.

        This method is called once Django is ready and the registry is populated.
        """
        from django.conf import settings

        # Initialize telemetry/monitoring if enabled
        if getattr(settings, "ENABLE_MONITORING", False):
            from .telemetry import check_lgtm_connectivity, configure_loki_logging, configure_telemetry

            configure_telemetry()
            configure_loki_logging()
            check_lgtm_connectivity()
