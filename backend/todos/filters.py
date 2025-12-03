"""Filters for the todos app.

Provides filtering, searching, and ordering for all todo models.
"""

from django.db import models
from django_filters import rest_framework as filters

from .models import KanbanLane, Project, TodoItem, TodoList


class ProjectFilter(filters.FilterSet):
    """Filter for Project model."""

    name = filters.CharFilter(lookup_expr="icontains")
    is_archived = filters.BooleanFilter()
    search = filters.CharFilter(method="filter_search")

    class Meta:
        model = Project
        fields = ["is_archived"]

    def filter_search(self, queryset, name, value):
        """Search in name and description."""
        return queryset.filter(models.Q(name__icontains=value) | models.Q(description__icontains=value))


class TodoListFilter(filters.FilterSet):
    """Filter for TodoList model."""

    name = filters.CharFilter(lookup_expr="icontains")
    view_mode = filters.ChoiceFilter(choices=TodoList.ViewMode.choices)
    project = filters.NumberFilter(field_name="project__id")
    standalone = filters.BooleanFilter(method="filter_standalone")
    search = filters.CharFilter(method="filter_search")

    class Meta:
        model = TodoList
        fields = ["view_mode", "project"]

    def filter_standalone(self, queryset, name, value):
        """Filter lists without a project."""
        if value:
            return queryset.filter(project__isnull=True)
        return queryset.filter(project__isnull=False)

    def filter_search(self, queryset, name, value):
        """Search in name and description."""
        from django.db import models

        return queryset.filter(models.Q(name__icontains=value) | models.Q(description__icontains=value))


class TodoItemFilter(filters.FilterSet):
    """Filter for TodoItem model."""

    status = filters.ChoiceFilter(choices=TodoItem.Status.choices)
    priority = filters.NumberFilter()
    priority_gte = filters.NumberFilter(field_name="priority", lookup_expr="gte")
    priority_lte = filters.NumberFilter(field_name="priority", lookup_expr="lte")
    due_date = filters.DateTimeFilter()
    due_date_before = filters.DateTimeFilter(field_name="due_date", lookup_expr="lt")
    due_date_after = filters.DateTimeFilter(field_name="due_date", lookup_expr="gt")
    is_overdue = filters.BooleanFilter(method="filter_overdue")
    kanban_lane = filters.NumberFilter(field_name="kanban_lane__id")
    todo_list = filters.NumberFilter(field_name="todo_list__id")
    project = filters.NumberFilter(field_name="todo_list__project__id")
    search = filters.CharFilter(method="filter_search")
    recently_completed = filters.BooleanFilter(method="filter_recently_completed")

    class Meta:
        model = TodoItem
        fields = ["status", "priority", "todo_list", "kanban_lane"]

    def filter_overdue(self, queryset, name, value):
        """Filter overdue items (has due_date in past and not completed)."""
        from django.db import models
        from django.utils import timezone

        if value:
            return queryset.filter(models.Q(due_date__lt=timezone.now()) & ~models.Q(status=TodoItem.Status.COMPLETED))
        return queryset.filter(models.Q(due_date__gte=timezone.now()) | models.Q(status=TodoItem.Status.COMPLETED))

    def filter_search(self, queryset, name, value):
        """Search in title and description."""
        from django.db import models

        return queryset.filter(models.Q(title__icontains=value) | models.Q(description__icontains=value))

    def filter_recently_completed(self, queryset, name, value):
        """Filter items completed in last 5 minutes (for undo)."""
        if not value:
            return queryset

        from datetime import timedelta

        from django.utils import timezone

        cutoff = timezone.now() - timedelta(minutes=5)
        return queryset.filter(
            status=TodoItem.Status.COMPLETED,
            completed_at__gte=cutoff,
        )


class KanbanLaneFilter(filters.FilterSet):
    """Filter for KanbanLane model."""

    todo_list = filters.NumberFilter(field_name="todo_list__id")
    is_default = filters.BooleanFilter()
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = KanbanLane
        fields = ["todo_list", "is_default"]
