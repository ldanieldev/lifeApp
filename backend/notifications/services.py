"""Notification services for email and push delivery.

This module provides the core functionality for sending notifications:
- send_email_notification: Send email notification to a user
- send_push_notification: Send web push to a single subscription
- dispatch_notification: High-level function to dispatch notifications via preferred channels
"""

import json
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_email_notification(
    user,
    title: str,
    body: str,
    html_body: str | None = None,
) -> bool:
    """Send email notification to user.

    Args:
        user: User instance to send email to
        title: Email subject
        body: Plain text email body
        html_body: Optional HTML email body

    Returns:
        True if email was sent successfully

    Raises:
        Exception: If email sending fails

    """
    try:
        send_mail(
            subject=title,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_body,
        )
        logger.info(f"Email notification sent to {user.email}: {title}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {user.email}: {e}")
        raise


def send_push_notification(
    subscription,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """Send web push to a single subscription.

    Args:
        subscription: PushSubscription model instance
        title: Notification title
        body: Notification body text
        data: Optional dict of additional data (e.g., type, url)

    Returns:
        True if push was sent successfully

    Raises:
        WebPushException: If push sending fails

    """
    from pywebpush import WebPushException, webpush

    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "data": data or {},
        }
    )

    vapid_private_key = getattr(settings, "VAPID_PRIVATE_KEY", "")
    vapid_admin_email = getattr(settings, "VAPID_ADMIN_EMAIL", "admin@example.com")

    if not vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY not configured, skipping push notification")
        return False

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh_key,
                    "auth": subscription.auth_key,
                },
            },
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": f"mailto:{vapid_admin_email}"},
        )
        logger.info(f"Push notification sent to {subscription.user.email}")
        return True
    except WebPushException as e:
        logger.error(f"Failed to send push to {subscription.endpoint}: {e}")
        # If subscription is invalid (expired or revoked), delete it
        if e.response and e.response.status_code in [404, 410]:
            subscription.delete()
            logger.info(f"Deleted invalid subscription: {subscription.endpoint}")
        raise


def dispatch_notification(
    user,
    title: str,
    body: str,
    channels: list[str] | None = None,
    data: dict | None = None,
) -> None:
    """Dispatch notification to user via their preferred channels.

    This is the main entry point for sending notifications.
    It queues the notification for async delivery via Celery.

    Called by feature apps (habits, todos, fitness).

    Args:
        user: User instance
        title: Notification title
        body: Notification body text
        channels: List of channels ['email', 'push'] or None for user preferences
        data: Dict of feature-specific metadata

    Example:
        dispatch_notification(
            user=habit.user,
            title=f"Habit Reminder: {habit.name}",
            body="Don't forget to complete your habit today!",
            data={'type': 'habit_reminder', 'habit_id': habit.id}
        )

    """
    from .tasks import send_notification_task

    send_notification_task.delay(user.id, title, body, channels, data)
