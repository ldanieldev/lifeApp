"""Models for the notifications app.

This module contains:
- NotificationPreference: User's notification channel preferences
- PushSubscription: Browser push subscription (one per device/browser)
- NotificationLog: Audit log of sent notifications
"""

from django.conf import settings
from django.db import models


class NotificationPreference(models.Model):
    """User's notification channel preferences."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    # Future: sms_enabled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self) -> str:
        return f"NotificationPreference for {self.user.email}"


class PushSubscription(models.Model):
    """Browser push subscription (one per device/browser)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.URLField(max_length=500)
    p256dh_key = models.CharField(max_length=100)  # Public key
    auth_key = models.CharField(max_length=50)  # Auth secret
    user_agent = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"
        unique_together = ["user", "endpoint"]

    def __str__(self) -> str:
        return f"PushSubscription for {self.user.email}"


class NotificationLog(models.Model):
    """Audit log of sent notifications."""

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        PUSH = "push", "Push"
        SMS = "sms", "SMS"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_logs",
    )
    channel = models.CharField(max_length=10, choices=Channel.choices)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)  # Feature-specific data
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Notification Log"
        verbose_name_plural = "Notification Logs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.channel} to {self.user.email}: {self.title}"
