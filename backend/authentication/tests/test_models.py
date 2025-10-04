"""Tests for authentication models."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from authentication.models import Passkey

User = get_user_model()


class PasskeyModelTests(TestCase):
    """Tests for Passkey model."""

    def setUp(self):
        """Set up test user and passkey."""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
        )
        self.passkey = Passkey.objects.create(
            user=self.user,
            label="Test Device",
            credential_id="test_credential_id_base64",
            public_key="test_public_key_base64",
            sign_count=0,
        )

    def test_passkey_creation(self):
        """Test creating a passkey."""
        self.assertEqual(self.passkey.user, self.user)
        self.assertEqual(self.passkey.label, "Test Device")
        self.assertEqual(self.passkey.sign_count, 0)
        self.assertIsNotNone(self.passkey.created_at)
        self.assertIsNone(self.passkey.last_used_at)

    def test_passkey_str_representation(self):
        """Test passkey string representation."""
        expected = f"{self.user.email} - Test Device"
        self.assertEqual(str(self.passkey), expected)

    def test_update_last_used(self):
        """Test updating last_used_at timestamp."""
        self.assertIsNone(self.passkey.last_used_at)

        self.passkey.update_last_used()

        self.assertIsNotNone(self.passkey.last_used_at)

    def test_passkey_user_relationship(self):
        """Test passkey relationship with user."""
        passkeys = self.user.passkeys.all()

        self.assertEqual(passkeys.count(), 1)
        self.assertEqual(passkeys.first(), self.passkey)

    def test_passkey_ordering(self):
        """Test passkeys are ordered by creation date descending."""
        # Create another passkey
        passkey2 = Passkey.objects.create(
            user=self.user,
            label="Second Device",
            credential_id="test_credential_id_2",
            public_key="test_public_key_2",
        )

        passkeys = list(Passkey.objects.all())

        # Most recent should be first
        self.assertEqual(passkeys[0], passkey2)
        self.assertEqual(passkeys[1], self.passkey)

    def test_credential_id_unique(self):
        """Test that credential_id must be unique."""
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Passkey.objects.create(
                user=self.user,
                label="Duplicate",
                credential_id="test_credential_id_base64",  # Same as existing
                public_key="different_public_key",
            )
