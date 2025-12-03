"""API integration tests for TodoItem endpoints.

Tests cover:
- List items (filtering by status, priority, due date, search)
- Create item (in list view, in kanban lane)
- Retrieve item
- Update item (title, description, priority, due date)
- Delete item (soft delete)
- Complete/uncomplete actions
- Move to kanban lane action
- Bulk complete action
- Bulk delete action
- Reorder action
- Nested routes (lists/{id}/items/)
"""

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from todos.factories import (
    BacklogLaneFactory,
    CompletedTodoItemFactory,
    KanbanLaneFactory,
    OverdueTodoItemFactory,
    ProjectFactory,
    TodoItemFactory,
    TodoListFactory,
)
from todos.models import TodoItem


@pytest.mark.django_db
class TestListTodoItems:
    """Tests for GET /api/todos/items/"""

    def test_list_items_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = reverse("todoitem-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_items_for_authenticated_user(self, authenticated_client, user):
        """Test listing items returns only user's items."""
        todo_list = TodoListFactory(owner=user)
        TodoItemFactory.create_batch(3, todo_list=todo_list)

        # Create items for another user
        from users.factories import UserFactory

        other_user = UserFactory()
        other_list = TodoListFactory(owner=other_user)
        TodoItemFactory.create_batch(2, todo_list=other_list)

        url = reverse("todoitem-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_filter_items_by_status(self, authenticated_client, user, todo_list):
        """Test filtering items by status."""
        pending_item = TodoItemFactory(todo_list=todo_list, status="pending")
        completed_item = CompletedTodoItemFactory(todo_list=todo_list)

        url = reverse("todoitem-list")

        # Filter for pending
        response = authenticated_client.get(url, {"status": "pending"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == pending_item.id

        # Filter for completed
        response = authenticated_client.get(url, {"status": "completed"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == completed_item.id

    def test_filter_items_by_priority(self, authenticated_client, todo_list):
        """Test filtering items by priority."""
        low_priority = TodoItemFactory(todo_list=todo_list, priority=0)
        high_priority = TodoItemFactory(todo_list=todo_list, priority=3)

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"priority": "3"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == high_priority.id

    def test_filter_items_by_priority_range(self, authenticated_client, todo_list):
        """Test filtering items by priority range."""
        TodoItemFactory(todo_list=todo_list, priority=0)
        TodoItemFactory(todo_list=todo_list, priority=1)
        TodoItemFactory(todo_list=todo_list, priority=2)
        TodoItemFactory(todo_list=todo_list, priority=3)

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"priority_gte": "2"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2  # Priority 2 and 3

    def test_filter_items_by_overdue(self, authenticated_client, todo_list):
        """Test filtering overdue items."""
        overdue_item = OverdueTodoItemFactory(todo_list=todo_list)
        future_item = TodoItemFactory(todo_list=todo_list, due_date=timezone.now() + timedelta(days=1))

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"is_overdue": "true"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == overdue_item.id
        assert response.data["results"][0]["is_overdue"] is True

    def test_filter_items_by_todo_list(self, authenticated_client, user):
        """Test filtering items by list."""
        list1 = TodoListFactory(owner=user)
        list2 = TodoListFactory(owner=user)

        item1 = TodoItemFactory(todo_list=list1)
        item2 = TodoItemFactory(todo_list=list2)

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"todo_list": list1.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == item1.id

    def test_filter_items_by_project(self, authenticated_client, user):
        """Test filtering items by project."""
        project1 = ProjectFactory(owner=user)
        project2 = ProjectFactory(owner=user)

        list1 = TodoListFactory(owner=user, project=project1)
        list2 = TodoListFactory(owner=user, project=project2)

        item1 = TodoItemFactory(todo_list=list1)
        item2 = TodoItemFactory(todo_list=list2)

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"project": project1.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == item1.id

    def test_filter_items_by_kanban_lane(self, authenticated_client, user):
        """Test filtering items by kanban lane."""
        from todos.models import TodoList

        kanban_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        lane1 = KanbanLaneFactory(todo_list=kanban_list)
        lane2 = KanbanLaneFactory(todo_list=kanban_list)

        item1 = TodoItemFactory(todo_list=kanban_list, kanban_lane=lane1)
        item2 = TodoItemFactory(todo_list=kanban_list, kanban_lane=lane2)

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"kanban_lane": lane1.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == item1.id

    def test_filter_recently_completed_items(self, authenticated_client, recently_completed_item, old_completed_item):
        """Test filtering recently completed items (for undo UI)."""
        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"recently_completed": "true"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == recently_completed_item.id

    def test_search_items(self, authenticated_client, todo_list):
        """Test searching items by title and description."""
        TodoItemFactory(todo_list=todo_list, title="Buy milk", description="Dairy product")
        TodoItemFactory(todo_list=todo_list, title="Call dentist", description="Milk tooth issue")
        TodoItemFactory(todo_list=todo_list, title="Walk dog", description="Morning routine")

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"search": "milk"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2  # "Buy milk" and "Call dentist"

    def test_order_items_by_due_date(self, authenticated_client, todo_list):
        """Test ordering items by due date."""
        item1 = TodoItemFactory(todo_list=todo_list, title="Later", due_date=timezone.now() + timedelta(days=3))
        item2 = TodoItemFactory(todo_list=todo_list, title="Sooner", due_date=timezone.now() + timedelta(days=1))

        url = reverse("todoitem-list")
        response = authenticated_client.get(url, {"ordering": "due_date"})

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert results[0]["title"] == "Sooner"
        assert results[1]["title"] == "Later"


@pytest.mark.django_db
class TestRetrieveTodoItem:
    """Tests for GET /api/todos/items/{id}/"""

    def test_retrieve_item_requires_authentication(self, api_client, todo_item):
        """Test that unauthenticated requests return 401."""
        url = reverse("todoitem-detail", args=[todo_item.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_item_returns_details(self, authenticated_client, todo_item):
        """Test retrieving a single item."""
        url = reverse("todoitem-detail", args=[todo_item.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == todo_item.id
        assert response.data["title"] == todo_item.title
        assert response.data["description"] == todo_item.description
        assert response.data["status"] == todo_item.status
        assert response.data["priority"] == todo_item.priority

    def test_retrieve_item_includes_list_and_project_info(self, authenticated_client, user):
        """Test that item detail includes list and project information."""
        project = ProjectFactory(owner=user, name="My Project")
        todo_list = TodoListFactory(owner=user, project=project, name="My List")
        item = TodoItemFactory(todo_list=todo_list)

        url = reverse("todoitem-detail", args=[item.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["todoListId"] == todo_list.id
        assert response.data["todoListName"] == "My List"
        assert response.data["projectId"] == project.id
        assert response.data["projectName"] == "My Project"

    def test_retrieve_other_users_item_forbidden(self, authenticated_client, other_users_item):
        """Test that users cannot access other users' items."""
        url = reverse("todoitem-detail", args=[other_users_item.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestCreateTodoItem:
    """Tests for POST /api/todos/items/"""

    def test_create_item_requires_authentication(self, api_client):
        """Test that unauthenticated requests return 401."""
        url = reverse("todoitem-list")
        data = {"title": "New Item"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_item_with_valid_data(self, authenticated_client, todo_list):
        """Test creating an item with valid data."""
        url = reverse("todoitem-list")
        data = {
            "todoListId": todo_list.id,
            "title": "Buy groceries",
            "description": "Milk, bread, eggs",
            "priority": 1,
            "dueDate": (timezone.now() + timedelta(days=1)).isoformat(),
            "displayOrder": 0,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Buy groceries"
        assert response.data["description"] == "Milk, bread, eggs"
        assert response.data["priority"] == 1

    def test_create_item_with_minimal_data(self, authenticated_client, todo_list):
        """Test creating item with only required fields."""
        url = reverse("todoitem-list")
        data = {
            "todoListId": todo_list.id,
            "title": "Simple task",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Simple task"
        assert response.data["description"] == ""
        assert response.data["priority"] == 0

    def test_create_item_in_kanban_lane(self, authenticated_client, user):
        """Test creating item in specific kanban lane."""
        from todos.models import TodoList

        kanban_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        lane = KanbanLaneFactory(todo_list=kanban_list)

        url = reverse("todoitem-list")
        data = {
            "todoListId": kanban_list.id,
            "title": "Kanban task",
            "kanbanLaneId": lane.id,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["kanbanLaneId"] == lane.id

    def test_create_item_kanban_view_assigns_default_lane(self, authenticated_client, user):
        """Test that items in kanban view get default lane if not specified."""
        from todos.models import TodoList

        kanban_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        default_lane = BacklogLaneFactory(todo_list=kanban_list)

        url = reverse("todoitem-list")
        data = {
            "todoListId": kanban_list.id,
            "title": "Auto-assigned task",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["kanbanLaneId"] == default_lane.id

    def test_create_item_missing_title_returns_error(self, authenticated_client, todo_list):
        """Test that creating item without title returns validation error."""
        url = reverse("todoitem-list")
        data = {"todoListId": todo_list.id}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in response.data

    def test_create_item_missing_list_returns_error(self, authenticated_client):
        """Test that creating item without list returns validation error."""
        url = reverse("todoitem-list")
        data = {"title": "Orphan item"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_item_updates_list_counts(self, authenticated_client, todo_list):
        """Test that creating item updates list item_count."""
        initial_count = todo_list.item_count

        url = reverse("todoitem-list")
        data = {
            "todoListId": todo_list.id,
            "title": "New item",
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        todo_list.refresh_from_db()
        assert todo_list.item_count == initial_count + 1


@pytest.mark.django_db
class TestUpdateTodoItem:
    """Tests for PATCH /api/todos/items/{id}/"""

    def test_update_item_requires_authentication(self, api_client, todo_item):
        """Test that unauthenticated requests return 401."""
        url = reverse("todoitem-detail", args=[todo_item.id])
        data = {"title": "Updated"}
        response = api_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_partial_update_item(self, authenticated_client, todo_item):
        """Test partially updating an item."""
        url = reverse("todoitem-detail", args=[todo_item.id])
        data = {
            "title": "Updated title",
            "priority": 2,
        }
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated title"
        assert response.data["priority"] == 2
        assert response.data["description"] == todo_item.description

    def test_update_due_date(self, authenticated_client, todo_item):
        """Test updating item due date."""
        future_date = timezone.now() + timedelta(days=7)
        url = reverse("todoitem-detail", args=[todo_item.id])
        data = {"dueDate": future_date.isoformat()}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["due_date"] is not None

    def test_update_other_users_item_forbidden(self, authenticated_client, other_users_item):
        """Test that users cannot update other users' items."""
        url = reverse("todoitem-detail", args=[other_users_item.id])
        data = {"title": "Hacked"}
        response = authenticated_client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestDeleteTodoItem:
    """Tests for DELETE /api/todos/items/{id}/"""

    def test_delete_item_requires_authentication(self, api_client, todo_item):
        """Test that unauthenticated requests return 401."""
        url = reverse("todoitem-detail", args=[todo_item.id])
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_item_soft_deletes(self, authenticated_client, todo_item):
        """Test that deleting item performs soft delete."""
        url = reverse("todoitem-detail", args=[todo_item.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        todo_item.refresh_from_db()
        assert todo_item.is_deleted is True
        assert not TodoItem.objects.filter(id=todo_item.id).exists()

    def test_delete_item_updates_list_counts(self, authenticated_client, todo_list):
        """Test that deleting item updates list counts."""
        item = TodoItemFactory(todo_list=todo_list)
        todo_list.update_counts()
        initial_count = todo_list.item_count

        url = reverse("todoitem-detail", args=[item.id])
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        todo_list.refresh_from_db()
        assert todo_list.item_count == initial_count - 1


@pytest.mark.django_db
class TestCompleteItem:
    """Tests for POST /api/todos/items/{id}/complete/"""

    def test_complete_item(self, authenticated_client, todo_item):
        """Test marking item as complete."""
        url = reverse("todoitem-complete", args=[todo_item.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "completed"
        assert response.data["completed_at"] is not None

        todo_item.refresh_from_db()
        assert todo_item.status == TodoItem.Status.COMPLETED

    def test_complete_item_updates_list_counts(self, authenticated_client, todo_list):
        """Test that completing item updates list completed_count."""
        item = TodoItemFactory(todo_list=todo_list, status="pending")
        todo_list.update_counts()
        initial_completed = todo_list.completed_count

        url = reverse("todoitem-complete", args=[item.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        todo_list.refresh_from_db()
        assert todo_list.completed_count == initial_completed + 1


@pytest.mark.django_db
class TestUncompleteItem:
    """Tests for POST /api/todos/items/{id}/uncomplete/"""

    def test_uncomplete_item(self, authenticated_client, completed_item):
        """Test unmarking item (undo completion)."""
        url = reverse("todoitem-uncomplete", args=[completed_item.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "pending"
        assert response.data["completed_at"] is None

        completed_item.refresh_from_db()
        assert completed_item.status == TodoItem.Status.PENDING

    def test_uncomplete_item_updates_list_counts(self, authenticated_client, todo_list):
        """Test that uncompleting item updates list counts."""
        item = CompletedTodoItemFactory(todo_list=todo_list)
        todo_list.update_counts()
        initial_completed = todo_list.completed_count

        url = reverse("todoitem-uncomplete", args=[item.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        todo_list.refresh_from_db()
        assert todo_list.completed_count == initial_completed - 1


@pytest.mark.django_db
class TestMoveLane:
    """Tests for POST /api/todos/items/{id}/move_lane/"""

    def test_move_item_to_different_lane(self, authenticated_client, user):
        """Test moving item to a different kanban lane."""
        from todos.models import TodoList

        kanban_list = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        lane1 = KanbanLaneFactory(todo_list=kanban_list, name="Backlog")
        lane2 = KanbanLaneFactory(todo_list=kanban_list, name="In Progress")

        item = TodoItemFactory(todo_list=kanban_list, kanban_lane=lane1)

        url = reverse("todoitem-move-lane", args=[item.id])
        data = {
            "kanbanLaneId": lane2.id,
            "displayOrder": 0,
        }
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["kanbanLaneId"] == lane2.id

        item.refresh_from_db()
        assert item.kanban_lane == lane2

    def test_move_item_to_lane_in_different_list_fails(self, authenticated_client, user):
        """Test that moving item to lane from different list fails."""
        from todos.models import TodoList

        list1 = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)
        list2 = TodoListFactory(owner=user, view_mode=TodoList.ViewMode.KANBAN)

        lane1 = KanbanLaneFactory(todo_list=list1)
        lane2 = KanbanLaneFactory(todo_list=list2)

        item = TodoItemFactory(todo_list=list1, kanban_lane=lane1)

        url = reverse("todoitem-move-lane", args=[item.id])
        data = {"kanbanLaneId": lane2.id}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestBulkComplete:
    """Tests for POST /api/todos/items/bulk_complete/"""

    def test_bulk_complete_items(self, authenticated_client, multiple_items):
        """Test bulk completing multiple items."""
        item_ids = [item.id for item in multiple_items]

        url = reverse("todoitem-bulk-complete")
        data = {"itemIds": item_ids}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == len(item_ids)

        # Verify all items are completed
        for item in multiple_items:
            item.refresh_from_db()
            assert item.status == TodoItem.Status.COMPLETED

    def test_bulk_complete_empty_list_returns_error(self, authenticated_client):
        """Test that empty item list returns validation error."""
        url = reverse("todoitem-bulk-complete")
        data = {"itemIds": []}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestBulkDelete:
    """Tests for POST /api/todos/items/bulk_delete/"""

    def test_bulk_delete_items(self, authenticated_client, multiple_items):
        """Test bulk deleting multiple items."""
        item_ids = [item.id for item in multiple_items]

        url = reverse("todoitem-bulk-delete")
        data = {"itemIds": item_ids}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == len(item_ids)

        # Verify all items are deleted
        for item in multiple_items:
            item.refresh_from_db()
            assert item.is_deleted is True


@pytest.mark.django_db
class TestReorderItems:
    """Tests for POST /api/todos/items/reorder/"""

    def test_reorder_items(self, authenticated_client, user):
        """Test reordering items."""
        todo_list = TodoListFactory(owner=user)
        item1 = TodoItemFactory(todo_list=todo_list, title="First", display_order=0)
        item2 = TodoItemFactory(todo_list=todo_list, title="Second", display_order=1)
        item3 = TodoItemFactory(todo_list=todo_list, title="Third", display_order=2)

        # Reorder: 3, 1, 2
        url = reverse("todoitem-reorder")
        data = {"itemIds": [item3.id, item1.id, item2.id]}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

        # Verify new order
        item3.refresh_from_db()
        item1.refresh_from_db()
        item2.refresh_from_db()

        assert item3.display_order == 0
        assert item1.display_order == 1
        assert item2.display_order == 2


@pytest.mark.django_db
class TestNestedListItems:
    """Tests for nested route: /api/todos/lists/{id}/items/"""

    def test_list_items_in_list(self, authenticated_client, user):
        """Test listing items within a list."""
        list1 = TodoListFactory(owner=user)
        list2 = TodoListFactory(owner=user)

        item1 = TodoItemFactory(todo_list=list1, title="List 1 Item")
        item2 = TodoItemFactory(todo_list=list2, title="List 2 Item")

        url = reverse("todolist-items-list", args=[list1.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["title"] == "List 1 Item"

    def test_create_item_in_list_via_nested_route(self, authenticated_client, todo_list):
        """Test creating item via nested route auto-sets list."""
        url = reverse("todolist-items-list", args=[todo_list.id])
        data = {"title": "New nested item"}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["todoListId"] == todo_list.id

    def test_nested_route_permission_check(self, authenticated_client, other_users_list):
        """Test that nested route respects list ownership."""
        url = reverse("todolist-items-list", args=[other_users_list.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
