"""API integration tests for TodoList endpoints.

Tests cover:
- List todo lists (filtering by project, view mode)
- Create list (with/without project, default view mode)
- Retrieve list (with items or lanes)
- Update list (change view mode)
- Delete list (cascade to items)
- Switch view mode action
- Nested routes (projects/{id}/lists/)
"""

import pytest
from django.urls import reverse
from rest_framework import status

from todos.factories import (
    BacklogLaneFactory,
    KanbanLaneFactory,
    ProjectFactory,
    StandaloneTodoListFactory,
    TodoItemFactory,
    TodoListFactory,
)
from todos.models import TodoList


@pytest.mark.django_db
class TestListTodoLists:
    """Tests for GET /api/todos/lists/."""

    def test_list_todo_lists_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = reverse("todolist-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_todo_lists_for_authenticated_user(self, authenticated_client, user):
        """Test listing todo lists returns only user's lists."""
        TodoListFactory.create_batch(3, owner=user)

        # Create lists for another user
        from users.factories import UserFactory

        other_user = UserFactory()
        TodoListFactory.create_batch(2, owner=other_user)

        url = reverse("todolist-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_lists_by_view_mode(self, authenticated_client, user):
        """Test filtering lists by view mode."""
        list_view = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.LIST)
        kanban_view = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)

        url = reverse("todolist-list")

        # Filter for list view
        response = authenticated_client.get(url, {"view_mode": "list"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == list_view.id

        # Filter for kanban view
        response = authenticated_client.get(url, {"view_mode": "kanban"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == kanban_view.id

    def test_filter_lists_by_project(self, authenticated_client, user):
        """Test filtering lists by project."""
        project1 = ProjectFactory(owner=user)
        project2 = ProjectFactory(owner=user)

        list1 = TodoListFactory(owner=user, project=project1)
        TodoListFactory(owner=user, project=project2)
        StandaloneTodoListFactory(owner=user)

        url = reverse("todolist-list")
        response = authenticated_client.get(url, {"project": project1.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == list1.id

    def test_filter_standalone_lists(self, authenticated_client, user):
        """Test filtering standalone lists (no project)."""
        project = ProjectFactory(owner=user)
        TodoListFactory(owner=user, project=project)
        StandaloneTodoListFactory(owner=user)
        StandaloneTodoListFactory(owner=user)

        url = reverse("todolist-list")
        response = authenticated_client.get(url, {"standalone": "true"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_search_lists(self, authenticated_client, user):
        """Test searching lists by name and description."""
        TodoListFactory(owner=user, name="Shopping List", description="Groceries")
        TodoListFactory(owner=user, name="Work Tasks", description="Office work")
        TodoListFactory(owner=user, name="Personal Goals", description="Shopping for growth")

        url = reverse("todolist-list")
        response = authenticated_client.get(url, {"search": "shopping"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2  # "Shopping List" and "Personal Goals"

    def test_list_includes_project_info(self, authenticated_client, user):
        """Test that list includes project ID and name."""
        project = ProjectFactory(owner=user, name="My Project")
        TodoListFactory(owner=user, project=project)

        url = reverse("todolist-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        list_data = response.data["results"][0]
        assert list_data["project_id"] == project.id
        assert list_data["project_name"] == "My Project"


@pytest.mark.django_db
class TestRetrieveTodoList:
    """Tests for GET /api/todos/lists/{id}/."""

    def test_retrieve_list_requires_authentication(self, api_client, todo_list):
        """Test that unauthenticated requests return 401."""
        url = reverse("todolist-detail", args=[todo_list.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_list_view_includes_items(self, authenticated_client, user):
        """Test that list view detail includes items array."""
        todo_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.LIST)
        TodoItemFactory(todo_list=todo_list, title="Item 1", display_order=0)
        TodoItemFactory(todo_list=todo_list, title="Item 2", display_order=1)

        url = reverse("todolist-detail", args=[todo_list.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "items" in response.data
        assert len(response.data["items"]) == 2
        assert response.data["items"][0]["title"] == "Item 1"
        assert response.data["items"][1]["title"] == "Item 2"
        assert response.data["kanban_lanes"] is None

    def test_retrieve_kanban_view_includes_lanes(self, authenticated_client, user):
        """Test that kanban view detail includes lanes with items."""
        kanban_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        backlog_lane = BacklogLaneFactory(todo_list=kanban_list, display_order=0)
        in_progress_lane = KanbanLaneFactory(todo_list=kanban_list, name="In Progress", display_order=1)

        TodoItemFactory(todo_list=kanban_list, kanban_lane=backlog_lane, title="Backlog Item")
        TodoItemFactory(todo_list=kanban_list, kanban_lane=in_progress_lane, title="In Progress Item")

        url = reverse("todolist-detail", args=[kanban_list.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "kanban_lanes" in response.data
        assert len(response.data["kanban_lanes"]) == 2
        assert response.data["items"] is None

        # Check lane structure
        lanes = response.data["kanban_lanes"]
        assert lanes[0]["name"] == "Backlog"
        assert len(lanes[0]["items"]) == 1
        assert lanes[0]["items"][0]["title"] == "Backlog Item"

        assert lanes[1]["name"] == "In Progress"
        assert len(lanes[1]["items"]) == 1

    def test_retrieve_list_excludes_deleted_items(self, authenticated_client, todo_list):
        """Test that deleted items don't appear in list."""
        TodoItemFactory(todo_list=todo_list, title="Active")
        deleted_item = TodoItemFactory(todo_list=todo_list, title="Deleted")
        deleted_item.delete()

        url = reverse("todolist-detail", args=[todo_list.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["items"]) == 1
        assert response.data["items"][0]["title"] == "Active"

    def test_retrieve_other_users_list_forbidden(self, authenticated_client, other_users_list):
        """Test that users cannot access other users' lists."""
        url = reverse("todolist-detail", args=[other_users_list.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateTodoList:
    """Tests for POST /api/todos/lists/."""

    def test_create_list_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = reverse("todolist-list")
        data = {"name": "New List"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_list_with_valid_data(self, authenticated_client, user):
        """Test creating a list with valid data."""
        url = reverse("todolist-list")
        data = {
            "name": "My Todo List",
            "description": "List description",
            "viewMode": "list",
            "displayOrder": 0,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "My Todo List"
        assert response.data["description"] == "List description"  # Verify ownership
        todo_list = TodoList.objects.get(name=response.data["name"], owner=user)
        assert todo_list.owner == user

    def test_create_list_in_project(self, authenticated_client, user, project):
        """Test creating a list within a project."""
        url = reverse("todolist-list")
        data = {
            "name": "Project List",
            "projectId": project.id,
            "viewMode": "list",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["project_id"] == project.id

        todo_list = TodoList.objects.get(name=response.data["name"], owner=user)
        assert todo_list.project == project

    def test_create_standalone_list(self, authenticated_client, user):
        """Test creating a list without a project."""
        url = reverse("todolist-list")
        data = {
            "name": "Standalone List",
            "viewMode": "list",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["project_id"] is None

    def test_create_kanban_list_creates_default_lane(self, authenticated_client, user):
        """Test that creating kanban list auto-creates Backlog lane."""
        url = reverse("todolist-list")
        data = {
            "name": "Kanban Board",
            "viewMode": "kanban",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        # Verify default lane was created
        todo_list = TodoList.objects.get(name=response.data["name"], owner=user)
        default_lane = todo_list.kanban_lanes.filter(is_default=True).first()
        assert default_lane is not None
        assert default_lane.name == "Backlog"

    def test_create_list_missing_name_returns_error(self, authenticated_client):
        """Test that creating list without name returns validation error."""
        url = reverse("todolist-list")
        data = {"description": "No name"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data


@pytest.mark.django_db
class TestUpdateTodoList:
    """Tests for PATCH /api/todos/lists/{id}/."""

    def test_update_list_requires_authentication(self, api_client, todo_list):
        """Test that unauthenticated requests return 401."""
        url = reverse("todolist-detail", args=[todo_list.id])
        data = {"name": "Updated"}
        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_partial_update_list(self, authenticated_client, todo_list):
        """Test partially updating a list."""
        url = reverse("todolist-detail", args=[todo_list.id])
        data = {"name": "Updated List Name"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated List Name"
        assert response.data["description"] == todo_list.description

    def test_update_other_users_list_forbidden(self, authenticated_client, other_users_list):
        """Test that users cannot update other users' lists."""
        url = reverse("todolist-detail", args=[other_users_list.id])
        data = {"name": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteTodoList:
    """Tests for DELETE /api/todos/lists/{id}/."""

    def test_delete_list_requires_authentication(self, api_client, todo_list):
        """Test that unauthenticated requests return 401."""
        url = reverse("todolist-detail", args=[todo_list.id])
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_list_soft_deletes(self, authenticated_client, todo_list):
        """Test that deleting list performs soft delete."""
        url = reverse("todolist-detail", args=[todo_list.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        todo_list.refresh_from_db()
        assert todo_list.is_deleted is True
        assert not TodoList.objects.filter(id=todo_list.id).exists()

    def test_delete_list_cascades_to_items(self, authenticated_client, user):
        """Test that deleting list soft-deletes all items."""
        todo_list = TodoListFactory(owner=user)
        item1 = TodoItemFactory(todo_list=todo_list)
        item2 = TodoItemFactory(todo_list=todo_list)

        url = reverse("todolist-detail", args=[todo_list.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        item1.refresh_from_db()
        item2.refresh_from_db()
        assert item1.is_deleted is True
        assert item2.is_deleted is True

    def test_delete_other_users_list_forbidden(self, authenticated_client, other_users_list):
        """Test that users cannot delete other users' lists."""
        url = reverse("todolist-detail", args=[other_users_list.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSwitchViewMode:
    """Tests for POST /api/todos/lists/{id}/switch_view/."""

    def test_switch_from_list_to_kanban(self, authenticated_client, user):
        """Test switching from list view to kanban view."""
        todo_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.LIST)
        item = TodoItemFactory(todo_list=todo_list, kanban_lane=None)

        url = reverse("todolist-switch-view", args=[todo_list.id])
        data = {"viewMode": "kanban"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["view_mode"] == "kanban"

        # Verify default lane was created
        todo_list.refresh_from_db()
        default_lane = todo_list.kanban_lanes.filter(is_default=True).first()
        assert default_lane is not None

        # Verify item was assigned to default lane
        item.refresh_from_db()
        assert item.kanban_lane == default_lane

    def test_switch_from_kanban_to_list(self, authenticated_client, user):
        """Test switching from kanban view to list view."""
        kanban_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        lane = KanbanLaneFactory(todo_list=kanban_list)
        item = TodoItemFactory(todo_list=kanban_list, kanban_lane=lane)

        url = reverse("todolist-switch-view", args=[kanban_list.id])
        data = {"viewMode": "list"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["view_mode"] == "list"

        # Verify lane assignment was cleared
        item.refresh_from_db()
        assert item.kanban_lane is None


@pytest.mark.django_db
class TestRestoreTodoList:
    """Tests for POST /api/todos/lists/{id}/restore/."""

    def test_restore_deleted_list(self, authenticated_client, user):
        """Test restoring a soft-deleted list."""
        todo_list = TodoListFactory(owner=user)
        todo_list.delete()

        url = reverse("todolist-restore", args=[todo_list.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        todo_list.refresh_from_db()
        assert todo_list.is_deleted is False


@pytest.mark.django_db
class TestNestedProjectLists:
    """Tests for nested route: /api/todos/projects/{id}/lists/."""

    def test_list_project_lists(self, authenticated_client, user):
        """Test listing lists within a project."""
        project = ProjectFactory(owner=user)
        TodoListFactory(owner=user, project=project, name="List 1")
        TodoListFactory(owner=user, project=project, name="List 2")
        TodoListFactory(owner=user)  # Different project

        url = reverse("project-lists-list", args=[project.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_create_list_in_project_via_nested_route(self, authenticated_client, user, project):
        """Test creating a list via nested route auto-sets project."""
        url = reverse("project-lists-list", args=[project.id])
        data = {
            "name": "New List",
            "viewMode": "list",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["project_id"] == project.id

    def test_nested_route_permission_check(self, authenticated_client, other_users_project):
        """Test that nested route respects project ownership."""
        url = reverse("project-lists-list", args=[other_users_project.id])
        response = authenticated_client.get(url)

        # Returns 403 Forbidden (not 404) to indicate permission denied
        assert response.status_code == status.HTTP_403_FORBIDDEN
