"""Serializers for the users app."""

from rest_framework import serializers

from users.models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        """Meta options for UserSerializer."""

        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "sex",
            "profile_picture_url",
            "date_joined",
            "is_active",
        ]
        read_only_fields = ["id", "email", "date_joined"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information."""

    class Meta:
        """Meta options for UserUpdateSerializer."""

        model = User
        fields = [
            "first_name",
            "last_name",
            "sex",
            "profile_picture_url",
        ]
