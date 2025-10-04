"""Models for the authentication app."""

from django.conf import settings
from django.db import models
from django.utils import timezone


class Passkey(models.Model):
    """Model to store WebAuthn passkey credentials.

    This model stores the necessary information for WebAuthn/passkey authentication,
    including user-defined labels for easier management of multiple passkeys.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="passkeys",
        help_text="User who owns this passkey",
    )
    label = models.CharField(
        max_length=255,
        help_text="User-defined label for this passkey (e.g., 'iPhone 15', 'YubiKey')",
    )
    credential_id = models.TextField(
        unique=True,
        help_text="WebAuthn credential ID (base64 encoded)",
    )
    public_key = models.TextField(
        help_text="Public key for credential verification (base64 encoded)",
    )
    sign_count = models.IntegerField(
        default=0,
        help_text="Signature counter for replay attack prevention",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when the passkey was created",
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when the passkey was last used for authentication",
    )

    class Meta:
        """Meta options for the Passkey model."""

        verbose_name = "passkey"
        verbose_name_plural = "passkeys"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["credential_id"]),
        ]

    def __str__(self):
        """Return string representation of the passkey."""
        return f"{self.user.email} - {self.label}"

    def update_last_used(self):
        """Update the last_used_at timestamp to current time."""
        self.last_used_at = timezone.now()
        self.save(update_fields=["last_used_at"])
