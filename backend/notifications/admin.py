"""Admin configuration for the notifications app."""

from django.contrib import admin

from .models import NotificationLog, NotificationPreference, PushSubscription


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin configuration for NotificationPreference model."""

    list_display = ("user", "email_enabled", "push_enabled", "updated_at")
    list_filter = ("email_enabled", "push_enabled")
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    """Admin configuration for PushSubscription model."""

    list_display = ("user", "endpoint_truncated", "user_agent_truncated", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "endpoint")
    readonly_fields = ("created_at",)

    def endpoint_truncated(self, obj: PushSubscription) -> str:
        """Return truncated endpoint for display."""
        return obj.endpoint[:50] + "..." if len(obj.endpoint) > 50 else obj.endpoint

    endpoint_truncated.short_description = "Endpoint"

    def user_agent_truncated(self, obj: PushSubscription) -> str:
        """Return truncated user agent for display."""
        return obj.user_agent[:30] + "..." if len(obj.user_agent) > 30 else obj.user_agent

    user_agent_truncated.short_description = "User Agent"


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """Admin configuration for NotificationLog model."""

    list_display = ("user", "channel", "status", "title", "created_at", "sent_at")
    list_filter = ("channel", "status", "created_at")
    search_fields = ("user__email", "title", "body")
    readonly_fields = ("created_at", "sent_at")
    ordering = ("-created_at",)
