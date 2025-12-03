"""Unit tests for todo models.

Tests cover:
- Model methods (complete, uncomplete, update_counts)
- Properties (completion_percentage, is_overdue)
- Soft delete functionality
- Constraint validation
"""

from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone

from todos.factories import (
    CompletedTodoItemFactory,
    KanbanLaneFactory,
    OverdueTodoItemFactory,
    ProjectFactory,
    StandaloneTodoListFactory,
    TodoItemFactory,
    TodoListFactory,
)
from todos.models import Project, TodoItem, TodoList


@pytest.mark.django_db
class TestProject:
    """Tests for Project model."""

    def test_create_project(self):
        """Test creating a project."""
        project = ProjectFactory()
        assert project.pk is not None
        assert project.item_count == 0
        assert project.completed_count == 0

    def test_completion_percentage_no_items(self):
        """Test completion percentage with no items."""
        project = ProjectFactory()
        assert project.completion_percentage == 0

    def test_completion_percentage_with_items(self):
        """Test completion percentage calculation."""
        project = ProjectFactory(item_count=10, completed_count=7)
        assert project.completion_percentage == 70

    def test_completion_percentage_all_complete(self):
        """Test completion percentage when all items complete."""
        project = ProjectFactory(item_count=10, completed_count=10)
        assert project.completion_percentage == 100

    def test_update_counts(self):
        """Test updating counts from child lists."""
        project = ProjectFactory()
        list1 = TodoListFactory(project=project, item_count=5, completed_count=2)
        list2 = TodoListFactory(project=project, item_count=3, completed_count=3)

        project.update_counts()

        assert project.item_count == 8  # 5 + 3
        assert project.completed_count == 5  # 2 + 3

    def test_update_counts_ignores_deleted_lists(self):
        """Test update_counts ignores soft-deleted lists."""
        project = ProjectFactory()
        list1 = TodoListFactory(project=project, item_count=5, completed_count=2)
        list2 = TodoListFactory(project=project, item_count=3, completed_count=3)
        list2.delete()  # Soft delete

        project.update_counts()

        assert project.item_count == 5  # Only list1
        assert project.completed_count == 2

    def test_soft_delete(self):
        """Test soft deleting a project."""
        project = ProjectFactory()
        project.delete()

        assert project.is_deleted is True
        assert project.deleted_at is not None

        # Should not appear in default queryset
        assert not Project.objects.filter(pk=project.pk).exists()

        # Should appear in all_objects queryset
        assert Project.all_objects.filter(pk=project.pk).exists()

    def test_restore(self):
        """Test restoring a soft-deleted project."""
        project = ProjectFactory()
        project.delete()
        project.restore()

        assert project.is_deleted is False
        assert project.deleted_at is None
        assert Project.objects.filter(pk=project.pk).exists()

    def test_hard_delete(self):
        """Test permanently deleting a project."""
        project = ProjectFactory()
        project_id = project.pk
        project.hard_delete()

        assert not Project.all_objects.filter(pk=project_id).exists()


@pytest.mark.django_db
class TestTodoList:
    """Tests for TodoList model."""

    def test_create_list_with_project(self):
        """Test creating a list within a project."""
        project = ProjectFactory()
        todo_list = TodoListFactory(project=project)

        assert todo_list.project == project
        assert todo_list in project.lists.all()

    def test_create_standalone_list(self):
        """Test creating a list without a project."""
        todo_list = StandaloneTodoListFactory()
        assert todo_list.project is None

    def test_completion_percentage(self):
        """Test completion percentage calculation."""
        todo_list = TodoListFactory(item_count=10, completed_count=4)
        assert todo_list.completion_percentage == 40

    def test_update_counts(self):
        """Test updating counts from items."""
        todo_list = TodoListFactory()
        TodoItemFactory(todo_list=todo_list, status="pending")
        TodoItemFactory(todo_list=todo_list, status="pending")
        TodoItemFactory(todo_list=todo_list, status="completed")

        todo_list.update_counts()

        assert todo_list.item_count == 3
        assert todo_list.completed_count == 1

    def test_update_counts_updates_project(self):
        """Test that updating list counts also updates project counts."""
        project = ProjectFactory()
        todo_list = TodoListFactory(project=project)
        TodoItemFactory(todo_list=todo_list, status="completed")

        todo_list.update_counts()
        project.refresh_from_db()

        assert project.item_count == 1
        assert project.completed_count == 1

    def test_get_or_create_default_lane(self):
        """Test getting or creating the default Backlog lane."""
        todo_list = TodoListFactory(view_mode=TodoList.ViewMode.KANBAN)

        lane = todo_list.get_or_create_default_lane()

        assert lane.name == "Backlog"
        assert lane.is_default is True
        assert lane.todo_list == todo_list

        # Calling again should return same lane
        lane2 = todo_list.get_or_create_default_lane()
        assert lane.pk == lane2.pk


