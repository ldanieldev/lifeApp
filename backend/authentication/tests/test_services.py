"""Tests for authentication services (JWT and WebAuthn)."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from authentication.services import JWTService

User = get_user_model()


class JWTServiceTests(TestCase):
    """Tests for JWT service."""

    def setUp(self):
        """Set up test user."""
        self.user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
        )

    def test_generate_access_token(self):
        """Test access token generation."""
        token = JWTService.generate_access_token(self.user)

        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 0)

    def test_generate_refresh_token(self):
        """Test refresh token generation."""
        token = JWTService.generate_refresh_token(self.user)

        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 0)

    def test_generate_tokens(self):
        """Test generating both tokens at once."""
        tokens = JWTService.generate_tokens(self.user)

        self.assertIn("access_token", tokens)
        self.assertIn("refresh_token", tokens)
        self.assertIsInstance(tokens["access_token"], str)
        self.assertIsInstance(tokens["refresh_token"], str)

    def test_verify_access_token(self):
        """Test verifying access token."""
        token = JWTService.generate_access_token(self.user)
        verified_user = JWTService.verify_access_token(token)

        self.assertEqual(verified_user.id, self.user.id)
        self.assertEqual(verified_user.email, self.user.email)

    def test_verify_refresh_token(self):
        """Test verifying refresh token."""
        token = JWTService.generate_refresh_token(self.user)
        verified_user = JWTService.verify_refresh_token(token)

        self.assertEqual(verified_user.id, self.user.id)
        self.assertEqual(verified_user.email, self.user.email)

    def test_verify_invalid_token(self):
        """Test verifying invalid token returns None."""
        verified_user = JWTService.verify_access_token("invalid_token")

        self.assertIsNone(verified_user)

    def test_verify_wrong_token_type(self):
        """Test verifying refresh token as access token fails."""
        refresh_token = JWTService.generate_refresh_token(self.user)
        verified_user = JWTService.verify_access_token(refresh_token)

        self.assertIsNone(verified_user)

    def test_decode_token(self):
        """Test decoding token payload."""
        token = JWTService.generate_access_token(self.user)
        payload = JWTService.decode_token(token)

        self.assertIsNotNone(payload)
        self.assertEqual(payload["user_id"], self.user.id)
        self.assertEqual(payload["email"], self.user.email)
        self.assertEqual(payload["type"], "access")

    def test_verify_inactive_user_token(self):
        """Test that inactive user tokens are rejected."""
        token = JWTService.generate_access_token(self.user)

        # Deactivate user
        self.user.is_active = False
        self.user.save()

        verified_user = JWTService.verify_access_token(token)

        self.assertIsNone(verified_user)
