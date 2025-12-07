"""DRF serializers for the notifications app."""

from rest_framework import serializers

from .models import NotificationLog, NotificationPreference


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences."""

    class Meta:
        model = NotificationPreference
        fields = ["email_enabled", "push_enabled"]


class PushSubscriptionSerializer(serializers.Serializer):
    """Serializer for creating/updating push subscriptions.

    Note: Using Serializer instead of ModelSerializer because
    the field names differ between frontend (camelCase) and model (snake_case).
    The djangorestframework-camel-case middleware converts p256dhKey to p_256dh_key
    (inserts underscore after digit-to-letter boundary), so we use that field name.
    """

    endpoint = serializers.URLField(max_length=500)
    # p256dhKey (camelCase) -> p_256dh_key (snake_case via djangorestframework-camel-case)
    p_256dh_key = serializers.CharField(max_length=100)
    auth_key = serializers.CharField(max_length=50)
    user_agent = serializers.CharField(max_length=200, required=False, allow_blank=True)


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification history logs."""

    class Meta:
        model = NotificationLog
        fields = ["id", "channel", "status", "title", "body", "created_at", "sent_at"]
        read_only_fields = fields