@pytest.mark.django_db
class TestKanbanLane:
    """Tests for KanbanLane model."""

    def test_create_lane(self):
        """Test creating a kanban lane."""
        lane = KanbanLaneFactory()
        assert lane.pk is not None
        assert lane.todo_list is not None

    def test_unique_lane_name_per_list(self):
        """Test that lane names must be unique within a list."""
        todo_list = TodoListFactory()
        KanbanLaneFactory(todo_list=todo_list, name="In Progress")

        # Creating another lane with same name should fail
        with pytest.raises(IntegrityError):
            KanbanLaneFactory(todo_list=todo_list, name="In Progress")

    def test_same_lane_name_different_lists(self):
        """Test that same lane name can exist in different lists."""
        list1 = TodoListFactory()
        list2 = TodoListFactory()

        lane1 = KanbanLaneFactory(todo_list=list1, name="In Progress")
        lane2 = KanbanLaneFactory(todo_list=list2, name="In Progress")

        assert lane1.pk != lane2.pk

    def test_item_count_property(self):
        """Test item_count property."""
        lane = KanbanLaneFactory()
        TodoItemFactory.create_batch(3, kanban_lane=lane, todo_list=lane.todo_list)

        assert lane.item_count == 3


@pytest.mark.django_db
class TestTodoItem:
    """Tests for TodoItem model."""

    def test_create_item(self):
        """Test creating a todo item."""
        item = TodoItemFactory()
        assert item.pk is not None
        assert item.status == TodoItem.Status.PENDING
        assert item.completed_at is None

    def test_complete_method(self):
        """Test marking item as complete."""
        item = TodoItemFactory(status="pending")

        item.complete()

        assert item.status == TodoItem.Status.COMPLETED
        assert item.completed_at is not None

    def test_complete_updates_list_counts(self):
        """Test that completing item triggers list count update."""
        todo_list = TodoListFactory()
        item = TodoItemFactory(todo_list=todo_list, status="pending")

        # Initial state
        todo_list.update_counts()
        assert todo_list.completed_count == 0

        # Complete item
        item.complete()

        # Verify counts updated (via signal)
        todo_list.refresh_from_db()
        assert todo_list.completed_count == 1

    def test_uncomplete_method(self):
        """Test unmarking item (undo)."""
        item = CompletedTodoItemFactory()

        item.uncomplete()

        assert item.status == TodoItem.Status.PENDING
        assert item.completed_at is None

    def test_uncomplete_updates_list_counts(self):
        """Test that uncompleting item triggers list count update."""
        todo_list = TodoListFactory()
        item = CompletedTodoItemFactory(todo_list=todo_list)

        # Initial state
        todo_list.update_counts()
        assert todo_list.completed_count == 1

        # Uncomplete item
        item.uncomplete()

        # Verify counts updated
        todo_list.refresh_from_db()
        assert todo_list.completed_count == 0

    def test_move_to_lane(self):
        """Test moving item to a different lane."""
        todo_list = TodoListFactory(view_mode=TodoList.ViewMode.KANBAN)
        lane1 = KanbanLaneFactory(todo_list=todo_list)
        lane2 = KanbanLaneFactory(todo_list=todo_list)
        item = TodoItemFactory(todo_list=todo_list, kanban_lane=lane1)

        item.move_to_lane(lane2)

        assert item.kanban_lane == lane2

    def test_move_to_lane_different_list_raises_error(self):
        """Test that moving item to lane from different list raises error."""
        list1 = TodoListFactory()
        list2 = TodoListFactory()
        lane2 = KanbanLaneFactory(todo_list=list2)
        item = TodoItemFactory(todo_list=list1)

        with pytest.raises(ValueError, match="same todo list"):
            item.move_to_lane(lane2)

    def test_is_overdue_property_overdue_item(self):
        """Test is_overdue for item past due date."""
        item = OverdueTodoItemFactory()
        assert item.is_overdue is True

    def test_is_overdue_property_not_overdue(self):
        """Test is_overdue for item with future due date."""
        future_date = timezone.now() + timedelta(days=1)
        item = TodoItemFactory(due_date=future_date, status="pending")
        assert item.is_overdue is False

    def test_is_overdue_property_completed_item(self):
        """Test is_overdue returns False for completed items."""
        past_date = timezone.now() - timedelta(days=1)
        item = CompletedTodoItemFactory(due_date=past_date)
        assert item.is_overdue is False

    def test_is_overdue_property_no_due_date(self):
        """Test is_overdue returns False when no due date set."""
        item = TodoItemFactory(due_date=None)
        assert item.is_overdue is False

    def test_recently_completed_queryset(self):
        """Test recently_completed queryset method."""
        # Create completed items at different times
        recent_item = CompletedTodoItemFactory()
        old_item = CompletedTodoItemFactory()

        # Manually set old item's completed_at to 10 minutes ago
        old_item.completed_at = timezone.now() - timedelta(minutes=10)
        old_item.save()

        # Query recently completed (default 5 minutes)
        recent = TodoItem.objects.recently_completed()

        assert recent_item in recent
        assert old_item not in recent

    def test_default_lane_assignment_on_create(self):
        """Test that items in kanban view are auto-assigned to Backlog lane."""
        todo_list = TodoListFactory(view_mode=TodoList.ViewMode.KANBAN)

        item = TodoItemFactory(todo_list=todo_list)

        # Item should be auto-assigned to default lane via signal
        assert item.kanban_lane is not None
        assert item.kanban_lane.name == "Backlog"
        assert item.kanban_lane.is_default is True


