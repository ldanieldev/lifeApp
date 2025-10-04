"""Email service layer for the application."""

import logging
from typing import Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """Service class for sending emails."""

    @staticmethod
    def send_email(
        subject: str,
        recipient_list: list[str],
        template_name: str,
        context: Optional[dict] = None,
        from_email: Optional[str] = None,
    ) -> bool:
        """Send an email using a template.

        Args:
            subject: Email subject line
            recipient_list: List of recipient email addresses
            template_name: Name of the email template (without .html extension)
            context: Context dictionary for template rendering
            from_email: Sender email address (defaults to DEFAULT_FROM_EMAIL)

        Returns:
            bool: True if email was sent successfully, False otherwise

        """
        if context is None:
            context = {}

        try:
            from_email = from_email or settings.DEFAULT_FROM_EMAIL

            # Render HTML content
            html_content = render_to_string(f"emails/{template_name}.html", context)
            # Create plain text version by stripping HTML tags
            text_content = strip_tags(html_content)

            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=recipient_list,
            )
            email.attach_alternative(html_content, "text/html")

            # Send email
            email.send(fail_silently=False)

            logger.info(f"Email sent successfully to {recipient_list}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {recipient_list}: {str(e)}")
            return False

    @classmethod
    def send_password_reset_email(cls, email: str, reset_url: str) -> bool:
        """Send password reset email.

        Args:
            email: Recipient email address
            reset_url: Password reset URL with token

        Returns:
            bool: True if email was sent successfully

        """
        context = {
            "reset_url": reset_url,
            "site_name": "Life App",
        }
        return cls.send_email(
            subject="Password Reset Request",
            recipient_list=[email],
            template_name="password_reset",
            context=context,
        )

    @classmethod
    def send_email_verification(cls, email: str, verification_url: str) -> bool:
        """Send email verification email.

        Args:
            email: Recipient email address
            verification_url: Email verification URL with token

        Returns:
            bool: True if email was sent successfully

        """
        context = {
            "verification_url": verification_url,
            "site_name": "Life App",
        }
        return cls.send_email(
            subject="Verify Your Email Address",
            recipient_list=[email],
            template_name="email_verification",
            context=context,
        )

    @classmethod
    def send_welcome_email(cls, email: str, first_name: str) -> bool:
        """Send welcome email to new users.

        Args:
            email: Recipient email address
            first_name: User's first name

        Returns:
            bool: True if email was sent successfully

        """
        context = {
            "first_name": first_name,
            "site_name": "Life App",
        }
        return cls.send_email(
            subject="Welcome to Life App",
            recipient_list=[email],
            template_name="welcome",
            context=context,
        )
