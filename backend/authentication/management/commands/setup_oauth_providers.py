"""Django management command to setup OAuth providers from environment variables.

Usage:
    python manage.py setup_oauth_providers

This command will create or update SocialApp entries for configured OAuth providers
(Google, GitHub, etc.) using credentials from environment variables.
"""

import os

from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Setup OAuth providers from environment variables."""

    help = "Setup OAuth providers (Google, GitHub) from environment variables"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--site-domain",
            type=str,
            default=None,
            help="Site domain to associate with providers (default: current site)",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        # Get or create site
        if options["site_domain"]:
            site, created = Site.objects.get_or_create(
                domain=options["site_domain"],
                defaults={"name": options["site_domain"]},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"✓ Created site: {site.domain}"))
            else:
                self.stdout.write(f"Using existing site: {site.domain}")
        else:
            site = Site.objects.get_current()
            self.stdout.write(f"Using current site: {site.domain}")

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("Setting up OAuth providers from environment variables")
        self.stdout.write("=" * 60 + "\n")

        # Track results
        results = {"created": 0, "updated": 0, "skipped": 0}

        # Define providers and their env var names
        providers = [
            {
                "provider": "google",
                "name": "Google",
                "client_id_var": "GOOGLE_OAUTH_CLIENT_ID",
                "secret_var": "GOOGLE_OAUTH_CLIENT_SECRET",
            },
            {
                "provider": "github",
                "name": "GitHub",
                "client_id_var": "GITHUB_OAUTH_CLIENT_ID",
                "secret_var": "GITHUB_OAUTH_CLIENT_SECRET",
            },
        ]

        for provider_config in providers:
            self._setup_provider(provider_config, site, results)

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Setup complete: {results['created']} created, "
                f"{results['updated']} updated, {results['skipped']} skipped"
            )
        )
        self.stdout.write("=" * 60)

    def _setup_provider(self, config, site, results):
        """Create a single OAuth provider."""
        provider = config["provider"]
        name = config["name"]
        client_id_var = config["client_id_var"]
        secret_var = config["secret_var"]

        # Get credentials from environment
        client_id = os.getenv(client_id_var)
        secret = os.getenv(secret_var)

        self.stdout.write(f"\n{name} ({provider}):")

        # Check if credentials are set
        if not client_id or not secret:
            self.stdout.write(self.style.WARNING("  ⚠ Skipped - Missing environment variables:"))
            if not client_id:
                self.stdout.write(self.style.WARNING(f"    - {client_id_var} not set"))
            if not secret:
                self.stdout.write(self.style.WARNING(f"    - {secret_var} not set"))
            results["skipped"] += 1
            return

        # Mask credentials for display
        masked_client_id = client_id[:20] + "..." if len(client_id) > 20 else client_id
        masked_secret = secret[:10] + "..." if len(secret) > 10 else "***"

        # Get or create SocialApp
        try:
            app = SocialApp.objects.get(provider=provider)
            # Update existing app
            app.name = name
            app.client_id = client_id
            app.secret = secret
            app.save()

            # Ensure site is associated
            if site not in app.sites.all():
                app.sites.add(site)
                self.stdout.write(self.style.SUCCESS(f"  ✓ Updated and linked to site {site.domain}"))
            else:
                self.stdout.write(self.style.SUCCESS("  ✓ Updated"))

            self.stdout.write(f"    Client ID: {masked_client_id}")
            self.stdout.write(f"    Secret: {masked_secret}")
            results["updated"] += 1

        except SocialApp.DoesNotExist:
            # Create new app
            app = SocialApp.objects.create(
                provider=provider,
                name=name,
                client_id=client_id,
                secret=secret,
            )
            app.sites.add(site)

            self.stdout.write(self.style.SUCCESS("  ✓ Created"))
            self.stdout.write(f"    Client ID: {masked_client_id}")
            self.stdout.write(f"    Secret: {masked_secret}")
            self.stdout.write(f"    Site: {site.domain}")
            results["created"] += 1