@pytest.mark.django_db
class TestSoftDelete:
    """Tests for soft delete functionality across all models."""

    def test_deleting_item_updates_counts(self):
        """Test that deleting item triggers count update."""
        todo_list = TodoListFactory()
        item = TodoItemFactory(todo_list=todo_list)

        todo_list.update_counts()
        assert todo_list.item_count == 1

        item.delete()  # Soft delete

        todo_list.refresh_from_db()
        assert todo_list.item_count == 0

    def test_deleted_items_not_in_default_queryset(self):
        """Test that soft-deleted items don't appear in default queryset."""
        item = TodoItemFactory()
        item.delete()

        assert not TodoItem.objects.filter(pk=item.pk).exists()

    def test_deleted_items_in_all_objects_queryset(self):
        """Test that soft-deleted items appear in all_objects."""
        item = TodoItemFactory()
        item.delete()

        assert TodoItem.all_objects.filter(pk=item.pk).exists()

    def test_restore_functionality(self):
        """Test restoring soft-deleted items."""
        item = TodoItemFactory()
        item.delete()
        item.restore()

        assert TodoItem.objects.filter(pk=item.pk).exists()
        assert item.is_deleted is False


@pytest.mark.django_db
class TestConstraints:
    """Tests for database constraints."""

    def test_project_item_count_non_negative(self):
        """Test that project item_count cannot be negative."""
        project = ProjectFactory()
        project.item_count = -1

        with pytest.raises(IntegrityError):
            project.save()

    def test_project_completed_count_non_negative(self):
        """Test that project completed_count cannot be negative."""
        project = ProjectFactory()
        project.completed_count = -1

        with pytest.raises(IntegrityError):
            project.save()

    def test_list_item_count_non_negative(self):
        """Test that list item_count cannot be negative."""
        todo_list = TodoListFactory()
        todo_list.item_count = -1

        with pytest.raises(IntegrityError):
            todo_list.save()
