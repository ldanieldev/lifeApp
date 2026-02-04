"""Seed default service types."""

from django.db import migrations


def seed_service_types(apps, schema_editor):
    """Create default (system) service types."""
    ServiceType = apps.get_model("vehicle_maintenance_tracker", "ServiceType")

    default_types = [
        {"name": "Oil Change", "description": "Engine oil and filter replacement", "display_order": 1},
        {"name": "Tire Rotation", "description": "Rotate tires for even wear", "display_order": 2},
        {"name": "Tire Replacement", "description": "Replace worn tires", "display_order": 3},
        {"name": "Brake Pads", "description": "Replace brake pads", "display_order": 4},
        {"name": "Brake Rotors", "description": "Replace or resurface brake rotors", "display_order": 5},
        {"name": "Air Filter", "description": "Replace engine air filter", "display_order": 6},
        {"name": "Cabin Filter", "description": "Replace cabin air filter", "display_order": 7},
        {"name": "Transmission Fluid", "description": "Transmission fluid change/flush", "display_order": 8},
        {"name": "Coolant Flush", "description": "Replace engine coolant", "display_order": 9},
        {"name": "Spark Plugs", "description": "Replace spark plugs", "display_order": 10},
        {"name": "Battery Replacement", "description": "Replace car battery", "display_order": 11},
        {"name": "Wiper Blades", "description": "Replace windshield wiper blades", "display_order": 12},
        {"name": "Alignment", "description": "Wheel alignment service", "display_order": 13},
        {"name": "Balancing", "description": "Wheel balancing service", "display_order": 14},
        {"name": "State Inspection", "description": "Annual state safety inspection", "display_order": 15},
        {"name": "Emissions Test", "description": "Emissions/smog test", "display_order": 16},
        {"name": "Timing Belt", "description": "Replace timing belt", "display_order": 17},
        {"name": "Serpentine Belt", "description": "Replace serpentine/drive belt", "display_order": 18},
        {"name": "Power Steering Fluid", "description": "Replace power steering fluid", "display_order": 19},
        {"name": "Brake Fluid", "description": "Replace brake fluid", "display_order": 20},
        {"name": "Fuel Filter", "description": "Replace fuel filter", "display_order": 21},
        {"name": "Differential Fluid", "description": "Replace differential fluid", "display_order": 22},
        {"name": "Transfer Case Fluid", "description": "Replace transfer case fluid", "display_order": 23},
        {"name": "AC Service", "description": "Air conditioning service/recharge", "display_order": 24},
        {"name": "Headlight Bulb", "description": "Replace headlight bulb", "display_order": 25},
        {"name": "Taillight Bulb", "description": "Replace taillight/brake light bulb", "display_order": 26},
        {"name": "General Repair", "description": "General mechanical repair", "display_order": 99},
        {"name": "Other", "description": "Other service not listed", "display_order": 100},
    ]

    for service_type_data in default_types:
        ServiceType.objects.get_or_create(
            name=service_type_data["name"],
            is_custom=False,
            defaults={
                "description": service_type_data["description"],
                "display_order": service_type_data["display_order"],
                "user": None,
            },
        )


def remove_service_types(apps, schema_editor):
    """Remove default service types (reverse migration)."""
    ServiceType = apps.get_model("vehicle_maintenance_tracker", "ServiceType")
    ServiceType.objects.filter(is_custom=False).delete()


class Migration(migrations.Migration):
    """Seed default service types."""

    dependencies = [
        ("vehicle_maintenance_tracker", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_service_types, remove_service_types),
    ]
