"""Business logic services for the todos app.

Extracts complex operations from views to keep them thin.
Handles transactions, count updates, and multi-model operations.
"""

from django.db import transaction
from django.utils import timezone

from .models import KanbanLane, Project, TodoItem, TodoList


class TodoService:
    """Service layer for todo-related business logic."""

    @staticmethod
    @transaction.atomic
    def complete_item(item: TodoItem) -> TodoItem:
        """Mark an item as completed.

        Updates status, sets completed_at, and triggers count updates.

        Args:
            item: TodoItem instance to complete

        Returns:
            Updated TodoItem instance

        """
        if item.status != TodoItem.Status.COMPLETED:
            item.status = TodoItem.Status.COMPLETED
            item.completed_at = timezone.now()
            item.save(update_fields=["status", "completed_at", "updated_at"])

            # Update list counts (which cascades to project if needed)
            item.todo_list.update_counts()

        return item

    @staticmethod
    @transaction.atomic
    def uncomplete_item(item: TodoItem) -> TodoItem:
        """Mark an item as pending (undo completion).

        Resets status and completed_at, triggers count updates.

        Args:
            item: TodoItem instance to uncomplete

        Returns:
            Updated TodoItem instance

        """
        if item.status == TodoItem.Status.COMPLETED:
            item.status = TodoItem.Status.PENDING
            item.completed_at = None
            item.save(update_fields=["status", "completed_at", "updated_at"])

            # Update list counts (which cascades to project if needed)
            item.todo_list.update_counts()

        return item

    @staticmethod
    @transaction.atomic
    def bulk_complete_items(item_ids: list[int]) -> int:
        """Mark multiple items as completed.

        Updates all items and affected list/project counts.

        Args:
            item_ids: List of TodoItem IDs to complete

        Returns:
            Number of items updated

        """
        items = TodoItem.objects.filter(
            id__in=item_ids,
            is_deleted=False,
            status=TodoItem.Status.PENDING,
        ).select_related("todo_list", "todo_list__project")

        if not items.exists():
            return 0

        # Update all items
        now = timezone.now()
        count = items.update(
            status=TodoItem.Status.COMPLETED,
            completed_at=now,
            updated_at=now,
        )

        # Collect affected lists and projects
        affected_lists = set()
        affected_projects = set()

        for item in items:
            affected_lists.add(item.todo_list)
            if item.todo_list.project:
                affected_projects.add(item.todo_list.project)

        # Update counts
        for todo_list in affected_lists:
            todo_list.update_counts()

        for project in affected_projects:
            project.update_counts()

        return count

    @staticmethod
    @transaction.atomic
    def bulk_delete_items(item_ids: list[int]) -> int:
        """Soft delete multiple items.

        Marks items as deleted and updates counts.

        Args:
            item_ids: List of TodoItem IDs to delete

        Returns:
            Number of items deleted

        """
        items = TodoItem.objects.filter(
            id__in=item_ids,
            is_deleted=False,
        ).select_related("todo_list", "todo_list__project")

        if not items.exists():
            return 0

        # Collect affected lists before deletion
        affected_lists = set()
        affected_projects = set()

        for item in items:
            affected_lists.add(item.todo_list)
            if item.todo_list.project:
                affected_projects.add(item.todo_list.project)

        # Soft delete all items
        now = timezone.now()
        count = items.update(
            is_deleted=True,
            deleted_at=now,
            updated_at=now,
        )

        # Update counts
        for todo_list in affected_lists:
            todo_list.update_counts()

        for project in affected_projects:
            project.update_counts()

        return count

    @staticmethod
    @transaction.atomic
    def reorder_items(item_ids: list[int]) -> list[TodoItem]:
        """Reorder items based on provided ID sequence.

        Updates display_order for all items in the list.

        Args:
            item_ids: List of TodoItem IDs in desired order

        Returns:
            List of updated TodoItem instances

        """
        items = TodoItem.objects.filter(id__in=item_ids, is_deleted=False)

        # Create ID to order mapping
        order_map = {item_id: index for index, item_id in enumerate(item_ids)}

        # Update display_order for each item
        updated_items = []
        for item in items:
            new_order = order_map.get(item.id)
            if new_order is not None and item.display_order != new_order:
                item.display_order = new_order
                item.save(update_fields=["display_order", "updated_at"])
                updated_items.append(item)

        return updated_items

    @staticmethod
    @transaction.atomic
    def move_item_to_lane(item: TodoItem, lane: KanbanLane, display_order: int | None = None) -> TodoItem:
        """Move an item to a different kanban lane.

        Validates lane belongs to same list and updates item.

        Args:
            item: TodoItem to move
            lane: Target KanbanLane
            display_order: Optional new display order in target lane

        Returns:
            Updated TodoItem instance

        Raises:
            ValueError: If lane doesn't belong to the same list

        """
        if lane.todo_list_id != item.todo_list_id:
            raise ValueError("Lane must belong to the same todo list")

        item.kanban_lane = lane

        if display_order is not None:
            item.display_order = display_order

        item.save(update_fields=["kanban_lane", "display_order", "updated_at"])

        return item

    @staticmethod
    @transaction.atomic
    def delete_list_with_items(todo_list: TodoList) -> None:
        """Soft delete a list and all its items.

        Also updates parent project counts if applicable.

        Args:
            todo_list: TodoList instance to delete

        """
        # Soft delete all items in the list
        now = timezone.now()
        todo_list.items.filter(is_deleted=False).update(
            is_deleted=True,
            deleted_at=now,
            updated_at=now,
        )

        # Soft delete all lanes in the list
        todo_list.kanban_lanes.filter(is_deleted=False).update(
            is_deleted=True,
            deleted_at=now,
            updated_at=now,
        )

        # Soft delete the list itself
        todo_list.is_deleted = True
        todo_list.deleted_at = now
        todo_list.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

        # Update parent project counts if exists
        if todo_list.project:
            todo_list.project.update_counts()

    @staticmethod
    @transaction.atomic
    def delete_project_with_lists(project: Project) -> None:
        """Soft delete a project and all its lists/items.

        Cascades soft delete to all child resources.

        Args:
            project: Project instance to delete

        """
        now = timezone.now()

        # Get all lists in the project
        lists = project.lists.filter(is_deleted=False)

        for todo_list in lists:
            # Soft delete all items in each list
            todo_list.items.filter(is_deleted=False).update(
                is_deleted=True,
                deleted_at=now,
                updated_at=now,
            )

            # Soft delete all lanes in each list
            todo_list.kanban_lanes.filter(is_deleted=False).update(
                is_deleted=True,
                deleted_at=now,
                updated_at=now,
            )

        # Soft delete all lists
        lists.update(
            is_deleted=True,
            deleted_at=now,
            updated_at=now,
        )

        # Soft delete the project itself
        project.is_deleted = True
        project.deleted_at = now
        project.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

    @staticmethod
    @transaction.atomic
    def restore_item(item: TodoItem) -> TodoItem:
        """Restore a soft-deleted item.

        Updates counts and ensures parent list is not deleted.

        Args:
            item: TodoItem instance to restore

        Returns:
            Restored TodoItem instance

        Raises:
            ValueError: If parent list is deleted

        """
        if item.todo_list.is_deleted:
            raise ValueError("Cannot restore item: parent list is deleted")

        item.is_deleted = False
        item.deleted_at = None
        item.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

        # Update list counts
        item.todo_list.update_counts()

        return item

    @staticmethod
    @transaction.atomic
    def restore_list(todo_list: TodoList) -> TodoList:
        """Restore a soft-deleted list (without restoring items).

        Items remain deleted - they must be restored individually.

        Args:
            todo_list: TodoList instance to restore

        Returns:
            Restored TodoList instance

        Raises:
            ValueError: If parent project is deleted

        """
        if todo_list.project and todo_list.project.is_deleted:
            raise ValueError("Cannot restore list: parent project is deleted")

        todo_list.is_deleted = False
        todo_list.deleted_at = None
        todo_list.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

        # Update project counts if exists
        if todo_list.project:
            todo_list.project.update_counts()

        return todo_list

    @staticmethod
    @transaction.atomic
    def restore_project(project: Project) -> Project:
        """Restore a soft-deleted project (without restoring lists/items).

        Lists and items remain deleted - they must be restored individually.

        Args:
            project: Project instance to restore

        Returns:
            Restored Project instance

        """
        project.is_deleted = False
        project.deleted_at = None
        project.save(update_fields=["is_deleted", "deleted_at", "updated_at"])

        return project

    @staticmethod
    def get_recently_completed_items(user, minutes: int = 5) -> list[TodoItem]:
        """Get items completed recently (for undo UI).

        Args:
            user: User instance
            minutes: How many minutes to look back (default 5)

        Returns:
            List of recently completed TodoItem instances

        """
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(minutes=minutes)

        return list(
            TodoItem.objects.filter(
                todo_list__owner=user,
                is_deleted=False,
                status=TodoItem.Status.COMPLETED,
                completed_at__gte=cutoff,
            )
            .select_related("todo_list", "todo_list__project")
            .order_by("-completed_at")
        )

    @staticmethod
    @transaction.atomic
    def switch_list_view_mode(todo_list: TodoList, new_mode: str) -> TodoList:
        """Switch list between list and kanban view modes.

        Creates default lane if switching to kanban.
        Clears lane assignments if switching to list.

        Args:
            todo_list: TodoList instance
            new_mode: New view mode ('list' or 'kanban')

        Returns:
            Updated TodoList instance

        """
        if new_mode not in [TodoList.ViewMode.LIST, TodoList.ViewMode.KANBAN]:
            raise ValueError("Invalid view mode")

        if todo_list.view_mode == new_mode:
            return todo_list

        todo_list.view_mode = new_mode

        # If switching to kanban, create default lane
        if new_mode == TodoList.ViewMode.KANBAN:
            default_lane = todo_list.get_or_create_default_lane()

            # Assign all items without a lane to default lane
            todo_list.items.filter(
                is_deleted=False,
                kanban_lane__isnull=True,
            ).update(kanban_lane=default_lane)

        # If switching to list view, clear all lane assignments
        # This allows drag-and-drop reordering to work properly in list view
        elif new_mode == TodoList.ViewMode.LIST:
            todo_list.items.filter(
                is_deleted=False,
                kanban_lane__isnull=False,
            ).update(kanban_lane=None)

        todo_list.save(update_fields=["view_mode", "updated_at"])

        return todo_list

    @staticmethod
    @transaction.atomic
    def archive_project(project: Project, archived: bool = True) -> Project:
        """Archive or unarchive a project.

        Archived projects are hidden but not deleted.

        Args:
            project: Project instance
            archived: True to archive, False to unarchive

        Returns:
            Updated Project instance

        """
        project.is_archived = archived
        project.save(update_fields=["is_archived", "updated_at"])

        return project
