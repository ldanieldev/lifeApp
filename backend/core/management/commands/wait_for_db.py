"""Management command to wait for the database to become available.

This command repeatedly attempts to connect to the default database until successful.
"""

import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    """Django management command that waits for the database to become available."""

    def handle(self, *args, **options):
        """Wait for the default database to become available.

        Repeatedly attempts to connect to the default database until successful.
        """
        self.stdout.write('Waiting for database...')
        db_conn = None
        while not db_conn:
            try:
                db_conn = connections['default']
                db_conn.cursor()
            except OperationalError:
                self.stdout.write('Database unavailable, waiting 1 second...')
                time.sleep(1)
        self.stdout.write(self.style.SUCCESS('Database available!'))
