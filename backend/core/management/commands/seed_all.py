"""Management command to seed all apps for development/testing."""

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Seed all apps for development and testing."""

    help = "Seeds the database with test data from all apps"

    def add_arguments(self, parser):
        """Add command arguments.

        Args:
            parser: Command line argument parser

        """
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing data before seeding",
        )
        parser.add_argument(
            "--users-count",
            type=int,
            default=10,
            help="Number of random users to create (default: 10)",
        )
        parser.add_argument(
            "--no-admin",
            action="store_true",
            help="Skip creating admin user",
        )

    def handle(self, *args, **options):
        """Execute the command.

        Args:
            *args: Positional arguments
            **options: Command options

        """
        self.stdout.write(self.style.SUCCESS("\n🌱 Starting database seeding...\n"))

        # Seed users
        self.stdout.write(self.style.HTTP_INFO("Seeding users..."))
        call_command(
            "seed_users",
            clear=options["clear"],
            count=options["users_count"],
            no_admin=options["no_admin"],
        )

        # Add more seed commands here as you create them
        # Example:
        # self.stdout.write(self.style.HTTP_INFO("\nSeeding products..."))
        # call_command("seed_products", clear=options["clear"])

        self.stdout.write(self.style.SUCCESS("\n✅ Database seeding complete!\n"))
