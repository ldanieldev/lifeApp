"""Tests for user models."""

from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class UserModelTests(TestCase):
    """Tests for custom User model."""

    def test_create_user(self):
        """Test creating a user with email and password."""
        email = "test@example.com"
        password = "TestPass123!"

        user = User.objects.create_user(email=email, password=password)

        self.assertEqual(user.email, email)
        self.assertTrue(user.check_password(password))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_superuser(self):
        """Test creating a superuser."""
        email = "admin@example.com"
        password = "AdminPass123!"

        user = User.objects.create_superuser(email=email, password=password)

        self.assertEqual(user.email, email)
        self.assertTrue(user.check_password(password))
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_user_email_normalized(self):
        """Test that email is normalized (lowercased)."""
        email = "Test@EXAMPLE.com"
        user = User.objects.create_user(email=email, password="TestPass123!")

        self.assertEqual(user.email, email.lower())

    def test_user_str_representation(self):
        """Test user string representation is email."""
        email = "test@example.com"
        user = User.objects.create_user(email=email, password="TestPass123!")

        self.assertEqual(str(user), email)

    def test_user_get_full_name(self):
        """Test getting user's full name."""
        user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
            first_name="John",
            last_name="Doe",
        )

        self.assertEqual(user.get_full_name(), "John Doe")

    def test_user_get_full_name_fallback(self):
        """Test get_full_name returns email when names not set."""
        email = "test@example.com"
        user = User.objects.create_user(email=email, password="TestPass123!")

        self.assertEqual(user.get_full_name(), email)

    def test_user_get_short_name(self):
        """Test getting user's short name."""
        user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
            first_name="John",
            last_name="Doe",
        )

        self.assertEqual(user.get_short_name(), "John")

    def test_user_get_short_name_fallback(self):
        """Test get_short_name returns email when first name not set."""
        email = "test@example.com"
        user = User.objects.create_user(email=email, password="TestPass123!")

        self.assertEqual(user.get_short_name(), email)

    def test_create_user_without_email(self):
        """Test creating user without email raises error."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="TestPass123!")

    def test_user_email_unique(self):
        """Test that email must be unique."""
        from django.db import IntegrityError

        email = "test@example.com"
        User.objects.create_user(email=email, password="TestPass123!")

        with self.assertRaises(IntegrityError):
            User.objects.create_user(email=email, password="DifferentPass123!")

    def test_user_sex_choices(self):
        """Test user sex field with valid choices."""
        user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
            sex=User.Sex.MALE,
        )

        self.assertEqual(user.sex, "M")

    def test_user_profile_picture_url(self):
        """Test user profile picture URL field."""
        url = "https://example.com/avatar.jpg"
        user = User.objects.create_user(
            email="test@example.com",
            password="TestPass123!",
            profile_picture_url=url,
        )

        self.assertEqual(user.profile_picture_url, url)

    def test_user_ordering(self):
        """Test users are ordered by date_joined descending."""
        user1 = User.objects.create_user(
            email="user1@example.com",
            password="TestPass123!",
        )
        user2 = User.objects.create_user(
            email="user2@example.com",
            password="TestPass123!",
        )

        users = list(User.objects.all())

        # Most recent should be first
        self.assertEqual(users[0], user2)
        self.assertEqual(users[1], user1)
