"""API integration tests for Vehicle endpoints.

Tests cover:
- List vehicles (filtering, search, pagination)
- Create vehicle (validation, ownership)
- Retrieve vehicle (with nested data)
- Update vehicle (partial/full)
- Delete vehicle (soft delete)
- Archive/unarchive
- Odometer update
- Dashboard endpoint
- Permissions (user isolation)
"""

import pytest
from django.urls import reverse
from rest_framework import status

from vehicle_maintenance_tracker.factories import VehicleFactory
from vehicle_maintenance_tracker.models import Vehicle


@pytest.mark.django_db
class TestListVehicles:
    """Tests for GET /api/maintenance/vehicles/."""

    def test_list_vehicles_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_vehicles_for_authenticated_user(self, authenticated_client, user):
        """Test listing vehicles returns only user's vehicles."""
        VehicleFactory.create_batch(3, owner=user)

        # Create vehicles for another user (should not appear)
        from users.factories import UserFactory

        other_user = UserFactory()
        VehicleFactory.create_batch(2, owner=other_user)

        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3
        assert len(response.data["results"]) == 3

    def test_list_vehicles_excludes_deleted(self, authenticated_client, user):
        """Test that soft-deleted vehicles don't appear in list."""
        VehicleFactory(owner=user, name="Active")
        deleted_vehicle = VehicleFactory(owner=user, name="Deleted")
        deleted_vehicle.delete()

        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Active"

    def test_filter_vehicles_by_archived_status(self, authenticated_client, user):
        """Test filtering vehicles by is_archived."""
        VehicleFactory(owner=user, is_archived=False, name="Active")
        VehicleFactory(owner=user, is_archived=True, name="Archived")

        url = reverse("vehicle_maintenance_tracker:vehicle-list")

        # Filter for active only
        response = authenticated_client.get(url, {"is_archived": "false"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Active"

        # Filter for archived only
        response = authenticated_client.get(url, {"is_archived": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Archived"

    def test_search_vehicles(self, authenticated_client, user):
        """Test searching vehicles by name, make, model."""
        VehicleFactory(owner=user, name="Daily Driver", make="Toyota", model="Camry")
        VehicleFactory(owner=user, name="Weekend Warrior", make="Ford", model="Mustang")
        VehicleFactory(owner=user, name="Family Van", make="Toyota", model="Sienna")

        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        response = authenticated_client.get(url, {"search": "Toyota"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2


@pytest.mark.django_db
class TestRetrieveVehicle:
    """Tests for GET /api/maintenance/vehicles/{id}/."""

    def test_retrieve_vehicle_requires_authentication(self, api_client, vehicle):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[vehicle.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_vehicle_returns_details(self, authenticated_client, vehicle):
        """Test retrieving a single vehicle."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[vehicle.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == vehicle.id
        assert response.data["name"] == vehicle.name
        assert response.data["year"] == vehicle.year
        assert response.data["make"] == vehicle.make
        assert response.data["model"] == vehicle.model
        assert response.data["vin"] == vehicle.vin

    def test_retrieve_vehicle_not_found(self, authenticated_client):
        """Test retrieving non-existent vehicle returns 404."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[99999])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_other_users_vehicle_forbidden(self, authenticated_client, other_users_vehicle):
        """Test that users cannot access other users' vehicles."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[other_users_vehicle.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateVehicle:
    """Tests for POST /api/maintenance/vehicles/."""

    def test_create_vehicle_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        data = {"year": 2020, "make": "Toyota", "model": "Camry"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_vehicle_with_valid_data(self, authenticated_client, user):
        """Test creating a vehicle with valid data."""
        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        data = {
            "name": "My New Car",
            "year": 2020,
            "make": "Toyota",
            "model": "Camry",
            "vin": "1HGBH41JXMN109186",
            "licensePlate": "ABC-1234",
            "engine": "2.5L 4-Cylinder",
            "trim": "SE",
            "currentOdometer": 25000,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "My New Car"
        assert response.data["year"] == 2020
        assert response.data["make"] == "Toyota"

        # Verify ownership
        vehicle = Vehicle.objects.get(name="My New Car", owner=user)
        assert vehicle.owner == user

    def test_create_vehicle_with_minimal_data(self, authenticated_client, user):
        """Test creating vehicle with only required fields."""
        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        data = {
            "year": 2020,
            "make": "Honda",
            "model": "Accord",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["year"] == 2020
        assert response.data["make"] == "Honda"
        assert response.data["name"] == ""  # Optional field

    def test_create_vehicle_missing_required_fields(self, authenticated_client):
        """Test that creating vehicle without required fields returns validation error."""
        url = reverse("vehicle_maintenance_tracker:vehicle-list")
        data = {"name": "Missing year, make, model"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "year" in response.data
        assert "make" in response.data
        assert "model" in response.data


@pytest.mark.django_db
class TestUpdateVehicle:
    """Tests for PATCH /api/maintenance/vehicles/{id}/."""

    def test_update_vehicle_requires_authentication(self, api_client, vehicle):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[vehicle.id])
        data = {"name": "Updated"}
        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_partial_update_vehicle(self, authenticated_client, vehicle):
        """Test partially updating a vehicle."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[vehicle.id])
        data = {
            "name": "Updated Name",
            "trim": "XLE",
        }
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Name"
        assert response.data["trim"] == "XLE"
        assert response.data["make"] == vehicle.make  # Unchanged

    def test_update_other_users_vehicle_forbidden(self, authenticated_client, other_users_vehicle):
        """Test that users cannot update other users' vehicles."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[other_users_vehicle.id])
        data = {"name": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteVehicle:
    """Tests for DELETE /api/maintenance/vehicles/{id}/."""

    def test_delete_vehicle_requires_authentication(self, api_client, vehicle):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[vehicle.id])
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_vehicle_soft_deletes(self, authenticated_client, vehicle):
        """Test that deleting vehicle performs soft delete."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[vehicle.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        vehicle.refresh_from_db()
        assert vehicle.is_deleted is True
        assert vehicle.deleted_at is not None

        # Verify not in default queryset
        assert not Vehicle.objects.filter(id=vehicle.id).exists()

        # Verify in all_objects queryset
        assert Vehicle.all_objects.filter(id=vehicle.id).exists()

    def test_delete_other_users_vehicle_forbidden(self, authenticated_client, other_users_vehicle):
        """Test that users cannot delete other users' vehicles."""
        url = reverse("vehicle_maintenance_tracker:vehicle-detail", args=[other_users_vehicle.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestArchiveVehicle:
    """Tests for POST /api/maintenance/vehicles/{id}/archive/."""

    def test_archive_vehicle(self, authenticated_client, vehicle):
        """Test archiving a vehicle."""
        url = reverse("vehicle_maintenance_tracker:vehicle-archive", args=[vehicle.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_archived"] is True

        vehicle.refresh_from_db()
        assert vehicle.is_archived is True

    def test_unarchive_vehicle(self, authenticated_client, archived_vehicle):
        """Test unarchiving a vehicle."""
        url = reverse("vehicle_maintenance_tracker:vehicle-unarchive", args=[archived_vehicle.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_archived"] is False

        archived_vehicle.refresh_from_db()
        assert archived_vehicle.is_archived is False


@pytest.mark.django_db
class TestUpdateOdometer:
    """Tests for POST /api/maintenance/vehicles/{id}/update_odometer/."""

    def test_update_odometer(self, authenticated_client, vehicle):
        """Test updating vehicle odometer."""
        original_odometer = vehicle.current_odometer
        new_odometer = original_odometer + 1000

        url = reverse("vehicle_maintenance_tracker:vehicle-update-odometer", args=[vehicle.id])
        response = authenticated_client.post(url, {"odometer": new_odometer}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["current_odometer"] == new_odometer

        vehicle.refresh_from_db()
        assert vehicle.current_odometer == new_odometer

    def test_update_odometer_cannot_decrease(self, authenticated_client, vehicle):
        """Test that odometer cannot be decreased."""
        url = reverse("vehicle_maintenance_tracker:vehicle-update-odometer", args=[vehicle.id])
        response = authenticated_client.post(url, {"odometer": vehicle.current_odometer - 1000}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestVehicleDashboard:
    """Tests for GET /api/maintenance/vehicles/{id}/dashboard/."""

    def test_get_dashboard(self, authenticated_client, vehicle):
        """Test getting vehicle dashboard."""
        url = reverse("vehicle_maintenance_tracker:vehicle-dashboard", args=[vehicle.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "vehicle" in response.data
        assert "overdue_reminders" in response.data
        assert "upcoming_reminders" in response.data
        assert "recent_services" in response.data
        assert "monthly_costs" in response.data
        assert "yearly_costs" in response.data
        assert "total_spent" in response.data

    def test_dashboard_includes_vehicle_data(self, authenticated_client, vehicle):
        """Test that dashboard includes vehicle details."""
        url = reverse("vehicle_maintenance_tracker:vehicle-dashboard", args=[vehicle.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["vehicle"]["id"] == vehicle.id
        assert response.data["vehicle"]["name"] == vehicle.name

    def test_dashboard_other_users_vehicle_forbidden(self, authenticated_client, other_users_vehicle):
        """Test that users cannot access other users' vehicle dashboards."""
        url = reverse("vehicle_maintenance_tracker:vehicle-dashboard", args=[other_users_vehicle.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
