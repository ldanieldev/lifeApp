"""Celery tasks for async notification delivery.

These tasks handle the actual sending of notifications asynchronously,
with retry logic for failed deliveries.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone

if TYPE_CHECKING:
    from .models import NotificationPreference

logger = logging.getLogger(__name__)
User = get_user_model()


def _get_channels_for_user(
    prefs: NotificationPreference,
    channels: list[str] | None,
) -> list[str]:
    """Determine notification channels based on user preferences.

    Args:
        prefs: User's notification preferences
        channels: Explicit channel list, or None to use preferences

    Returns:
        List of channel names to send to

    """
    if channels is not None:
        return channels

    result = []
    if prefs.email_enabled:
        result.append("email")
    if prefs.push_enabled:
        result.append("push")
    return result


def _send_to_channel(
    user,
    channel: str,
    title: str,
    body: str,
    data: dict | None,
) -> None:
    """Send notification via a single channel.

    Args:
        user: User to send notification to
        channel: Channel name ('email' or 'push')
        title: Notification title
        body: Notification body
        data: Optional metadata

    Raises:
        Exception: If email sending fails
        Exception: If all push subscriptions fail

    """
    from .services import send_email_notification, send_push_notification

    if channel == "email":
        send_email_notification(user, title, body)
        return

    if channel == "push":
        for sub in user.push_subscriptions.all():
            try:
                send_push_notification(sub, title, body, data)
            except Exception as e:
                logger.warning(f"Push to subscription {sub.id} failed: {e}")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_task(
    self,
    user_id: int,
    title: str,
    body: str,
    channels: list[str] | None = None,
    data: dict | None = None,
) -> dict:
    """Async task to send notifications via specified or preferred channels.

    Args:
        self: Celery task instance (bound task for retry access)
        user_id: ID of the user to send notifications to
        title: Notification title
        body: Notification body text
        channels: List of channels to use, or None to use user preferences
        data: Dict of feature-specific metadata

    Returns:
        Dict mapping channel to status ('sent' or 'failed')

    """
    from .models import NotificationLog, NotificationPreference

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {}

    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    channels_to_use = _get_channels_for_user(prefs, channels)
    results = {}

    for channel in channels_to_use:
        log = NotificationLog.objects.create(
            user=user,
            channel=channel,
            title=title,
            body=body,
            metadata=data or {},
        )

        try:
            _send_to_channel(user, channel, title, body, data)
            log.status = NotificationLog.Status.SENT
            log.sent_at = timezone.now()
            log.save()
            results[channel] = "sent"

        except Exception as e:
            log.status = NotificationLog.Status.FAILED
            log.error_message = str(e)
            log.save()
            results[channel] = "failed"
            logger.error(f"Failed to send {channel} notification to {user.email}: {e}")

    return results
