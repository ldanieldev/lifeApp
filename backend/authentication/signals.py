"""Signal handlers for authentication events."""

from allauth.account.models import EmailAddress
from allauth.account.signals import password_reset
from django.dispatch import receiver


@receiver(password_reset)
def verify_email_on_password_reset(sender, request, user, **kwargs):
    """Automatically verify user's email when they successfully reset their password.

    This treats password reset as email verification because:
    1. If the user received the reset email, they control that email address
    2. Successfully resetting the password proves email ownership
    3. This prevents the security issue where unverified accounts can't login even after password reset
    """
    # Mark the user's email as verified
    EmailAddress.objects.filter(user=user, verified=False).update(verified=True)
