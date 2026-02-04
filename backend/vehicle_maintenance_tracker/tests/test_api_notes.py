"""API integration tests for Note (Vehicle Journal) endpoints.

Tests cover:
- List notes (filtering by vehicle)
- Create note (validation)
- Retrieve note (with details)
- Update note
- Delete note (soft delete)
- Permissions (user isolation)
"""

import pytest
from django.urls import reverse
from rest_framework import status

from vehicle_maintenance_tracker.factories import NoteFactory
from vehicle_maintenance_tracker.models import Note


@pytest.mark.django_db
class TestListNotes:
    """Tests for GET /api/maintenance/notes/."""

    def test_list_notes_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:note-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_notes_for_authenticated_user(self, authenticated_client, vehicle):
        """Test listing notes returns only user's notes."""
        NoteFactory.create_batch(3, vehicle=vehicle)

        # Create notes for another user (should not appear)
        from users.factories import UserFactory

        from vehicle_maintenance_tracker.factories import VehicleFactory

        other_user = UserFactory()
        other_vehicle = VehicleFactory(owner=other_user)
        NoteFactory.create_batch(2, vehicle=other_vehicle)

        url = reverse("vehicle_maintenance_tracker:note-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_notes_by_vehicle(self, authenticated_client, vehicle, second_vehicle):
        """Test filtering notes by vehicle."""
        NoteFactory.create_batch(3, vehicle=vehicle)
        NoteFactory.create_batch(2, vehicle=second_vehicle)

        url = reverse("vehicle_maintenance_tracker:note-list")
        response = authenticated_client.get(url, {"vehicle": vehicle.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_search_notes(self, authenticated_client, vehicle):
        """Test searching notes by content."""
        NoteFactory(vehicle=vehicle, content="Strange noise when turning left")
        NoteFactory(vehicle=vehicle, content="Check engine light came on")
        NoteFactory(vehicle=vehicle, content="Brakes feel soft")

        url = reverse("vehicle_maintenance_tracker:note-list")
        response = authenticated_client.get(url, {"search": "noise"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1


@pytest.mark.django_db
class TestRetrieveNote:
    """Tests for GET /api/maintenance/notes/{id}/."""

    def test_retrieve_note_requires_authentication(self, api_client, note):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[note.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_note_returns_details(self, authenticated_client, note):
        """Test retrieving a single note."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[note.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == note.id
        assert response.data["content"] == note.content
        assert response.data["odometer"] == note.odometer
        assert "vehicle" in response.data

    def test_retrieve_other_users_note_forbidden(self, authenticated_client, other_users_note):
        """Test that users cannot access other users' notes."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[other_users_note.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateNote:
    """Tests for POST /api/maintenance/notes/."""

    def test_create_note_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:note-list")
        data = {"content": "Test note"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_note_with_valid_data(self, authenticated_client, vehicle):
        """Test creating a note with valid data."""
        url = reverse("vehicle_maintenance_tracker:note-list")
        data = {
            "vehicle": vehicle.id,
            "content": "Noticed a small oil leak under the car",
            "odometer": vehicle.current_odometer,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["content"] == "Noticed a small oil leak under the car"
        assert response.data["odometer"] == vehicle.current_odometer

    def test_create_note_without_odometer(self, authenticated_client, vehicle):
        """Test creating a note without odometer."""
        url = reverse("vehicle_maintenance_tracker:note-list")
        data = {
            "vehicle": vehicle.id,
            "content": "Just a general observation",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["odometer"] is None

    def test_create_note_missing_content(self, authenticated_client, vehicle):
        """Test that creating note without content returns validation error."""
        url = reverse("vehicle_maintenance_tracker:note-list")
        data = {"vehicle": vehicle.id}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "content" in response.data

    def test_create_note_for_other_users_vehicle_forbidden(self, authenticated_client, other_users_vehicle):
        """Test that users cannot create notes for other users' vehicles."""
        url = reverse("vehicle_maintenance_tracker:note-list")
        data = {
            "vehicle": other_users_vehicle.id,
            "content": "Trying to add note to someone else's car",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUpdateNote:
    """Tests for PATCH /api/maintenance/notes/{id}/."""

    def test_partial_update_note(self, authenticated_client, note):
        """Test partially updating a note."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[note.id])
        data = {"content": "Updated observation - noise is getting worse"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["content"] == "Updated observation - noise is getting worse"
        assert response.data["odometer"] == note.odometer  # Unchanged

    def test_update_other_users_note_forbidden(self, authenticated_client, other_users_note):
        """Test that users cannot update other users' notes."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[other_users_note.id])
        data = {"content": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteNote:
    """Tests for DELETE /api/maintenance/notes/{id}/."""

    def test_delete_note_soft_deletes(self, authenticated_client, note):
        """Test that deleting note performs soft delete."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[note.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        note.refresh_from_db()
        assert note.is_deleted is True
        assert note.deleted_at is not None

        # Verify not in default queryset
        assert not Note.objects.filter(id=note.id).exists()

    def test_delete_other_users_note_forbidden(self, authenticated_client, other_users_note):
        """Test that users cannot delete other users' notes."""
        url = reverse("vehicle_maintenance_tracker:note-detail", args=[other_users_note.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNoteOrdering:
    """Tests for note ordering (most recent first)."""

    def test_notes_ordered_by_created_at_descending(self, authenticated_client, vehicle):
        """Test that notes are returned with most recent first."""
        note1 = NoteFactory(vehicle=vehicle, content="First note")
        note2 = NoteFactory(vehicle=vehicle, content="Second note")
        note3 = NoteFactory(vehicle=vehicle, content="Third note")

        url = reverse("vehicle_maintenance_tracker:note-list")
        response = authenticated_client.get(url, {"vehicle": vehicle.id})

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        # Most recent should be first
        assert results[0]["id"] == note3.id
        assert results[1]["id"] == note2.id
        assert results[2]["id"] == note1.id
