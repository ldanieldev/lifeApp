"""Factories for creating test user data."""

import factory
from factory.django import DjangoModelFactory

from users.models import User


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""

    class Meta:
        """Meta options for UserFactory."""

        model = User
        skip_postgeneration_save = True

    email = factory.Faker("email")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    sex = factory.Iterator(["M", "F", "O"])
    is_active = True
    is_staff = False
    is_superuser = False

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password after user creation.

        Args:
            create: Whether to save the instance
            extracted: Password value if provided
            **kwargs: Additional keyword arguments

        """
        if not create:
            return

        if extracted:
            self.set_password(extracted)
        else:
            self.set_password("DefaultTest123!")
        self.save()


class AdminUserFactory(UserFactory):
    """Factory for creating admin/superuser instances."""

    is_staff = True
    is_superuser = True
    first_name = "Admin"
    last_name = "User"
