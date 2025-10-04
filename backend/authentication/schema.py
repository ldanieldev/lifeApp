"""OpenAPI schema extensions for drf-spectacular."""

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class JWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """OpenAPI authentication scheme for JWT authentication."""

    target_class = "authentication.authentication.JWTAuthentication"
    name = "JWTAuth"

    def get_security_definition(self, auto_schema):
        """Return the security definition for JWT authentication."""
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
