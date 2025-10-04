"""Tests for authentication views and API endpoints."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class AuthenticationTestCase(TestCase):
    """Base test case for authentication tests."""

    def setUp(self):
        """Set up test client and test data."""
        self.client = APIClient()
        self.user_data = {
            "email": "test@example.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
        }


class RegisterViewTests(AuthenticationTestCase):
    """Tests for user registration endpoint."""

    def test_register_success(self):
        """Test successful user registration."""
        response = self.client.post(
            reverse("authentication:register"),
            self.user_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], self.user_data["email"])

        # Verify user was created in database
        self.assertTrue(User.objects.filter(email=self.user_data["email"]).exists())

    def test_register_duplicate_email(self):
        """Test registration with duplicate email fails."""
        # Create first user
        User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
        )

        # Try to register with same email
        response = self.client.post(
            reverse("authentication:register"),
            self.user_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        """Test registration with weak password fails."""
        weak_data = self.user_data.copy()
        weak_data["password"] = "123"

        response = self.client.post(
            reverse("authentication:register"),
            weak_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginViewTests(AuthenticationTestCase):
    """Tests for user login endpoint."""

    def setUp(self):
        """Set up test user."""
        super().setUp()
        self.user = User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
        )

    def test_login_success(self):
        """Test successful login."""
        response = self.client.post(
            reverse("authentication:login"),
            {
                "email": self.user_data["email"],
                "password": self.user_data["password"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], self.user_data["email"])

        # Check refresh token cookie
        self.assertIn("refresh_token", response.cookies)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials fails."""
        response = self.client.post(
            reverse("authentication:login"),
            {
                "email": self.user_data["email"],
                "password": "wrongpassword",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        """Test login with non-existent user fails."""
        response = self.client.post(
            reverse("authentication:login"),
            {
                "email": "nonexistent@example.com",
                "password": "somepassword",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LogoutViewTests(AuthenticationTestCase):
    """Tests for user logout endpoint."""

    def setUp(self):
        """Set up authenticated user."""
        super().setUp()
        self.user = User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
        )
        self.client.force_authenticate(user=self.user)

    def test_logout_success(self):
        """Test successful logout."""
        response = self.client.post(reverse("authentication:logout"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_logout_unauthenticated(self):
        """Test logout without authentication fails."""
        self.client.force_authenticate(user=None)
        response = self.client.post(reverse("authentication:logout"))

        # DRF returns 403 Forbidden for unauthenticated requests
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TokenRefreshViewTests(AuthenticationTestCase):
    """Tests for token refresh endpoint."""

    def setUp(self):
        """Set up user and get refresh token."""
        super().setUp()
        self.user = User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
        )

        # Login to get refresh token
        login_response = self.client.post(
            reverse("authentication:login"),
            {
                "email": self.user_data["email"],
                "password": self.user_data["password"],
            },
            format="json",
        )
        self.refresh_token = login_response.cookies.get("refresh_token").value

    def test_refresh_token_success(self):
        """Test successful token refresh."""
        self.client.cookies["refresh_token"] = self.refresh_token

        response = self.client.post(reverse("authentication:token_refresh"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)

    def test_refresh_token_invalid(self):
        """Test token refresh with invalid token fails."""
        # Clear any cookies from previous requests
        self.client.cookies.clear()

        response = self.client.post(
            reverse("authentication:token_refresh"),
            {"refresh_token": "invalid_token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileViewTests(AuthenticationTestCase):
    """Tests for user profile endpoints."""

    def setUp(self):
        """Set up authenticated user."""
        super().setUp()
        self.user = User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
            first_name="Original",
            last_name="Name",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_profile(self):
        """Test getting user profile."""
        response = self.client.get(reverse("authentication:user_profile"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["first_name"], "Original")

    def test_update_profile(self):
        """Test updating user profile."""
        response = self.client.patch(
            reverse("authentication:user_profile"),
            {"first_name": "Updated", "last_name": "Name"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Updated")

        # Verify database was updated
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated")

    def test_delete_account(self):
        """Test deleting user account."""
        response = self.client.delete(reverse("authentication:user_profile"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify user was deleted
        self.assertFalse(User.objects.filter(id=self.user.id).exists())


class PasswordManagementTests(AuthenticationTestCase):
    """Tests for password reset and change endpoints."""

    def setUp(self):
        """Set up test user."""
        super().setUp()
        self.user = User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
        )

    def test_password_reset_request(self):
        """Test password reset request."""
        response = self.client.post(
            reverse("authentication:password_reset_request"),
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_password_reset_nonexistent_email(self):
        """Test password reset for non-existent email still returns success."""
        response = self.client.post(
            reverse("authentication:password_reset_request"),
            {"email": "nonexistent@example.com"},
            format="json",
        )

        # Should still return 200 to prevent email enumeration
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_password_change_authenticated(self):
        """Test password change for authenticated user."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("authentication:password_change"),
            {
                "old_password": self.user_data["password"],
                "new_password": "NewPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123!"))

    def test_password_change_wrong_old_password(self):
        """Test password change with incorrect old password fails."""
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("authentication:password_change"),
            {
                "old_password": "wrongpassword",
                "new_password": "NewPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProvidersViewTests(AuthenticationTestCase):
    """Tests for connected providers endpoint."""

    def setUp(self):
        """Set up authenticated user."""
        super().setUp()
        self.user = User.objects.create_user(
            email=self.user_data["email"],
            password=self.user_data["password"],
        )
        self.client.force_authenticate(user=self.user)

    def test_get_providers(self):
        """Test getting connected providers."""
        response = self.client.get(reverse("authentication:user_providers"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Check that password provider is listed
        provider_names = [p["provider"] for p in response.data]
        self.assertIn("password", provider_names)
        self.assertIn("google", provider_names)
        self.assertIn("github", provider_names)
        self.assertIn("passkey", provider_names)
