"""API views for the authentication app."""

import logging

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth import get_user_model, logout
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from authentication.models import Passkey
from authentication.permissions import IsOwner
from authentication.serializers import (
    EmailVerificationSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasskeyAuthenticationBeginSerializer,
    PasskeyAuthenticationCompleteSerializer,
    PasskeyRegistrationBeginSerializer,
    PasskeyRegistrationCompleteSerializer,
    PasskeySerializer,
    PasskeySignupBeginSerializer,
    PasskeySignupCompleteSerializer,
    PasskeyUpdateSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProviderSerializer,
    RegisterSerializer,
    TokenRefreshSerializer,
)
from authentication.services import JWTService, WebAuthnService
from emails.services import EmailService
from users.serializers import UserSerializer, UserUpdateSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(generics.GenericAPIView):
    """API view for user registration with email/password."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Register a new user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        tokens = JWTService.generate_tokens(user)

        # Send verification email (in production, this should be async)
        verification_token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        verification_url = f"{settings.CORS_ALLOWED_ORIGINS[0]}/auth/email/verify/confirm/{uid}/{verification_token}/"
        EmailService.send_email_verification(user.email, verification_url)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "message": "Registration successful. Please check your email to verify your account.",
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(generics.GenericAPIView):
    """API view for user login with email/password."""

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Login user and return JWT tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        tokens = JWTService.generate_tokens(user)

        # Set refresh token as httpOnly cookie
        response = Response(
            {
                "user": UserSerializer(user).data,
                "access_token": tokens["access_token"],
            },
            status=status.HTTP_200_OK,
        )
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            max_age=settings.JWT_REFRESH_TOKEN_LIFETIME * 24 * 60 * 60,  # Convert days to seconds
        )

        return response


class LogoutView(generics.GenericAPIView):
    """API view for user logout."""

    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Logout user and clear refresh token cookie."""
        logout(request)
        response = Response(
            {"message": "Logout successful"},
            status=status.HTTP_200_OK,
        )
        response.delete_cookie("refresh_token")
        return response


class TokenRefreshView(generics.GenericAPIView):
    """API view for refreshing access token."""

    serializer_class = TokenRefreshSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Refresh access token using refresh token from cookie or body."""
        # Try to get refresh token from cookie first, then from body
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            if "refresh_token" not in request.data:
                return Response(
                    {"error": "missing_token", "message": "Refresh token is required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            refresh_token = serializer.validated_data["refresh_token"]

        # Verify refresh token
        user = JWTService.verify_refresh_token(refresh_token)
        if not user:
            return Response(
                {"error": "invalid_token", "message": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Generate new access token
        access_token = JWTService.generate_access_token(user)

        return Response(
            {
                "access_token": access_token,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(generics.GenericAPIView):
    """API view for requesting password reset."""

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Send password reset email."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.CORS_ALLOWED_ORIGINS[0]}/auth/password/reset/confirm/{uid}/{token}/"

            # Send password reset email
            EmailService.send_password_reset_email(user.email, reset_url)
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist
            pass

        return Response(
            {"message": "If the email exists, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    """API view for confirming password reset."""

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        """Reset password using token."""
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "invalid_token", "message": "Invalid reset link"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "invalid_token", "message": "Invalid or expired reset link"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Set new password
        user.set_password(serializer.validated_data["password"])
        user.save()

        return Response(
            {"message": "Password has been reset successfully"},
            status=status.HTTP_200_OK,
        )


class PasswordChangeView(generics.GenericAPIView):
    """API view for changing password (authenticated users)."""

    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Change user password."""
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Set new password
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()

        return Response(
            {"message": "Password changed successfully"},
            status=status.HTTP_200_OK,
        )


class EmailVerificationView(generics.GenericAPIView):
    """API view for email verification."""

    serializer_class = EmailVerificationSerializer
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        """Verify email using token."""
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "invalid_token", "message": "Invalid verification link"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "invalid_token", "message": "Invalid or expired verification link"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark email as verified (you might want to add a field to track this)
        user.is_active = True
        user.save()

        return Response(
            {"message": "Email verified successfully"},
            status=status.HTTP_200_OK,
        )


# Passkey Views


