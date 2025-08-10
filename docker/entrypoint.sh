#!/bin/bash
set -e

echo "Waiting for database..."
cd /app/backend

# Wait for database to be ready
python manage.py wait_for_db

echo "Running migrations..."
python manage.py migrate

echo "Creating superuser if it doesn't exist..."
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model

User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if not password:
    print('Warning: DJANGO_SUPERUSER_PASSWORD not set, skipping superuser creation')
elif not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f'Superuser {username} created')
else:
    print(f'Superuser {username} already exists')
"

echo "Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf