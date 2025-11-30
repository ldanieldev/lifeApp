"""Custom user model for the application."""

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django_prometheus.models import ExportModelOperationsMixin

from users.managers import UserManager


class User(ExportModelOperationsMixin("user"), AbstractBaseUser, PermissionsMixin):
    """Custom user model that uses email as the unique identifier.

    This model extends AbstractBaseUser and PermissionsMixin to provide
    a flexible user model with email-based authentication.
    """

    class Sex(models.TextChoices):
        """Choices for user sex field."""

        MALE = "M", "Male"
        FEMALE = "F", "Female"
        OTHER = "O", "Other"
        PREFER_NOT_TO_SAY = "N", "Prefer not to say"

    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="User's email address (used for authentication)",
    )
    first_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="User's first name",
    )
    last_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="User's last name",
    )
    sex = models.CharField(
        max_length=1,
        choices=Sex.choices,
        blank=True,
        help_text="User's sex",
    )
    profile_picture_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="URL to user's profile picture (from social providers)",
    )

    # Standard Django user fields
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the admin site",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active",
    )
    date_joined = models.DateTimeField(
        default=timezone.now,
        help_text="Date and time when the user joined",
    )

    # Custom manager
    objects = UserManager()

    # Email is the username field
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        """Meta options for the User model."""

        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-date_joined"]

    def __str__(self):
        """Return string representation of the user."""
        return self.email

    def get_full_name(self):
        """Return the user's full name.

        Returns:
            str: User's full name (first_name + last_name) or email if names not set

        """
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.email

    def get_short_name(self):
        """Return the user's short name.

        Returns:
            str: User's first name or email if first name not set

        """
        return self.first_name if self.first_name else self.email
