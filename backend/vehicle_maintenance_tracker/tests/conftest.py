"""Pytest fixtures for vehicle_maintenance_tracker API tests.

Provides shared fixtures for:
- API clients (authenticated and unauthenticated)
- Test users (owner and other user for permission tests)
- Test data (vehicles, service records, reminders, notes, shops)
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from users.factories import UserFactory

from vehicle_maintenance_tracker.factories import (
    DIYServiceRecordFactory,
    DueSoonReminderFactory,
    NoteFactory,
    OverdueReminderFactory,
    ReminderFactory,
    ServiceRecordFactory,
    ServiceTypeFactory,
    ShopFactory,
    VehicleFactory,
)

# ============================================================================
# API Client Fixtures
# ============================================================================


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user():
    """Create a test user."""
    return UserFactory(email="testuser@example.com", password="TestPass123!")


@pytest.fixture
def other_user():
    """Create another test user for permission tests."""
    return UserFactory(email="otheruser@example.com", password="TestPass123!")


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an API client authenticated with session."""
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client


@pytest.fixture
def other_authenticated_client(api_client, other_user):
    """Return an API client authenticated as other_user."""
    client = APIClient()
    client.force_authenticate(user=other_user)
    client.user = other_user
    return client


# ============================================================================
# Service Type Fixtures
# ============================================================================


@pytest.fixture
def service_type():
    """Create a system service type."""
    from vehicle_maintenance_tracker.models import ServiceType

    obj, _ = ServiceType.all_objects.get_or_create(
        name="Oil Change",
        is_custom=False,
        defaults={"description": "Regular oil change service"},
    )
    # Ensure it's not soft-deleted
    if obj.is_deleted:
        obj.restore()
    return obj


@pytest.fixture
def brake_service_type():
    """Create a brake service type."""
    from vehicle_maintenance_tracker.models import ServiceType

    obj, _ = ServiceType.all_objects.get_or_create(
        name="Brake Service",
        is_custom=False,
        defaults={"description": "Brake inspection and service"},
    )
    if obj.is_deleted:
        obj.restore()
    return obj


@pytest.fixture
def custom_service_type(user):
    """Create a custom service type for the user."""
    return ServiceTypeFactory(
        name="Custom Service",
        is_custom=True,
        user=user,
    )


# ============================================================================
# Shop Fixtures
# ============================================================================


@pytest.fixture
def shop(user):
    """Create a shop for the user."""
    return ShopFactory(
        owner=user,
        name="Test Auto Shop",
        address="123 Main St, City, ST 12345",
        phone="555-123-4567",
    )


@pytest.fixture
def shop_with_google_places(user):
    """Create a shop with Google Places integration."""
    return ShopFactory(
        owner=user,
        name="Premium Auto Shop",
        google_place_id="ChIJxxxxxxxxxxxxxxxx",
    )


@pytest.fixture
def other_users_shop(other_user):
    """Create a shop owned by another user."""
    return ShopFactory(owner=other_user, name="Other User's Shop")


# ============================================================================
# Vehicle Fixtures
# ============================================================================


@pytest.fixture
def vehicle(user):
    """Create a vehicle for the user."""
    return VehicleFactory(
        owner=user,
        name="Daily Driver",
        year=2020,
        make="Toyota",
        model="Camry",
        vin="1HGBH41JXMN109186",
        current_odometer=50000,
        is_archived=False,
        display_order=0,
    )


@pytest.fixture
def second_vehicle(user):
    """Create a second vehicle for the user."""
    return VehicleFactory(
        owner=user,
        name="Weekend Car",
        year=2018,
        make="Honda",
        model="Accord",
        current_odometer=35000,
        display_order=1,
    )


@pytest.fixture
def archived_vehicle(user):
    """Create an archived vehicle."""
    return VehicleFactory(
        owner=user,
        name="Old Car",
        year=2010,
        make="Ford",
        model="Focus",
        is_archived=True,
    )


@pytest.fixture
def other_users_vehicle(other_user):
    """Create a vehicle owned by another user."""
    return VehicleFactory(owner=other_user, name="Other User's Vehicle")


# ============================================================================
# Service Record Fixtures
# ============================================================================


@pytest.fixture
def service_record(vehicle, service_type, shop):
    """Create a service record for the vehicle."""
    return ServiceRecordFactory(
        vehicle=vehicle,
        service_type=service_type,
        shop=shop,
        date=date.today() - timedelta(days=30),
        odometer=48000,
        parts_cost=Decimal("45.99"),
        labor_cost=Decimal("35.00"),
        notes="Synthetic oil used",
    )


@pytest.fixture
def diy_service_record(vehicle, service_type):
    """Create a DIY service record (no shop)."""
    return DIYServiceRecordFactory(
        vehicle=vehicle,
        service_type=service_type,
        date=date.today() - timedelta(days=60),
        odometer=45000,
    )


@pytest.fixture
def multiple_service_records(vehicle, service_type, brake_service_type, shop):
    """Create multiple service records for testing."""
    return [
        ServiceRecordFactory(
            vehicle=vehicle,
            service_type=service_type,
            shop=shop,
            date=date.today() - timedelta(days=i * 30),
            odometer=50000 - i * 3000,
        )
        for i in range(5)
    ]


@pytest.fixture
def other_users_service_record(other_users_vehicle, service_type):
    """Create a service record for another user's vehicle."""
    return ServiceRecordFactory(
        vehicle=other_users_vehicle,
        service_type=service_type,
    )


# ============================================================================
# Reminder Fixtures
# ============================================================================


@pytest.fixture
def reminder(vehicle, service_type):
    """Create a reminder for the vehicle."""
    return ReminderFactory(
        vehicle=vehicle,
        service_type=service_type,
        mileage_interval=5000,
        time_interval_months=6,
    )


@pytest.fixture
def overdue_reminder(vehicle, brake_service_type):
    """Create an overdue reminder."""
    return OverdueReminderFactory(
        vehicle=vehicle,
        service_type=brake_service_type,
    )


@pytest.fixture
def due_soon_reminder(vehicle, service_type):
    """Create a reminder due soon."""
    return DueSoonReminderFactory(
        vehicle=vehicle,
        service_type=service_type,
    )


@pytest.fixture
def other_users_reminder(other_users_vehicle, service_type):
    """Create a reminder for another user's vehicle."""
    return ReminderFactory(
        vehicle=other_users_vehicle,
        service_type=service_type,
    )


# ============================================================================
# Note Fixtures
# ============================================================================


@pytest.fixture
def note(vehicle):
    """Create a note for the vehicle."""
    return NoteFactory(
        vehicle=vehicle,
        content="Strange noise when turning left.",
        odometer=50000,
    )


@pytest.fixture
def multiple_notes(vehicle):
    """Create multiple notes for testing."""
    return [
        NoteFactory(
            vehicle=vehicle,
            content=f"Note entry {i}",
            odometer=50000 - i * 1000,
        )
        for i in range(5)
    ]


@pytest.fixture
def other_users_note(other_users_vehicle):
    """Create a note for another user's vehicle."""
    return NoteFactory(
        vehicle=other_users_vehicle,
        content="Other user's note",
    )


# ============================================================================
# Bulk Data Fixtures
# ============================================================================


@pytest.fixture
def multiple_vehicles(user):
    """Create multiple vehicles for pagination tests."""
    return VehicleFactory.create_batch(5, owner=user)


@pytest.fixture
def multiple_shops(user):
    """Create multiple shops for pagination tests."""
    return ShopFactory.create_batch(5, owner=user)
