"""API integration tests for Reminder endpoints.

Tests cover:
- List reminders (filtering by vehicle, status)
- Create reminder (validation, intervals)
- Retrieve reminder (with details)
- Update reminder
- Delete reminder (soft delete)
- Mark reminder complete
- Permissions (user isolation)
"""

from datetime import date, timedelta

import pytest
from django.urls import reverse
from rest_framework import status

from vehicle_maintenance_tracker.factories import ReminderFactory


@pytest.mark.django_db
class TestListReminders:
    """Tests for GET /api/maintenance/reminders/."""

    def test_list_reminders_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_reminders_for_authenticated_user(self, authenticated_client, vehicle, service_type):
        """Test listing reminders returns only user's reminders."""
        ReminderFactory.create_batch(3, vehicle=vehicle, service_type=service_type)

        # Create reminders for another user (should not appear)
        from users.factories import UserFactory

        from vehicle_maintenance_tracker.factories import VehicleFactory

        other_user = UserFactory()
        other_vehicle = VehicleFactory(owner=other_user)
        ReminderFactory.create_batch(2, vehicle=other_vehicle, service_type=service_type)

        url = reverse("vehicle_maintenance_tracker:reminder-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_reminders_by_vehicle(self, authenticated_client, vehicle, second_vehicle, service_type):
        """Test filtering reminders by vehicle."""
        ReminderFactory.create_batch(3, vehicle=vehicle, service_type=service_type)
        ReminderFactory.create_batch(2, vehicle=second_vehicle, service_type=service_type)

        url = reverse("vehicle_maintenance_tracker:reminder-list")
        response = authenticated_client.get(url, {"vehicle": vehicle.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3


@pytest.mark.django_db
class TestRetrieveReminder:
    """Tests for GET /api/maintenance/reminders/{id}/."""

    def test_retrieve_reminder_requires_authentication(self, api_client, reminder):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[reminder.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_reminder_returns_details(self, authenticated_client, reminder):
        """Test retrieving a single reminder."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[reminder.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == reminder.id
        assert "vehicle" in response.data
        assert "service_type" in response.data
        assert "mileage_interval" in response.data
        assert "time_interval_months" in response.data
        assert "status" in response.data

    def test_retrieve_other_users_reminder_forbidden(self, authenticated_client, other_users_reminder):
        """Test that users cannot access other users' reminders."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[other_users_reminder.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateReminder:
    """Tests for POST /api/maintenance/reminders/."""

    def test_create_reminder_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        data = {}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_reminder_with_both_intervals(self, authenticated_client, vehicle, service_type):
        """Test creating a reminder with both mileage and time intervals."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            "mileageInterval": 5000,
            "timeIntervalMonths": 6,
            "notes": "Regular oil change reminder",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["mileage_interval"] == 5000
        assert response.data["time_interval_months"] == 6

    def test_create_reminder_with_mileage_only(self, authenticated_client, vehicle, service_type):
        """Test creating a reminder with only mileage interval."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            "mileageInterval": 3000,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["mileage_interval"] == 3000
        assert response.data["time_interval_months"] is None

    def test_create_reminder_with_time_only(self, authenticated_client, vehicle, service_type):
        """Test creating a reminder with only time interval."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            "timeIntervalMonths": 12,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["mileage_interval"] is None
        assert response.data["time_interval_months"] == 12

    def test_create_reminder_requires_at_least_one_interval(self, authenticated_client, vehicle, service_type):
        """Test that creating reminder without any interval fails."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        data = {
            "vehicle": vehicle.id,
            "serviceType": service_type.id,
            # No intervals specified
        }
        response = authenticated_client.post(url, data, format="json")

        # Should fail validation
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_reminder_for_other_users_vehicle_forbidden(
        self, authenticated_client, other_users_vehicle, service_type
    ):
        """Test that users cannot create reminders for other users' vehicles."""
        url = reverse("vehicle_maintenance_tracker:reminder-list")
        data = {
            "vehicle": other_users_vehicle.id,
            "serviceType": service_type.id,
            "mileageInterval": 5000,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUpdateReminder:
    """Tests for PATCH /api/maintenance/reminders/{id}/."""

    def test_partial_update_reminder(self, authenticated_client, reminder):
        """Test partially updating a reminder."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[reminder.id])
        data = {
            "mileageInterval": 7500,
            "notes": "Updated interval",
        }
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["mileage_interval"] == 7500
        assert response.data["notes"] == "Updated interval"

    def test_update_other_users_reminder_forbidden(self, authenticated_client, other_users_reminder):
        """Test that users cannot update other users' reminders."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[other_users_reminder.id])
        data = {"notes": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteReminder:
    """Tests for DELETE /api/maintenance/reminders/{id}/."""

    def test_delete_reminder_soft_deletes(self, authenticated_client, reminder):
        """Test that deleting reminder performs soft delete."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[reminder.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        reminder.refresh_from_db()
        assert reminder.is_deleted is True
        assert reminder.deleted_at is not None

    def test_delete_other_users_reminder_forbidden(self, authenticated_client, other_users_reminder):
        """Test that users cannot delete other users' reminders."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[other_users_reminder.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCompleteReminder:
    """Tests for POST /api/maintenance/reminders/{id}/complete/."""

    def test_complete_reminder(self, authenticated_client, reminder, vehicle):
        """Test marking a reminder as complete."""
        url = reverse("vehicle_maintenance_tracker:reminder-complete", args=[reminder.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        reminder.refresh_from_db()
        assert reminder.last_completed_date == date.today()
        assert reminder.last_completed_odometer == vehicle.current_odometer

    def test_complete_reminder_updates_next_due(self, authenticated_client, reminder):
        """Test that completing a reminder updates next due date/odometer."""
        original_next_due_date = reminder.next_due_date
        original_next_due_odometer = reminder.next_due_odometer

        url = reverse("vehicle_maintenance_tracker:reminder-complete", args=[reminder.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        reminder.refresh_from_db()
        # Next due should be recalculated
        assert reminder.next_due_date != original_next_due_date
        assert reminder.next_due_odometer != original_next_due_odometer

    def test_complete_other_users_reminder_forbidden(self, authenticated_client, other_users_reminder):
        """Test that users cannot complete other users' reminders."""
        url = reverse("vehicle_maintenance_tracker:reminder-complete", args=[other_users_reminder.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestReminderStatus:
    """Tests for reminder status calculation."""

    def test_overdue_reminder_status(self, authenticated_client, overdue_reminder):
        """Test that overdue reminders have correct status."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[overdue_reminder.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "overdue"

    def test_due_soon_reminder_status(self, authenticated_client, due_soon_reminder):
        """Test that due soon reminders have correct status."""
        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[due_soon_reminder.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "due_soon"

    def test_upcoming_reminder_status(self, authenticated_client, reminder):
        """Test that upcoming reminders have correct status."""
        # Set next due date far in the future
        reminder.next_due_date = date.today() + timedelta(days=180)
        reminder.next_due_odometer = reminder.vehicle.current_odometer + 10000
        reminder.save()

        url = reverse("vehicle_maintenance_tracker:reminder-detail", args=[reminder.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "upcoming"
