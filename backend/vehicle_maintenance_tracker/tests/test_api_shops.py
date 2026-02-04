"""API integration tests for Shop endpoints.

Tests cover:
- List shops (search, pagination)
- Create shop (validation, ownership)
- Retrieve shop (with details)
- Update shop
- Delete shop (soft delete)
- Google Places integration
- Permissions (user isolation)
"""

import pytest
from django.urls import reverse
from rest_framework import status

from vehicle_maintenance_tracker.factories import ShopFactory
from vehicle_maintenance_tracker.models import Shop


@pytest.mark.django_db
class TestListShops:
    """Tests for GET /api/maintenance/shops/."""

    def test_list_shops_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:shop-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_shops_for_authenticated_user(self, authenticated_client, user):
        """Test listing shops returns only user's shops."""
        ShopFactory.create_batch(3, owner=user)

        # Create shops for another user (should not appear)
        from users.factories import UserFactory

        other_user = UserFactory()
        ShopFactory.create_batch(2, owner=other_user)

        url = reverse("vehicle_maintenance_tracker:shop-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_search_shops(self, authenticated_client, user):
        """Test searching shops by name and address."""
        ShopFactory(owner=user, name="Premium Auto Care", address="123 Main St")
        ShopFactory(owner=user, name="Budget Mechanics", address="456 Oak Ave")
        ShopFactory(owner=user, name="Quick Lube Express", address="789 Main St")

        url = reverse("vehicle_maintenance_tracker:shop-list")
        response = authenticated_client.get(url, {"search": "Main"})

        assert response.status_code == status.HTTP_200_OK
        # Should find "Premium Auto Care" and "Quick Lube Express" (both on Main St)
        assert response.data["count"] == 2


@pytest.mark.django_db
class TestRetrieveShop:
    """Tests for GET /api/maintenance/shops/{id}/."""

    def test_retrieve_shop_requires_authentication(self, api_client, shop):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[shop.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_shop_returns_details(self, authenticated_client, shop):
        """Test retrieving a single shop."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[shop.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == shop.id
        assert response.data["name"] == shop.name
        assert response.data["address"] == shop.address
        assert response.data["phone"] == shop.phone

    def test_retrieve_shop_with_google_places(self, authenticated_client, shop_with_google_places):
        """Test that shop with Google Places ID has map URL."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[shop_with_google_places.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["google_place_id"] == shop_with_google_places.google_place_id
        assert "google_maps_url" in response.data

    def test_retrieve_other_users_shop_forbidden(self, authenticated_client, other_users_shop):
        """Test that users cannot access other users' shops."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[other_users_shop.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateShop:
    """Tests for POST /api/maintenance/shops/."""

    def test_create_shop_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 403."""
        url = reverse("vehicle_maintenance_tracker:shop-list")
        data = {"name": "New Shop"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_shop_with_valid_data(self, authenticated_client, user):
        """Test creating a shop with valid data."""
        url = reverse("vehicle_maintenance_tracker:shop-list")
        data = {
            "name": "My Trusted Mechanic",
            "address": "123 Service Lane, City, ST 12345",
            "phone": "555-123-4567",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "My Trusted Mechanic"

        # Verify ownership
        shop = Shop.objects.get(name="My Trusted Mechanic", owner=user)
        assert shop.owner == user

    def test_create_shop_with_google_places(self, authenticated_client, user):
        """Test creating a shop with Google Places integration."""
        url = reverse("vehicle_maintenance_tracker:shop-list")
        data = {
            "name": "Dealership Service Center",
            "address": "500 Auto Drive",
            "googlePlaceId": "ChIJxxxxxxxxxxxxxxxxx",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["google_place_id"] == "ChIJxxxxxxxxxxxxxxxxx"

    def test_create_shop_with_minimal_data(self, authenticated_client, user):
        """Test creating shop with only required fields."""
        url = reverse("vehicle_maintenance_tracker:shop-list")
        data = {"name": "Basic Shop"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Basic Shop"
        assert response.data["address"] == ""
        assert response.data["phone"] == ""

    def test_create_shop_missing_name(self, authenticated_client):
        """Test that creating shop without name returns validation error."""
        url = reverse("vehicle_maintenance_tracker:shop-list")
        data = {"address": "123 Main St"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data


@pytest.mark.django_db
class TestUpdateShop:
    """Tests for PATCH /api/maintenance/shops/{id}/."""

    def test_partial_update_shop(self, authenticated_client, shop):
        """Test partially updating a shop."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[shop.id])
        data = {
            "name": "Updated Shop Name",
            "phone": "555-NEW-NUMB",
        }
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Shop Name"
        assert response.data["phone"] == "555-NEW-NUMB"
        assert response.data["address"] == shop.address  # Unchanged

    def test_update_other_users_shop_forbidden(self, authenticated_client, other_users_shop):
        """Test that users cannot update other users' shops."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[other_users_shop.id])
        data = {"name": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteShop:
    """Tests for DELETE /api/maintenance/shops/{id}/."""

    def test_delete_shop_soft_deletes(self, authenticated_client, shop):
        """Test that deleting shop performs soft delete."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[shop.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        shop.refresh_from_db()
        assert shop.is_deleted is True
        assert shop.deleted_at is not None

        # Verify not in default queryset
        assert not Shop.objects.filter(id=shop.id).exists()

    def test_delete_other_users_shop_forbidden(self, authenticated_client, other_users_shop):
        """Test that users cannot delete other users' shops."""
        url = reverse("vehicle_maintenance_tracker:shop-detail", args=[other_users_shop.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
