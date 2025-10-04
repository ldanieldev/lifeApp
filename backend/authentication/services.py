"""Service layer for authentication, JWT, and WebAuthn handling."""

import base64
import logging
from datetime import datetime, timedelta
from typing import Optional

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from fido2.server import Fido2Server
from fido2.webauthn import (
    AttestedCredentialData,
    PublicKeyCredentialRpEntity,
)

from authentication.models import Passkey

User = get_user_model()
logger = logging.getLogger(__name__)


class JWTService:
    """Service for handling JWT token operations."""

    @staticmethod
    def generate_access_token(user) -> str:
        """Generate JWT access token for a user.

        Args:
            user: User instance

        Returns:
            str: JWT access token

        """
        payload = {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME),
            "iat": datetime.utcnow(),
            "type": "access",
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def generate_refresh_token(user) -> str:
        """Generate JWT refresh token for a user.

        Args:
            user: User instance

        Returns:
            str: JWT refresh token

        """
        payload = {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME),
            "iat": datetime.utcnow(),
            "type": "refresh",
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def generate_tokens(user) -> dict:
        """Generate both access and refresh tokens for a user.

        Args:
            user: User instance

        Returns:
            dict: Dictionary containing access_token and refresh_token

        """
        return {
            "access_token": JWTService.generate_access_token(user),
            "refresh_token": JWTService.generate_refresh_token(user),
        }

    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate JWT token.

        Args:
            token: JWT token string

        Returns:
            dict: Decoded token payload if valid, None otherwise

        """
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None

    @staticmethod
    def verify_access_token(token: str) -> Optional[User]:
        """Verify access token and return associated user.

        Args:
            token: JWT access token string

        Returns:
            User: User instance if token is valid, None otherwise

        """
        payload = JWTService.decode_token(token)
        if not payload or payload.get("type") != "access":
            return None

        try:
            user = User.objects.get(id=payload["user_id"])
            return user if user.is_active else None
        except User.DoesNotExist:
            return None

    @staticmethod
    def verify_refresh_token(token: str) -> Optional[User]:
        """Verify refresh token and return associated user.

        Args:
            token: JWT refresh token string

        Returns:
            User: User instance if token is valid, None otherwise

        """
        payload = JWTService.decode_token(token)
        if not payload or payload.get("type") != "refresh":
            return None

        try:
            user = User.objects.get(id=payload["user_id"])
            return user if user.is_active else None
        except User.DoesNotExist:
            return None


class WebAuthnService:
    """Service for handling WebAuthn/passkey operations."""

    def __init__(self):
        """Initialize WebAuthn service with relying party configuration."""
        # Relying Party (RP) configuration
        self.rp = PublicKeyCredentialRpEntity(
            id=settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else "localhost",
            name="Life App",
        )
        # Initialize FIDO2 server
        self.server = Fido2Server(self.rp)

    def begin_registration(self, user) -> dict:
        """Begin WebAuthn registration ceremony.

        Args:
            user: User instance

        Returns:
            dict: Registration options for the client

        """
        # Get existing credentials for this user to avoid re-registration
        existing_credentials = []
        for passkey in Passkey.objects.filter(user=user):
            try:
                credential_id = base64.b64decode(passkey.credential_id)
                existing_credentials.append(
                    AttestedCredentialData.create(
                        aaguid=b"\x00" * 16,
                        credential_id=credential_id,
                        public_key=base64.b64decode(passkey.public_key),
                    )
                )
            except Exception as e:
                logger.error(f"Error processing existing credential: {str(e)}")

        # Create registration options
        registration_data, state = self.server.register_begin(
            user={
                "id": str(user.id).encode("utf-8"),
                "name": user.email,
                "displayName": user.get_full_name(),
            },
            credentials=existing_credentials,
            user_verification="discouraged",
        )

        # Convert to dict and encode for JSON serialization
        options = {
            "publicKey": {
                "challenge": base64.b64encode(registration_data.public_key.challenge).decode("utf-8"),
                "rp": {
                    "name": registration_data.public_key.rp.name,
                    "id": registration_data.public_key.rp.id,
                },
                "user": {
                    "id": base64.b64encode(registration_data.public_key.user.id).decode("utf-8"),
                    "name": registration_data.public_key.user.name,
                    "displayName": registration_data.public_key.user.display_name,
                },
                "pubKeyCredParams": [
                    {"type": "public-key", "alg": param.alg}
                    for param in registration_data.public_key.pub_key_cred_params
                ],
                "timeout": registration_data.public_key.timeout,
                "excludeCredentials": [
                    {
                        "type": "public-key",
                        "id": base64.b64encode(cred.id).decode("utf-8"),
                    }
                    for cred in (registration_data.public_key.exclude_credentials or [])
                ],
                "authenticatorSelection": {
                    "userVerification": registration_data.public_key.authenticator_selection.user_verification.value,
                },
                "attestation": registration_data.public_key.attestation.value,
            },
            "state": base64.b64encode(state).decode("utf-8"),
        }

        return options

    def complete_registration(self, user, credential_data: dict, state: str, label: str) -> Passkey:
        """Complete WebAuthn registration ceremony.

        Args:
            user: User instance
            credential_data: Client credential response
            state: Registration state from begin_registration
            label: User-defined label for the passkey

        Returns:
            Passkey: Created passkey instance

        Raises:
            ValueError: If registration fails

        """
        try:
            # Decode state
            state_bytes = base64.b64decode(state)

            # Complete registration
            auth_data = self.server.register_complete(state_bytes, credential_data)

            # Create passkey record
            passkey = Passkey.objects.create(
                user=user,
                label=label,
                credential_id=base64.b64encode(auth_data.credential_data.credential_id).decode("utf-8"),
                public_key=base64.b64encode(bytes(auth_data.credential_data.public_key)).decode("utf-8"),
                sign_count=auth_data.credential_data.sign_count,
            )

            logger.info(f"Passkey registered for user {user.email}: {label}")
            return passkey

        except Exception as e:
            logger.error(f"WebAuthn registration failed: {str(e)}")
            raise ValueError(f"Registration failed: {str(e)}") from e

    def begin_authentication(self, email: Optional[str] = None) -> dict:
        """Begin WebAuthn authentication ceremony.

        Args:
            email: Optional email to filter credentials

        Returns:
            dict: Authentication options for the client

        """
        # Get credentials for user if email provided
        credentials = []
        if email:
            try:
                user = User.objects.get(email=email)
                for passkey in Passkey.objects.filter(user=user):
                    try:
                        credential_id = base64.b64decode(passkey.credential_id)
                        credentials.append(
                            AttestedCredentialData.create(
                                aaguid=b"\x00" * 16,
                                credential_id=credential_id,
                                public_key=base64.b64decode(passkey.public_key),
                            )
                        )
                    except Exception as e:
                        logger.error(f"Error processing credential: {str(e)}")
            except User.DoesNotExist:
                pass

        # Create authentication options
        auth_data, state = self.server.authenticate_begin(credentials=credentials)

        options = {
            "publicKey": {
                "challenge": base64.b64encode(auth_data.public_key.challenge).decode("utf-8"),
                "timeout": auth_data.public_key.timeout,
                "rpId": auth_data.public_key.rp_id,
                "allowCredentials": [
                    {
                        "type": "public-key",
                        "id": base64.b64encode(cred.id).decode("utf-8"),
                    }
                    for cred in (auth_data.public_key.allow_credentials or [])
                ],
                "userVerification": auth_data.public_key.user_verification.value,
            },
            "state": base64.b64encode(state).decode("utf-8"),
        }

        return options

    def complete_authentication(self, credential_data: dict, state: str) -> Optional[User]:
        """Complete WebAuthn authentication ceremony.

        Args:
            credential_data: Client credential response
            state: Authentication state from begin_authentication

        Returns:
            User: Authenticated user if successful, None otherwise

        Raises:
            ValueError: If authentication fails

        """
        try:
            # Decode credential ID
            credential_id = base64.b64decode(credential_data["id"])
            credential_id_b64 = base64.b64encode(credential_id).decode("utf-8")

            # Find passkey
            try:
                passkey = Passkey.objects.get(credential_id=credential_id_b64)
            except Passkey.DoesNotExist as e:
                raise ValueError("Unknown credential") from e

            # Decode state
            state_bytes = base64.b64decode(state)

            # Verify authentication
            credentials = [
                AttestedCredentialData.create(
                    aaguid=b"\x00" * 16,
                    credential_id=base64.b64decode(passkey.credential_id),
                    public_key=base64.b64decode(passkey.public_key),
                )
            ]

            self.server.authenticate_complete(
                state_bytes,
                credentials,
                credential_data,
            )

            # Update passkey usage
            passkey.update_last_used()

            logger.info(f"User {passkey.user.email} authenticated with passkey: {passkey.label}")
            return passkey.user

        except Exception as e:
            logger.error(f"WebAuthn authentication failed: {str(e)}")
            raise ValueError(f"Authentication failed: {str(e)}") from e
