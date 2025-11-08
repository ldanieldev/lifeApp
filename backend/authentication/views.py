"""API views for the authentication app.

Custom authentication endpoints that extend django-allauth functionality
will be defined here.
"""

from allauth.socialaccount.models import SocialAccount
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserProfileUpdateSerializer, UserSerializer


class CurrentUserView(APIView):
    """Get and update current authenticated user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user profile.

        Returns:
            200: User profile data
            401: Not authenticated

        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user profile (firstName, lastName, sex only).

        Accepts partial updates - can update any combination of fields.

        Request body:
            {
                "first_name": "John",  // optional
                "last_name": "Doe",     // optional
                "sex": "M"              // optional, one of: M, F, O, null
            }

        Returns:
            200: Updated user profile data
            400: Validation error
            401: Not authenticated

        """
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()
            # Return full user data after update
            return Response(UserSerializer(request.user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProvidersView(APIView):
    """Get user's connected OAuth providers."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of connected social account providers.

        Returns:
            200: List of providers [{"id": 1, "provider": "google", "name": "user@example.com"}]
            401: Not authenticated

        """
        social_accounts = SocialAccount.objects.filter(user=request.user)
        providers = [
            {
                "id": account.id,
                "provider": account.provider,
                "name": account.extra_data.get("email") or account.extra_data.get("login") or str(account.uid),
            }
            for account in social_accounts
        ]
        return Response(providers)