class PasskeyRegistrationBeginView(generics.GenericAPIView):
    """API view for beginning passkey registration."""

    serializer_class = PasskeyRegistrationBeginSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Begin passkey registration ceremony."""
        webauthn_service = WebAuthnService()
        options = webauthn_service.begin_registration(request.user)

        return Response(options, status=status.HTTP_200_OK)


class PasskeyRegistrationCompleteView(generics.GenericAPIView):
    """API view for completing passkey registration."""

    serializer_class = PasskeyRegistrationCompleteSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Complete passkey registration ceremony."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        webauthn_service = WebAuthnService()
        try:
            passkey = webauthn_service.complete_registration(
                user=request.user,
                credential_data=serializer.validated_data["credential"],
                state=serializer.validated_data["state"],
                label=serializer.validated_data["label"],
            )

            return Response(
                {
                    "passkey": PasskeySerializer(passkey).data,
                    "message": "Passkey registered successfully",
                },
                status=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return Response(
                {"error": "registration_failed", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PasskeyAuthenticationBeginView(generics.GenericAPIView):
    """API view for beginning passkey authentication."""

    serializer_class = PasskeyAuthenticationBeginSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Begin passkey authentication ceremony."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        webauthn_service = WebAuthnService()
        options = webauthn_service.begin_authentication(email=serializer.validated_data.get("email"))

        return Response(options, status=status.HTTP_200_OK)


class PasskeyAuthenticationCompleteView(generics.GenericAPIView):
    """API view for completing passkey authentication."""

    serializer_class = PasskeyAuthenticationCompleteSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Complete passkey authentication ceremony and return JWT tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        webauthn_service = WebAuthnService()
        try:
            user = webauthn_service.complete_authentication(
                credential_data=serializer.validated_data["credential"],
                state=serializer.validated_data["state"],
            )

            tokens = JWTService.generate_tokens(user)

            # Set refresh token as httpOnly cookie
            response = Response(
                {
                    "user": UserSerializer(user).data,
                    "access_token": tokens["access_token"],
                },
                status=status.HTTP_200_OK,
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh_token"],
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=settings.JWT_REFRESH_TOKEN_LIFETIME * 24 * 60 * 60,
            )

            return response

        except ValueError as e:
            return Response(
                {"error": "authentication_failed", "message": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class PasskeySignupBeginView(generics.GenericAPIView):
    """API view for beginning passkey signup (passwordless registration)."""

    serializer_class = PasskeySignupBeginSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Begin passkey signup ceremony."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create temporary user (not saved yet)
        user = User(
            email=serializer.validated_data["email"],
            first_name=serializer.validated_data.get("first_name", ""),
            last_name=serializer.validated_data.get("last_name", ""),
        )
        user.set_unusable_password()

        webauthn_service = WebAuthnService()
        options = webauthn_service.begin_registration(user)

        return Response(options, status=status.HTTP_200_OK)


class PasskeySignupCompleteView(generics.GenericAPIView):
    """API view for completing passkey signup."""

    serializer_class = PasskeySignupCompleteSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        """Complete passkey signup ceremony and create user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create user
        user = User.objects.create_user(
            email=serializer.validated_data["email"],
            first_name=serializer.validated_data.get("first_name", ""),
            last_name=serializer.validated_data.get("last_name", ""),
        )
        user.set_unusable_password()
        user.save()

        webauthn_service = WebAuthnService()
        try:
            webauthn_service.complete_registration(
                user=user,
                credential_data=serializer.validated_data["credential"],
                state=serializer.validated_data["state"],
                label=serializer.validated_data["label"],
            )

            tokens = JWTService.generate_tokens(user)

            # Set refresh token as httpOnly cookie
            response = Response(
                {
                    "user": UserSerializer(user).data,
                    "access_token": tokens["access_token"],
                    "message": "Account created successfully with passkey",
                },
                status=status.HTTP_201_CREATED,
            )
            response.set_cookie(
                key="refresh_token",
                value=tokens["refresh_token"],
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=settings.JWT_REFRESH_TOKEN_LIFETIME * 24 * 60 * 60,
            )

            return response

        except ValueError as e:
            # Delete user if passkey registration fails
            user.delete()
            return Response(
                {"error": "signup_failed", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


# User Account Views


class UserProfileView(generics.RetrieveUpdateDestroyAPIView):
    """API view for user profile management."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        """Return the current user."""
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        """Delete user account and all associated data."""
        user = self.get_object()
        user.delete()
        return Response(
            {"message": "Account deleted successfully"},
            status=status.HTTP_200_OK,
        )


class UserPasskeyListView(generics.ListCreateAPIView):
    """API view for listing and creating user passkeys."""

    serializer_class = PasskeySerializer
    permission_classes = [IsAuthenticated]
    queryset = Passkey.objects.none()  # Required for schema generation

    def get_queryset(self):
        """Return passkeys for the current user."""
        if getattr(self, "swagger_fake_view", False):
            return Passkey.objects.none()
        return Passkey.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Redirect to begin registration endpoint for two-step passkey creation."""
        return Response(
            {"message": "Use /api/auth/passkey/register/begin to add a new passkey"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UserPasskeyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API view for managing individual passkeys."""

    permission_classes = [IsAuthenticated, IsOwner]
    queryset = Passkey.objects.none()  # Required for schema generation

    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method in ["PUT", "PATCH"]:
            return PasskeyUpdateSerializer
        return PasskeySerializer

    def get_queryset(self):
        """Return passkeys for the current user."""
        if getattr(self, "swagger_fake_view", False):
            return Passkey.objects.none()
        return Passkey.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        """Update passkey label."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        instance.label = serializer.validated_data["label"]
        instance.save()

        return Response(
            PasskeySerializer(instance).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        """Delete passkey if not the last authentication method."""
        passkey = self.get_object()
        user = passkey.user

        # Check if this is the last passkey and user has no password
        passkey_count = Passkey.objects.filter(user=user).count()
        has_password = user.has_usable_password()
        has_social = SocialAccount.objects.filter(user=user).exists()

        if passkey_count == 1 and not has_password and not has_social:
            return Response(
                {
                    "error": "cannot_delete_last_method",
                    "message": "Cannot delete the last authentication method. Add another method first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        passkey.delete()
        return Response(
            {"message": "Passkey deleted successfully"},
            status=status.HTTP_200_OK,
        )


class UserProvidersView(generics.GenericAPIView):
    """API view for listing connected authentication providers."""

    serializer_class = ProviderSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all authentication providers and connection status."""
        user = request.user

        providers = []

        # Email/password provider
        providers.append(
            {
                "provider": "password",
                "name": "Email/Password",
                "connected": user.has_usable_password(),
            }
        )

        # Social providers
        social_accounts = SocialAccount.objects.filter(user=user)
        for provider in ["google", "github"]:
            connected = social_accounts.filter(provider=provider).exists()
            providers.append(
                {
                    "provider": provider,
                    "name": provider.capitalize(),
                    "connected": connected,
                }
            )

        # Passkeys
        passkey_count = Passkey.objects.filter(user=user).count()
        providers.append(
            {
                "provider": "passkey",
                "name": "Passkeys",
                "connected": passkey_count > 0,
                "count": passkey_count,
            }
        )

        return Response(providers, status=status.HTTP_200_OK)
