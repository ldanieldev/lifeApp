"""Custom authentication backends for the application."""

from rest_framework import authentication, exceptions

from authentication.services import JWTService


class JWTAuthentication(authentication.BaseAuthentication):
    """Custom JWT authentication backend for Django REST Framework.

    This authentication class extracts JWT tokens from the Authorization header
    and validates them using the JWTService.
    """

    keyword = "Bearer"

    def authenticate(self, request):
        """Authenticate the request using JWT token from Authorization header.

        Args:
            request: Django request object

        Returns:
            tuple: (user, token) if authentication successful, None otherwise

        Raises:
            AuthenticationFailed: If authentication fails

        """
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header:
            return None

        try:
            # Split "Bearer <token>"
            parts = auth_header.split()

            if len(parts) != 2 or parts[0] != self.keyword:
                return None

            token = parts[1]
        except (IndexError, AttributeError) as e:
            raise exceptions.AuthenticationFailed("Invalid authorization header format") from e

        # Verify token and get user
        user = JWTService.verify_access_token(token)

        if not user:
            raise exceptions.AuthenticationFailed("Invalid or expired token")

        return (user, token)

    def authenticate_header(self, request):
        """Return the WWW-Authenticate header value.

        Args:
            request: Django request object

        Returns:
            str: Authentication header value

        """
        return self.keyword
