"""Custom permissions for the authentication app."""

from rest_framework import permissions


class IsAuthenticated(permissions.BasePermission):
    """Permission that checks if the user is authenticated.

    This is similar to DRF's built-in IsAuthenticated but can be customized
    for specific authentication requirements.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return bool(request.user and request.user.is_authenticated)


class IsOwner(permissions.BasePermission):
    """Permission that checks if the user is the owner of the object.

    This permission should be used with views that operate on user-specific objects.
    """

    def has_object_permission(self, request, view, obj):
        """Check if the user owns the object."""
        # Check if the object has a user attribute
        if hasattr(obj, "user"):
            return obj.user == request.user
        # If the object is the user itself
        return obj == request.user
