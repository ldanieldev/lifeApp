"""Custom managers and querysets for todo models.

These managers provide optimized queries and prevent N+1 issues.
"""

from django.db import models
from django.db.models import Count, Prefetch, Q


class ProjectManagerMixin:
    """Mixin with common Project query optimizations."""

    def with_lists_and_items(self):
        """Prefetch lists and items to prevent N+1 queries.

        Use this when displaying project details with drill-down.
        """
        from .models import TodoItem, TodoList

        # Prefetch lists with their items
        lists_prefetch = Prefetch(
            "lists",
            queryset=TodoList.objects.filter(is_deleted=False).prefetch_related(
                Prefetch("items", queryset=TodoItem.objects.filter(is_deleted=False).order_by("display_order"))
            ),
        )

        return self.prefetch_related(lists_prefetch)

    def with_completion_stats(self):
        """Annotate projects with real-time completion statistics.

        Note: This is more expensive than using cached counts.
        Use cached counts for list views, this for detail views.
        """
        return self.annotate(
            list_count=Count("lists", filter=Q(lists__is_deleted=False), distinct=True),
            total_items=models.Sum("lists__item_count", filter=Q(lists__is_deleted=False)),
            completed_items=models.Sum("lists__completed_count", filter=Q(lists__is_deleted=False)),
        )


class TodoListManagerMixin:
    """Mixin with common TodoList query optimizations."""

    def with_items(self):
        """Prefetch items to prevent N+1 queries.

        Use when displaying list view with all items.
        """
        from .models import TodoItem

        items_prefetch = Prefetch("items", queryset=TodoItem.objects.filter(is_deleted=False).order_by("display_order"))

        return self.prefetch_related(items_prefetch)

    def with_kanban_lanes(self):
        """Prefetch kanban lanes with items for kanban view.

        Use when displaying kanban board.
        """
        from .models import KanbanLane, TodoItem

        # Prefetch items for each lane
        items_prefetch = Prefetch("items", queryset=TodoItem.objects.filter(is_deleted=False).order_by("display_order"))

        # Prefetch lanes with items
        lanes_prefetch = Prefetch(
            "kanban_lanes", queryset=KanbanLane.objects.filter(is_deleted=False).prefetch_related(items_prefetch)
        )

        return self.prefetch_related(lanes_prefetch)

    def for_project_tree(self, project):
        """Optimized query for project tree view (project -> lists -> completion %).

        Args:
            project: Project instance

        Returns:
            QuerySet with lists and completion stats

        """
        return (
            self.filter(project=project, is_deleted=False)
            .annotate(
                total_items=Count("items", filter=Q(items__is_deleted=False)),
                completed_items=Count("items", filter=Q(items__is_deleted=False, items__status="completed")),
            )
            .order_by("display_order")
        )


class TodoItemManagerMixin:
    """Mixin with common TodoItem query optimizations."""

    def with_relations(self):
        """Select related list, project, and lane to prevent N+1.

        Use for API list endpoints.
        """
        return self.select_related("todo_list", "todo_list__project", "kanban_lane")

    def undoable(self, minutes=5):
        """Get recently completed items eligible for undo.

        Args:
            minutes: Look-back window in minutes

        Returns:
            QuerySet of recently completed items

        """
        from datetime import timedelta

        from django.utils import timezone

        cutoff = timezone.now() - timedelta(minutes=minutes)
        return self.filter(status="completed", completed_at__gte=cutoff, is_deleted=False).order_by("-completed_at")

    def recently_completed(self, minutes=5):
        """Alias for undoable() - get recently completed items.

        Args:
            minutes: Look-back window in minutes

        Returns:
            QuerySet of recently completed items

        """
        return self.undoable(minutes=minutes)

    def overdue(self):
        """Get overdue items (due_date passed and not completed).

        Returns:
            QuerySet of overdue items

        """
        from django.utils import timezone

        return self.filter(due_date__lt=timezone.now(), status="pending", is_deleted=False).order_by("due_date")

    def due_soon(self, hours=24):
        """Get items due within the next N hours.

        Args:
            hours: Look-ahead window in hours

        Returns:
            QuerySet of items due soon

        """
        from datetime import timedelta

        from django.utils import timezone

        now = timezone.now()
        cutoff = now + timedelta(hours=hours)

        return self.filter(due_date__range=(now, cutoff), status="pending", is_deleted=False).order_by("due_date")
