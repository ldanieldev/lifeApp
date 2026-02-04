"""API integration tests for ServiceRecord endpoints.

Tests cover:
- List service records (filtering, search, pagination)
- Create service record (validation, ownership)
- Retrieve service record (with details)
- Update service record (partial/full)
- Delete service record (soft delete)
- DIY records (no shop)
- Permissions (user isolation)
"""

from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from vehicle_maintenance_tracker.factories import ServiceRecordFactory
from vehicle_maintenance_tracker.models import ServiceRecord


@pytest.mark.django_db
class TestListServiceRecords:
    """Tests for GET /api/maintenance/service-records/."""

    def test_list_service_records_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:service-record-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_service_records_for_authenticated_user(self, authenticated_client, vehicle, service_type, shop):
        """Test listing service records returns only user's records."""
        ServiceRecordFactory.create_batch(3, vehicle=vehicle, service_type=service_type, shop=shop)

        # Create records for another user (should not appear)
        from users.factories import UserFactory

        from vehicle_maintenance_tracker.factories import VehicleFactory

        other_user = UserFactory()
        other_vehicle = VehicleFactory(owner=other_user)
        ServiceRecordFactory.create_batch(2, vehicle=other_vehicle, service_type=service_type)

        url = reverse("vehicle_maintenance_tracker:service-record-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_service_records_by_vehicle(self, authenticated_client, vehicle, second_vehicle, service_type):
        """Test filtering service records by vehicle."""
        ServiceRecordFactory.create_batch(3, vehicle=vehicle, service_type=service_type)
        ServiceRecordFactory.create_batch(2, vehicle=second_vehicle, service_type=service_type)

        url = reverse("vehicle_maintenance_tracker:service-record-list")
        response = authenticated_client.get(url, {"vehicle": vehicle.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_service_records_by_service_type(
        self, authenticated_client, vehicle, service_type, brake_service_type
    ):
        """Test filtering service records by service type."""
        ServiceRecordFactory.create_batch(3, vehicle=vehicle, service_type=service_type)
        ServiceRecordFactory.create_batch(2, vehicle=vehicle, service_type=brake_service_type)

        url = reverse("vehicle_maintenance_tracker:service-record-list")
        response = authenticated_client.get(url, {"service_type": service_type.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3


@pytest.mark.django_db
class TestRetrieveServiceRecord:
    """Tests for GET /api/maintenance/service-records/{id}/."""

    def test_retrieve_service_record_requires_authentication(self, api_client, service_record):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[service_record.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_service_record_returns_details(self, authenticated_client, service_record):
        """Test retrieving a single service record."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[service_record.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == service_record.id
        assert response.data["odometer"] == service_record.odometer
        assert "vehicle" in response.data
        assert "service_type" in response.data
        assert "shop" in response.data

    def test_retrieve_other_users_service_record_forbidden(self, authenticated_client, other_users_service_record):
        """Test that users cannot access other users' service records."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[other_users_service_record.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateServiceRecord:
    """Tests for POST /api/maintenance/service-records/."""

    def test_create_service_record_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:service-record-list")
        data = {}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_service_record_with_shop(self, authenticated_client, vehicle, service_type, shop):
        """Test creating a service record at a shop."""
        url = reverse("vehicle_maintenance_tracker:service-record-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            "shop": shop.id,
            "date": date.today().isoformat(),
            "odometer": vehicle.current_odometer + 500,
            "partsCost": "45.99",
            "laborCost": "35.00",
            "notes": "Regular oil change",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["odometer"] == vehicle.current_odometer + 500
        assert response.data["notes"] == "Regular oil change"

    def test_create_diy_service_record(self, authenticated_client, vehicle, service_type):
        """Test creating a DIY service record (no shop)."""
        url = reverse("vehicle_maintenance_tracker:service-record-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            "date": date.today().isoformat(),
            "odometer": vehicle.current_odometer + 500,
            "partsCost": "35.99",
            "laborCost": "0.00",
            "notes": "DIY oil change in driveway",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        # Shop can be null for DIY - get the most recent record
        record = ServiceRecord.objects.filter(vehicle=vehicle, notes="DIY oil change in driveway").first()
        assert record is not None
        assert record.is_diy is True

    def test_create_service_record_updates_vehicle_odometer(self, authenticated_client, vehicle, service_type):
        """Test that creating a service record updates vehicle odometer."""
        original_odometer = vehicle.current_odometer
        new_odometer = original_odometer + 5000

        url = reverse("vehicle_maintenance_tracker:service-record-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            "date": date.today().isoformat(),
            "odometer": new_odometer,
            "partsCost": "100.00",
            "laborCost": "0.00",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        # Vehicle odometer should be updated
        vehicle.refresh_from_db()
        assert vehicle.current_odometer == new_odometer

    def test_create_service_record_missing_required_fields(self, authenticated_client):
        """Test that creating record without required fields returns validation error."""
        url = reverse("vehicle_maintenance_tracker:service-record-list")
        data = {"notes": "Missing required fields"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "vehicle" in response.data
        assert "serviceType" in str(response.data) or "service_type" in response.data

    def test_create_service_record_for_other_users_vehicle_forbidden(
        self, authenticated_client, other_users_vehicle, service_type
    ):
        """Test that users cannot create records for other users' vehicles."""
        url = reverse("vehicle_maintenance_tracker:service-record-list")
        data = {
            "vehicle": other_users_vehicle.id,
            "serviceType": service_type.id,
            "date": date.today().isoformat(),
            "odometer": 50000,
            "partsCost": "100.00",
            "laborCost": "0.00",
        }
        response = authenticated_client.post(url, data, format="json")

        # Should fail validation since vehicle doesn't belong to user
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUpdateServiceRecord:
    """Tests for PATCH /api/maintenance/service-records/{id}/."""

    def test_partial_update_service_record(self, authenticated_client, service_record):
        """Test partially updating a service record."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[service_record.id])
        data = {
            "notes": "Updated notes - used synthetic oil",
            "partsCost": "55.99",
        }
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["notes"] == "Updated notes - used synthetic oil"

        service_record.refresh_from_db()
        assert service_record.parts_cost == Decimal("55.99")

    def test_update_other_users_service_record_forbidden(self, authenticated_client, other_users_service_record):
        """Test that users cannot update other users' service records."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[other_users_service_record.id])
        data = {"notes": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteServiceRecord:
    """Tests for DELETE /api/maintenance/service-records/{id}/."""

    def test_delete_service_record_soft_deletes(self, authenticated_client, service_record):
        """Test that deleting service record performs soft delete."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[service_record.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        service_record.refresh_from_db()
        assert service_record.is_deleted is True
        assert service_record.deleted_at is not None

    def test_delete_other_users_service_record_forbidden(self, authenticated_client, other_users_service_record):
        """Test that users cannot delete other users' service records."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[other_users_service_record.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestServiceRecordCosts:
    """Tests for service record cost calculations."""

    def test_total_cost_calculation(self, authenticated_client, service_record):
        """Test that total cost is calculated correctly."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[service_record.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        expected_total = service_record.parts_cost + service_record.labor_cost
        assert Decimal(response.data["total_cost"]) == expected_total

    def test_location_display_for_diy(self, authenticated_client, diy_service_record):
        """Test that DIY records show 'DIY' as location."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[diy_service_record.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["location_display"] == "DIY"

    def test_location_display_for_shop(self, authenticated_client, service_record):
        """Test that shop records show shop name as location."""
        url = reverse("vehicle_maintenance_tracker:service-record-detail", args=[service_record.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["location_display"] == service_record.shop.name
