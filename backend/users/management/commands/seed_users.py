"""Management command to seed users for development/testing."""

from django.core.management.base import BaseCommand
from django.db import transaction

from users.factories import UserFactory
from users.models import User


class Command(BaseCommand):
    """Seed users for development and testing."""

    help = "Seeds the database with test users"

    def add_arguments(self, parser):
        """Add command arguments.

        Args:
            parser: Command line argument parser

        """
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing users before seeding",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=10,
            help="Number of random users to create (default: 10)",
        )
        parser.add_argument(
            "--no-admin",
            action="store_true",
            help="Skip creating admin user",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the command.

        Args:
            *args: Positional arguments
            **options: Command options

        """
        if options["clear"]:
            self.stdout.write("Clearing existing users...")
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("✅ All users deleted"))

        # Create admin user
        if not options["no_admin"]:
            admin, created = User.objects.get_or_create(
                email="admin@example.com",
                defaults={
                    "first_name": "Admin",
                    "last_name": "User",
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            if created:
                admin.set_password("admin")
                admin.save()
                self.stdout.write(self.style.SUCCESS("✅ Created admin user (admin@example.com / password: admin)"))
            else:
                self.stdout.write(self.style.WARNING("ℹ️  Admin user already exists (admin@example.com)"))

        # Create specific test users
        test_users = [
            {
                "email": "user1@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "sex": "M",
                "password": "Test123!",
            },
            {
                "email": "user2@example.com",
                "first_name": "Jane",
                "last_name": "Smith",
                "sex": "F",
                "password": "Test456!",
            },
            {
                "email": "user3@example.com",
                "first_name": "Bob",
                "last_name": "Johnson",
                "sex": "M",
                "password": "Test789!",
            },
        ]

        for user_data in test_users:
            password = user_data.pop("password")
            user, created = User.objects.get_or_create(
                email=user_data["email"],
                defaults=user_data,
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"✅ Created user: {user.email} (password: {password})"))
            else:
                self.stdout.write(self.style.WARNING(f"ℹ️  User already exists: {user.email}"))

        # Create random users
        count = options["count"]
        if count > 0:
            self.stdout.write(f"Creating {count} random users...")
            created_users = UserFactory.create_batch(count)
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Created {len(created_users)} random users with default password: DefaultTest123!"
                )
            )

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("Test Users Summary:"))
        self.stdout.write("=" * 60)
        if not options["no_admin"]:
            self.stdout.write("Admin: admin@example.com | Password: admin")
        self.stdout.write("User 1: user1@example.com | Password: Test123!")
        self.stdout.write("User 2: user2@example.com | Password: Test456!")
        self.stdout.write("User 3: user3@example.com | Password: Test789!")
        if count > 0:
            self.stdout.write(f"Random Users: {count} users | Password: DefaultTest123!")
        self.stdout.write(f"\nTotal users in database: {User.objects.count()}")
        self.stdout.write("=" * 60)
