"""Custom exception handler for consistent API error responses."""

from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    """Return a consistent error format for DRF custom exception handler.

    Error format:
    {
        "error": "error_code",
        "message": "Human readable message",
        "field_errors": {
            "field_name": ["error message"]
        }
    }

    Args:
        exc: Exception instance
        context: Context dictionary with view and request info

    Returns:
        Response: Formatted error response

    """
    # Call DRF's default exception handler first
    response = drf_exception_handler(exc, context)

    if response is not None:
        # Initialize custom error response
        custom_response = {}

        # Determine error type
        if isinstance(exc, ValidationError):
            custom_response["error"] = "validation_error"
            custom_response["message"] = "Validation failed"

            # Format field errors
            if isinstance(response.data, dict):
                field_errors = {}
                for field, errors in response.data.items():
                    if isinstance(errors, list):
                        field_errors[field] = errors
                    else:
                        field_errors[field] = [str(errors)]
                custom_response["field_errors"] = field_errors
            else:
                custom_response["message"] = str(response.data)

        else:
            # Generic error handling
            error_type = exc.__class__.__name__
            custom_response["error"] = _convert_to_snake_case(error_type)

            # Extract error message
            if hasattr(exc, "detail"):
                if isinstance(exc.detail, dict):
                    custom_response["message"] = exc.detail.get("detail", str(exc.detail))
                    custom_response["field_errors"] = {k: v for k, v in exc.detail.items() if k != "detail"}
                else:
                    custom_response["message"] = str(exc.detail)
            else:
                custom_response["message"] = str(exc)

        response.data = custom_response

    return response


def _convert_to_snake_case(text: str) -> str:
    """Convert CamelCase to snake_case.

    Args:
        text: Text in CamelCase

    Returns:
        str: Text in snake_case

    """
    import re

    # Insert underscore before uppercase letters and convert to lowercase
    result = re.sub(r"(?<!^)(?=[A-Z])", "_", text).lower()
    return result
