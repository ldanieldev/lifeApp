#!/usr/bin/env python
"""Script to create test data for the authentication system."""

import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()


def create_test_users():
    """Create test users with different authentication methods."""
    # User 1: Email/password only
    user1, created = User.objects.get_or_create(
        email="user1@example.com",
        defaults={
            "first_name": "John",
            "last_name": "Doe",
            "sex": "M",
        },
    )
    if created:
        user1.set_password("Test123!")
        user1.save()
        print(f"✅ Created user: {user1.email} (password: Test123!)")
    else:
        print(f"ℹ️  User already exists: {user1.email}")

    # User 2: Email/password with different sex
    user2, created = User.objects.get_or_create(
        email="user2@example.com",
        defaults={
            "first_name": "Jane",
            "last_name": "Smith",
            "sex": "F",
        },
    )
    if created:
        user2.set_password("Test456!")
        user2.save()
        print(f"✅ Created user: {user2.email} (password: Test456!)")
    else:
        print(f"ℹ️  User already exists: {user2.email}")

    # User 3: For testing passkey (will add manually via API)
    user3, created = User.objects.get_or_create(
        email="user3@example.com",
        defaults={
            "first_name": "Bob",
            "last_name": "Johnson",
            "sex": "M",
        },
    )
    if created:
        user3.set_password("Test789!")
        user3.save()
        print(f"✅ Created user: {user3.email} (password: Test789!)")
    else:
        print(f"ℹ️  User already exists: {user3.email}")

    print("\n" + "=" * 50)
    print("Test Users Summary:")
    print("=" * 50)
    print("1. Email: user1@example.com | Password: Test123!")
    print("2. Email: user2@example.com | Password: Test456!")
    print("3. Email: user3@example.com | Password: Test789!")
    print("4. Email: admin@example.com | Password: admin (superuser)")
    print("=" * 50)


if __name__ == "__main__":
    create_test_users()
