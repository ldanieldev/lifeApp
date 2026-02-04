"""API integration tests for Project endpoints.

Tests cover:
- List projects (filtering, search, pagination)
- Create project (validation, ownership)
- Retrieve project (with nested lists)
- Update project (partial/full)
- Delete project (soft delete)
- Archive/unarchive
- Restore soft-deleted project
- Permissions (user isolation)
"""

import pytest
from django.urls import reverse
from rest_framework import status

from todos.factories import ProjectFactory, TodoItemFactory, TodoListFactory
from todos.models import Project


@pytest.mark.django_db
class TestListProjects:
    """Tests for GET /api/todos/projects/."""

    def test_list_projects_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = reverse("project-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_projects_for_authenticated_user(self, authenticated_client, user):
        """Test listing projects returns only user's projects."""
        # Create projects for the user
        ProjectFactory.create_batch(3, owner=user)

        # Create projects for another user (should not appear)
        from users.factories import UserFactory

        other_user = UserFactory()
        ProjectFactory.create_batch(2, owner=other_user)

        url = reverse("project-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3
        assert len(response.data["results"]) == 3

    def test_list_projects_excludes_deleted(self, authenticated_client, user):
        """Test that soft-deleted projects don't appear in list."""
        ProjectFactory(owner=user, name="Active")
        deleted_project = ProjectFactory(owner=user, name="Deleted")
        deleted_project.delete()  # Soft delete

        url = reverse("project-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["name"] == "Active"

    def test_filter_projects_by_archived_status(self, authenticated_client, user):
        """Test filtering projects by is_archived."""
        active_project = ProjectFactory(owner=user, is_archived=False)
        archived_project = ProjectFactory(owner=user, is_archived=True)

        url = reverse("project-list")

        # Filter for active only
        response = authenticated_client.get(url, {"is_archived": "false"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == active_project.id

        # Filter for archived only
        response = authenticated_client.get(url, {"is_archived": "true"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == archived_project.id

    def test_search_projects(self, authenticated_client, user):
        """Test searching projects by name and description."""
        ProjectFactory(owner=user, name="Work Tasks", description="Office work")
        ProjectFactory(owner=user, name="Personal Goals", description="Personal stuff")
        ProjectFactory(owner=user, name="Home Improvement", description="House work")

        url = reverse("project-list")
        response = authenticated_client.get(url, {"search": "work"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2  # "Work Tasks" and "Home Improvement"

    def test_order_projects_by_display_order(self, authenticated_client, user):
        """Test ordering projects by display_order."""
        ProjectFactory(owner=user, name="First", display_order=0)
        ProjectFactory(owner=user, name="Second", display_order=1)
        ProjectFactory(owner=user, name="Third", display_order=2)

        url = reverse("project-list")
        response = authenticated_client.get(url, {"ordering": "display_order"})

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert results[0]["name"] == "First"
        assert results[1]["name"] == "Second"
        assert results[2]["name"] == "Third"

    def test_list_projects_includes_completion_stats(self, authenticated_client, user):
        """Test that project list includes item counts and completion percentage."""
        ProjectFactory(
            owner=user,
            item_count=10,
            completed_count=7,
        )

        url = reverse("project-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        project_data = response.data["results"][0]
        assert project_data["item_count"] == 10
        assert project_data["completed_count"] == 7
        assert project_data["completion_percentage"] == 70


@pytest.mark.django_db
class TestRetrieveProject:
    """Tests for GET /api/todos/projects/{id}/."""

    def test_retrieve_project_requires_authentication(self, api_client, project):
        """Test that unauthenticated requests return 401."""
        url = reverse("project-detail", args=[project.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_project_returns_details(self, authenticated_client, project):
        """Test retrieving a single project."""
        url = reverse("project-detail", args=[project.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == project.id
        assert response.data["name"] == project.name
        assert response.data["description"] == project.description
        assert response.data["color"] == project.color

    def test_retrieve_project_includes_nested_lists(self, authenticated_client, user):
        """Test that project detail includes nested lists."""
        project = ProjectFactory(owner=user)
        TodoListFactory(project=project, owner=user, name="List 1", display_order=0)
        TodoListFactory(project=project, owner=user, name="List 2", display_order=1)

        url = reverse("project-detail", args=[project.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "lists" in response.data
        assert len(response.data["lists"]) == 2
        assert response.data["lists"][0]["name"] == "List 1"
        assert response.data["lists"][1]["name"] == "List 2"

    def test_retrieve_project_excludes_deleted_lists(self, authenticated_client, user):
        """Test that deleted lists don't appear in nested lists."""
        project = ProjectFactory(owner=user)
        TodoListFactory(project=project, owner=user, name="Active")
        deleted_list = TodoListFactory(project=project, owner=user, name="Deleted")
        deleted_list.delete()

        url = reverse("project-detail", args=[project.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["lists"]) == 1
        assert response.data["lists"][0]["name"] == "Active"

    def test_retrieve_project_not_found(self, authenticated_client):
        """Test retrieving non-existent project returns 404."""
        url = reverse("project-detail", args=[99999])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_other_users_project_forbidden(self, authenticated_client, other_users_project):
        """Test that users cannot access other users' projects."""
        url = reverse("project-detail", args=[other_users_project.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateProject:
    """Tests for POST /api/todos/projects/."""

    def test_create_project_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = reverse("project-list")
        data = {"name": "New Project"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_project_with_valid_data(self, authenticated_client, user):
        """Test creating a project with valid data."""
        url = reverse("project-list")
        data = {
            "name": "My New Project",
            "description": "Project description",
            "color": "#3B82F6",
            "displayOrder": 0,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "My New Project"
        assert response.data["description"] == "Project description"
        assert response.data["color"] == "#3B82F6"

        # Verify ownership (response doesn't include id in write serializer, fetch from DB)
        project = Project.objects.get(name="My New Project", owner=user)
        assert project.owner == user
        assert project.item_count == 0
        assert project.completed_count == 0

    def test_create_project_with_minimal_data(self, authenticated_client, user):
        """Test creating project with only required fields."""
        url = reverse("project-list")
        data = {"name": "Minimal Project"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Minimal Project"
        assert response.data["description"] == ""
        assert response.data["color"] == "#3B82F6"  # Default color

    def test_create_project_missing_name_returns_error(self, authenticated_client):
        """Test that creating project without name returns validation error."""
        url = reverse("project-list")
        data = {"description": "No name"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data

    def test_create_project_invalid_color_returns_error(self, authenticated_client):
        """Test that invalid color format returns validation error."""
        url = reverse("project-list")
        data = {
            "name": "Project",
            "color": "invalid-color",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "color" in response.data


@pytest.mark.django_db
class TestUpdateProject:
    """Tests for PATCH /api/todos/projects/{id}/."""

    def test_update_project_requires_authentication(self, api_client, project):
        """Test that unauthenticated requests return 401."""
        url = reverse("project-detail", args=[project.id])
        data = {"name": "Updated"}
        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_partial_update_project(self, authenticated_client, project):
        """Test partially updating a project."""
        url = reverse("project-detail", args=[project.id])
        data = {
            "name": "Updated Project Name",
            "color": "#EF4444",
        }
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Project Name"
        assert response.data["color"] == "#EF4444"
        assert response.data["description"] == project.description  # Unchanged

    def test_full_update_project(self, authenticated_client, project):
        """Test full update of a project."""
        url = reverse("project-detail", args=[project.id])
        data = {
            "name": "Completely New Name",
            "description": "Completely new description",
            "color": "#10B981",
            "displayOrder": 5,
            "isArchived": False,
        }
        response = authenticated_client.put(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Completely New Name"
        assert response.data["description"] == "Completely new description"
        assert response.data["color"] == "#10B981"
        assert response.data["display_order"] == 5

    def test_update_other_users_project_forbidden(self, authenticated_client, other_users_project):
        """Test that users cannot update other users' projects."""
        url = reverse("project-detail", args=[other_users_project.id])
        data = {"name": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_project_with_invalid_color(self, authenticated_client, project):
        """Test that invalid color returns validation error."""
        url = reverse("project-detail", args=[project.id])
        data = {"color": "not-a-hex-color"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestDeleteProject:
    """Tests for DELETE /api/todos/projects/{id}/."""

    def test_delete_project_requires_authentication(self, api_client, project):
        """Test that unauthenticated requests return 401."""
        url = reverse("project-detail", args=[project.id])
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_project_soft_deletes(self, authenticated_client, project):
        """Test that deleting project performs soft delete."""
        url = reverse("project-detail", args=[project.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        project.refresh_from_db()
        assert project.is_deleted is True
        assert project.deleted_at is not None

        # Verify not in default queryset
        assert not Project.objects.filter(id=project.id).exists()

        # Verify in all_objects queryset
        assert Project.all_objects.filter(id=project.id).exists()

    def test_delete_project_cascades_to_lists_and_items(self, authenticated_client, user):
        """Test that deleting project soft-deletes lists and items."""
        project = ProjectFactory(owner=user)
        todo_list = TodoListFactory(project=project, owner=user)
        item = TodoItemFactory(todo_list=todo_list)

        url = reverse("project-detail", args=[project.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify cascade soft delete

        todo_list.refresh_from_db()
        item.refresh_from_db()

        assert todo_list.is_deleted is True
        assert item.is_deleted is True

    def test_delete_other_users_project_forbidden(self, authenticated_client, other_users_project):
        """Test that users cannot delete other users' projects."""
        url = reverse("project-detail", args=[other_users_project.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestArchiveProject:
    """Tests for POST /api/todos/projects/{id}/archive/."""

    def test_archive_project(self, authenticated_client, project):
        """Test archiving a project."""
        url = reverse("project-archive", args=[project.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_archived"] is True

        project.refresh_from_db()
        assert project.is_archived is True

    def test_unarchive_project(self, authenticated_client, archived_project):
        """Test unarchiving a project."""
        url = reverse("project-unarchive", args=[archived_project.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_archived"] is False

        archived_project.refresh_from_db()
        assert archived_project.is_archived is False


@pytest.mark.django_db
class TestRestoreProject:
    """Tests for POST /api/todos/projects/{id}/restore/."""

    def test_restore_deleted_project(self, authenticated_client, user):
        """Test restoring a soft-deleted project."""
        project = ProjectFactory(owner=user)
        project.delete()  # Soft delete

        url = reverse("project-restore", args=[project.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == project.id

        project.refresh_from_db()
        assert project.is_deleted is False
        assert project.deleted_at is None

    def test_restore_non_deleted_project_returns_404(self, authenticated_client, project):
        """Test that restoring non-deleted project returns 404."""
        url = reverse("project-restore", args=[project.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_restore_other_users_deleted_project_forbidden(self, authenticated_client, user, other_user):
        """Test that users cannot restore other users' deleted projects."""
        project = ProjectFactory(owner=other_user)
        project.delete()

        url = reverse("project-restore", args=[project.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
