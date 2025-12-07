"""Tests for the notifications app models."""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from notifications.models import NotificationLog, NotificationPreference, PushSubscription

User = get_user_model()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(email="test@example.com", password="testpassword123")


@pytest.mark.django_db
class TestNotificationPreference:
    """Tests for the NotificationPreference model."""

    def test_create_preference(self, user):
        """Test creating notification preferences."""
        pref = NotificationPreference.objects.create(
            user=user,
            email_enabled=True,
            push_enabled=False,
        )
        assert pref.email_enabled is True
        assert pref.push_enabled is False
        assert str(pref) == f"NotificationPreference for {user.email}"

    def test_default_values(self, user):
        """Test that default values are set correctly."""
        pref = NotificationPreference.objects.create(user=user)
        assert pref.email_enabled is True
        assert pref.push_enabled is True

    def test_one_preference_per_user(self, user):
        """Test that only one preference can exist per user."""
        NotificationPreference.objects.create(user=user)
        with pytest.raises(IntegrityError):
            NotificationPreference.objects.create(user=user)


@pytest.mark.django_db
class TestPushSubscription:
    """Tests for the PushSubscription model."""

    def test_create_subscription(self, user):
        """Test creating a push subscription."""
        sub = PushSubscription.objects.create(
            user=user,
            endpoint="https://fcm.googleapis.com/fcm/send/example",
            p256dh_key="test_p256dh_key",
            auth_key="test_auth_key",
            user_agent="Mozilla/5.0 Test Browser",
        )
        assert sub.endpoint == "https://fcm.googleapis.com/fcm/send/example"
        assert sub.p256dh_key == "test_p256dh_key"
        assert sub.auth_key == "test_auth_key"
        assert str(sub) == f"PushSubscription for {user.email}"

    def test_unique_together(self, user):
        """Test that endpoint is unique per user."""
        endpoint = "https://fcm.googleapis.com/fcm/send/example"
        PushSubscription.objects.create(
            user=user,
            endpoint=endpoint,
            p256dh_key="key1",
            auth_key="auth1",
        )
        with pytest.raises(IntegrityError):
            PushSubscription.objects.create(
                user=user,
                endpoint=endpoint,
                p256dh_key="key2",
                auth_key="auth2",
            )


@pytest.mark.django_db
class TestNotificationLog:
    """Tests for the NotificationLog model."""

    def test_create_log(self, user):
        """Test creating a notification log entry."""
        log = NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.Channel.EMAIL,
            title="Test Notification",
            body="This is a test notification body.",
            metadata={"feature": "test"},
        )
        assert log.status == NotificationLog.Status.PENDING
        assert log.channel == "email"
        assert log.title == "Test Notification"
        assert log.metadata == {"feature": "test"}
        assert str(log) == f"email to {user.email}: Test Notification"

    def test_status_choices(self, user):
        """Test that status can be updated."""
        log = NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.Channel.PUSH,
            title="Push Notification",
            body="Test body",
        )
        assert log.status == NotificationLog.Status.PENDING

        log.status = NotificationLog.Status.SENT
        log.save()
        log.refresh_from_db()
        assert log.status == NotificationLog.Status.SENT

    def test_ordering(self, user):
        """Test that logs are ordered by created_at descending."""
        log1 = NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.Channel.EMAIL,
            title="First",
            body="Body",
        )
        log2 = NotificationLog.objects.create(
            user=user,
            channel=NotificationLog.Channel.EMAIL,
            title="Second",
            body="Body",
        )
        logs = list(NotificationLog.objects.filter(user=user))
        assert logs[0].id == log2.id
        assert logs[1].id == log1.id
