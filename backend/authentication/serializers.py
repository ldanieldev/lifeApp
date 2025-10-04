"""Serializers for the authentication app."""

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from authentication.models import Passkey

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    """Serializer for user registration with email/password."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8, max_length=16)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        """Validate that email is not already registered."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered")
        return value.lower()

    def validate_password(self, value):
        """Validate password using Django's password validators."""
        validate_password(value)
        return value

    def create(self, validated_data):
        """Create a new user."""
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login with email/password."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        """Validate user credentials."""
        email = attrs.get("email", "").lower()
        password = attrs.get("password")

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
            attrs["user"] = user
        else:
            raise serializers.ValidationError("Must include email and password")

        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Validate that user exists."""
        try:
            user = User.objects.get(email=value.lower())
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist for security
            pass
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8, max_length=16)

    def validate_password(self, value):
        """Validate password using Django's password validators."""
        validate_password(value)
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change (authenticated users)."""

    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8, max_length=16)

    def validate_new_password(self, value):
        """Validate new password using Django's password validators."""
        validate_password(value)
        return value

    def validate(self, attrs):
        """Validate that old password is correct."""
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Incorrect password"})
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification."""

    token = serializers.CharField(required=True)


class PasskeySerializer(serializers.ModelSerializer):
    """Serializer for Passkey model."""

    class Meta:
        """Meta options for PasskeySerializer."""

        model = Passkey
        fields = [
            "id",
            "label",
            "created_at",
            "last_used_at",
        ]
        read_only_fields = ["id", "created_at", "last_used_at"]


class PasskeyRegistrationBeginSerializer(serializers.Serializer):
    """Serializer for beginning passkey registration."""

    # No fields needed - will use authenticated user from context
    pass


class PasskeyRegistrationCompleteSerializer(serializers.Serializer):
    """Serializer for completing passkey registration."""

    credential = serializers.JSONField(required=True)
    state = serializers.CharField(required=True)
    label = serializers.CharField(required=True, max_length=255)


class PasskeyAuthenticationBeginSerializer(serializers.Serializer):
    """Serializer for beginning passkey authentication."""

    email = serializers.EmailField(required=False, allow_null=True)


class PasskeyAuthenticationCompleteSerializer(serializers.Serializer):
    """Serializer for completing passkey authentication."""

    credential = serializers.JSONField(required=True)
    state = serializers.CharField(required=True)


class PasskeySignupBeginSerializer(serializers.Serializer):
    """Serializer for beginning passkey signup (passwordless registration)."""

    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        """Validate that email is not already registered."""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email is already registered")
        return value.lower()


class PasskeySignupCompleteSerializer(serializers.Serializer):
    """Serializer for completing passkey signup."""

    email = serializers.EmailField(required=True)
    credential = serializers.JSONField(required=True)
    state = serializers.CharField(required=True)
    label = serializers.CharField(required=True, max_length=255)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)


class PasskeyUpdateSerializer(serializers.Serializer):
    """Serializer for updating passkey label."""

    label = serializers.CharField(required=True, max_length=255)


class ProviderSerializer(serializers.Serializer):
    """Serializer for authentication provider info."""

    provider = serializers.CharField()
    name = serializers.CharField()
    connected = serializers.BooleanField()


class TokenRefreshSerializer(serializers.Serializer):
    """Serializer for token refresh."""

    refresh_token = serializers.CharField(required=True)


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout (no input required)."""

    pass


class MessageResponseSerializer(serializers.Serializer):
    """Serializer for simple message responses."""

    message = serializers.CharField()
