from django.apps import AppConfig


class VehicleMaintenanceTrackerConfig(AppConfig):
    """Configuration for the Vehicle Maintenance Tracker app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "vehicle_maintenance_tracker"
    verbose_name = "Vehicle Maintenance Tracker"

    def ready(self):
        """Import signals when app is ready."""
        # Import signals to register them
        try:
            from . import signals  # noqa: F401
        except ImportError:
            pass
