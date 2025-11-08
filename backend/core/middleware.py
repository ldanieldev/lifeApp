"""Custom middleware for the core application."""

import json

from djangorestframework_camel_case.util import camelize, underscoreize


class AllauthCamelCaseMiddleware:
    """Transform django-allauth JSON requests and responses to/from camelCase.

    Django-allauth headless endpoints are not DRF views, so they don't use
    the CamelCaseJSONParser/Renderer. This middleware:
    - Converts incoming camelCase JSON to snake_case for allauth
    - Converts outgoing snake_case JSON to camelCase for frontend
    """

    def __init__(self, get_response):
        """Initialize middleware with get_response callable."""
        self.get_response = get_response

    def __call__(self, request):
        """Process the request and transform allauth requests/responses."""
        # Transform incoming request body from camelCase to snake_case
        if (
            request.path.startswith("/api/_allauth/")
            and request.method in ["POST", "PUT", "PATCH"]
            and request.content_type == "application/json"
        ):
            try:
                # Parse JSON request body
                data = json.loads(request.body)

                # IMPORTANT: Do NOT transform the 'credential' field for WebAuthn endpoints
                # The fido2 library expects the credential object in a specific format
                # and transforming it breaks the parsing
                if "credential" in data and "webauthn" in request.path:
                    # Keep credential as-is, only transform other fields
                    credential = data.pop("credential")
                    snake_data = underscoreize(data)
                    snake_data["credential"] = credential
                else:
                    # Transform to snake_case normally
                    snake_data = underscoreize(data)

                # Update request body
                request._body = json.dumps(snake_data).encode("utf-8")
            except (json.JSONDecodeError, ValueError, TypeError, AttributeError):
                # If we can't parse/transform, leave original request
                pass

        response = self.get_response(request)

        # Only transform allauth endpoints
        if request.path.startswith("/api/_allauth/") and response.get("Content-Type", "").startswith(
            "application/json"
        ):
            try:
                # Parse JSON response
                data = json.loads(response.content)

                # Transform to camelCase
                camel_data = camelize(data)

                # Update response
                response.content = json.dumps(camel_data)
                response["Content-Length"] = len(response.content)
            except (json.JSONDecodeError, ValueError, TypeError):
                # If we can't parse/transform, return original response
                pass

        return response
