"""Factory Boy factories for vehicle_maintenance_tracker models.

Use these factories in tests to create realistic test data.
"""

from datetime import date, timedelta
from decimal import Decimal

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from .models import Note, Reminder, ServiceRecord, ServiceType, Shop, Vehicle


class ServiceTypeFactory(DjangoModelFactory):
    """Factory for creating ServiceType instances."""

    class Meta:
        model = ServiceType

    name = factory.Sequence(lambda n: f"Service Type {n}")
    description = factory.Faker("sentence")
    is_custom = False
    user = None
    display_order = factory.Sequence(lambda n: n)


class CustomServiceTypeFactory(ServiceTypeFactory):
    """Factory for creating custom ServiceType instances owned by a user."""

    is_custom = True
    user = factory.SubFactory("users.factories.UserFactory")


class ShopFactory(DjangoModelFactory):
    """Factory for creating Shop instances."""

    class Meta:
        model = Shop

    owner = factory.SubFactory("users.factories.UserFactory")
    name = factory.Sequence(lambda n: f"Auto Shop {n}")
    address = factory.Faker("address")
    phone = factory.Faker("phone_number")
    google_place_id = ""
    display_order = factory.Sequence(lambda n: n)


class VehicleFactory(DjangoModelFactory):
    """Factory for creating Vehicle instances."""

    class Meta:
        model = Vehicle

    owner = factory.SubFactory("users.factories.UserFactory")
    name = factory.Sequence(lambda n: f"My Car {n}")
    year = factory.Faker("random_int", min=2000, max=2024)
    make = factory.Faker("random_element", elements=["Toyota", "Honda", "Ford", "Chevrolet", "BMW"])
    model = factory.Faker("random_element", elements=["Camry", "Accord", "F-150", "Corvette", "3 Series"])
    vin = factory.Faker("vin")
    license_plate = factory.LazyFunction(lambda: factory.Faker._get_faker().bothify(text="???-####").upper())
    engine = factory.Faker("random_element", elements=["2.5L 4-Cylinder", "3.0L V6", "5.0L V8"])
    trim = factory.Faker("random_element", elements=["Base", "SE", "LE", "XLE", "Limited"])
    current_odometer = factory.Faker("random_int", min=0, max=200000)
    odometer_updated_at = factory.LazyFunction(timezone.now)
    photo_url = ""
    is_archived = False
    display_order = factory.Sequence(lambda n: n)


class ArchivedVehicleFactory(VehicleFactory):
    """Factory for creating archived vehicles."""

    is_archived = True


class NewVehicleFactory(VehicleFactory):
    """Factory for creating a new vehicle with low mileage."""

    year = 2024
    current_odometer = factory.Faker("random_int", min=0, max=5000)


class ServiceRecordFactory(DjangoModelFactory):
    """Factory for creating ServiceRecord instances."""

    class Meta:
        model = ServiceRecord

    vehicle = factory.SubFactory(VehicleFactory)
    service_type = factory.SubFactory(ServiceTypeFactory)
    shop = factory.SubFactory(ShopFactory, owner=factory.SelfAttribute("..vehicle.owner"))
    date = factory.LazyFunction(lambda: date.today())
    odometer = factory.LazyAttribute(lambda obj: obj.vehicle.current_odometer)
    parts_cost = factory.LazyFunction(lambda: Decimal(str(factory.Faker._get_faker().random_int(min=10, max=500))))
    labor_cost = factory.LazyFunction(lambda: Decimal(str(factory.Faker._get_faker().random_int(min=0, max=200))))
    notes = factory.Faker("sentence")


class DIYServiceRecordFactory(ServiceRecordFactory):
    """Factory for creating DIY service records (no shop)."""

    shop = None
    labor_cost = Decimal("0.00")


class ExpensiveServiceRecordFactory(ServiceRecordFactory):
    """Factory for creating expensive service records."""

    parts_cost = factory.LazyFunction(lambda: Decimal(str(factory.Faker._get_faker().random_int(min=500, max=2000))))
    labor_cost = factory.LazyFunction(lambda: Decimal(str(factory.Faker._get_faker().random_int(min=200, max=1000))))


class ReminderFactory(DjangoModelFactory):
    """Factory for creating Reminder instances."""

    class Meta:
        model = Reminder

    vehicle = factory.SubFactory(VehicleFactory)
    service_type = factory.SubFactory(ServiceTypeFactory)
    mileage_interval = 5000
    time_interval_months = 6
    last_completed_date = factory.LazyFunction(lambda: date.today() - timedelta(days=90))
    last_completed_odometer = factory.LazyAttribute(lambda obj: max(0, obj.vehicle.current_odometer - 3000))
    next_due_date = factory.LazyFunction(lambda: date.today() + timedelta(days=90))
    next_due_odometer = factory.LazyAttribute(lambda obj: obj.vehicle.current_odometer + 2000)
    notes = ""
    is_manufacturer_recommended = False


class OverdueReminderFactory(ReminderFactory):
    """Factory for creating overdue reminders."""

    last_completed_date = factory.LazyFunction(lambda: date.today() - timedelta(days=365))
    last_completed_odometer = factory.LazyAttribute(lambda obj: max(0, obj.vehicle.current_odometer - 10000))
    next_due_date = factory.LazyFunction(lambda: date.today() - timedelta(days=30))
    next_due_odometer = factory.LazyAttribute(lambda obj: max(0, obj.vehicle.current_odometer - 1000))


class DueSoonReminderFactory(ReminderFactory):
    """Factory for creating reminders that are due soon."""

    next_due_date = factory.LazyFunction(lambda: date.today() + timedelta(days=15))
    next_due_odometer = factory.LazyAttribute(lambda obj: obj.vehicle.current_odometer + 300)


class MileageOnlyReminderFactory(ReminderFactory):
    """Factory for reminders triggered only by mileage."""

    mileage_interval = 5000
    time_interval_months = None
    next_due_date = None


class TimeOnlyReminderFactory(ReminderFactory):
    """Factory for reminders triggered only by time."""

    mileage_interval = None
    time_interval_months = 12
    next_due_odometer = None


class NoteFactory(DjangoModelFactory):
    """Factory for creating Note instances."""

    class Meta:
        model = Note

    vehicle = factory.SubFactory(VehicleFactory)
    content = factory.Faker("paragraph")
    odometer = factory.LazyAttribute(lambda obj: obj.vehicle.current_odometer)
    image_url = ""


class NoteWithImageFactory(NoteFactory):
    """Factory for creating Note instances with images."""

    image_url = factory.Faker("image_url")
