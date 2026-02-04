"""Serializers for the authentication app.

Custom serializers for authentication-related data will be defined here.
"""

from rest_framework import serializers
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data (read-only responses)."""

    class Meta:
        """Metadata for UserSerializer."""

        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "sex",
            "profile_picture_url",
            "date_joined",
        ]
        read_only_fields = fields


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile (firstName, lastName, sex only)."""

    first_name = serializers.CharField(
        max_length=150,
        min_length=1,
        required=False,
        allow_null=True,
        allow_blank=False,
        trim_whitespace=True,
    )
    last_name = serializers.CharField(
        max_length=150,
        min_length=1,
        required=False,
        allow_null=True,
        allow_blank=False,
        trim_whitespace=True,
    )
    sex = serializers.ChoiceField(
        choices=["M", "F", "O", "N", ""],
        required=False,
        allow_blank=True,
    )

    class Meta:
        """Metadata for UserProfileUpdateSerializer."""

        model = User
        fields = ["first_name", "last_name", "sex"]

    def validate_first_name(self, value):
        """Treat empty string as None."""
        if value == "":
            return None
        return value

    def validate_last_name(self, value):
        """Treat empty string as None."""
        if value == "":
            return None
        return value
