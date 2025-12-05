"""Django signals for maintaining denormalized counts.

Design Decision:
- Use signals to keep item_count and completed_count in sync
- Alternative: Update counts in service layer (more explicit, but requires discipline)
- Signals chosen for automatic consistency, but documented for transparency
"""

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import Project, TodoItem, TodoList


@receiver(post_save, sender=TodoItem)
def update_counts_on_item_save(sender, instance, created, **kwargs):
    """Update list and project counts when item is created or status changes.

    Triggered on:
    - Item creation
    - Status change (pending <-> completed)
    - Item restoration from soft delete
    """
    # Only update if item is not deleted
    if not instance.is_deleted:
        instance.todo_list.update_counts()


@receiver(pre_delete, sender=TodoItem)
def update_counts_on_item_delete(sender, instance, **kwargs):
    """Update list and project counts when item is soft-deleted.

    Note: Uses pre_delete because post_delete might have cleared relationships.
    """
    # Check if this is a soft delete (is_deleted flag being set)
    # Hard deletes will also trigger this, but that's acceptable
    if instance.todo_list_id:
        try:
            todo_list = instance.todo_list
            # Schedule count update after this transaction
            # (will run after soft delete completes)
            from django.db import transaction

            transaction.on_commit(lambda: todo_list.update_counts())
        except TodoList.DoesNotExist:
            pass


@receiver(post_save, sender=TodoList)
def update_project_counts_on_list_save(sender, instance, created, **kwargs):
    """Update project counts when list is created or restored.

    Only triggers if list belongs to a project.
    """
    if instance.project and not instance.is_deleted:
        instance.project.update_counts()


@receiver(pre_delete, sender=TodoList)
def update_project_counts_on_list_delete(sender, instance, **kwargs):
    """Update project counts when list is soft-deleted."""
    if instance.project_id:
        try:
            project = instance.project
            from django.db import transaction

            transaction.on_commit(lambda: project.update_counts())
        except Project.DoesNotExist:
            pass


@receiver(post_save, sender=TodoItem)
def assign_to_default_lane_on_create(sender, instance, created, **kwargs):
    """Auto-assign new items to default "Backlog" lane if list is in kanban mode.

    Design Decision:
    - New items in kanban view should default to Backlog lane
    - Only applies on creation, not updates
    - Prevents orphaned items in kanban view
    """
    if created and not instance.is_deleted:
        if instance.todo_list.view_mode == TodoList.ViewMode.KANBAN:
            if not instance.kanban_lane:
                default_lane = instance.todo_list.get_or_create_default_lane()
                instance.kanban_lane = default_lane
                instance.save(update_fields=["kanban_lane"])
