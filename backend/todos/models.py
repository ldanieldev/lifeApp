"""Todo application models.

Design Decisions:
-----------------
1. Soft deletes: All models use soft delete (is_deleted flag) to support undo functionality
2. Denormalization: item_count and completed_count cached on lists/projects for performance
3. Ordering: display_order field for user-controlled ordering (drag-and-drop support)
4. Audit trail: created_at/updated_at timestamps on all models
5. Indexes: Composite indexes on (owner, is_deleted) for common query patterns
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that filters out soft-deleted objects by default."""

    def active(self):
        """Return only non-deleted objects."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Return only soft-deleted objects."""
        return self.filter(is_deleted=True)

    def hard_delete(self):
        """Permanently delete objects (use with caution)."""
        return super().delete()


class SoftDeleteManager(models.Manager):
    """Manager that returns only non-deleted objects by default."""

    def get_queryset(self):
        """Override to return only active objects."""
        return SoftDeleteQuerySet(self.model, using=self._db).active()

    def all_with_deleted(self):
        """Return all objects including soft-deleted ones."""
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self):
        """Return only soft-deleted objects."""
        return SoftDeleteQuerySet(self.model, using=self._db).deleted()


class TimeStampedModel(models.Model):
    """Abstract base model with timestamp fields."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(TimeStampedModel):
    """Abstract base model with soft delete functionality."""

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Access to all objects including deleted

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete the object."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(using=using)

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the object."""
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restore a soft-deleted object."""
        self.is_deleted = False
        self.deleted_at = None
        self.save()


class ProjectQuerySet(SoftDeleteQuerySet):
    """Custom queryset for Project model."""

    def with_stats(self):
        """Annotate projects with calculated statistics.

        Note: We use cached counts (item_count, completed_count) for performance.
        This query adds runtime calculations for verification/display purposes.
        """
        return self.annotate(
            total_lists=models.Count("lists", filter=models.Q(lists__is_deleted=False), distinct=True),
            total_items_calc=models.Sum("lists__item_count", filter=models.Q(lists__is_deleted=False)),
            completed_items_calc=models.Sum("lists__completed_count", filter=models.Q(lists__is_deleted=False)),
        )


class ProjectManager(SoftDeleteManager):
    """Custom manager for Project model."""

    def get_queryset(self):
        """Return queryset with select_related for owner."""
        return ProjectQuerySet(self.model, using=self._db).active().select_related("owner")

    def for_user(self, user):
        """Get all projects for a specific user."""
        return self.filter(owner=user)


class Project(SoftDeleteModel):
    """A project groups multiple todo lists together.

    Design Decisions:
    - Cached item counts for O(1) percentage calculations
    - Color field for UI customization
    - is_archived for completed projects (separate from soft delete)
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects", db_index=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    color = models.CharField(
        max_length=7,
        default="#3B82F6",  # Tailwind blue-500
        help_text="Hex color code for project display",
    )

    # Denormalized counts for performance (updated via signals or service layer)
    item_count = models.PositiveIntegerField(
        default=0, help_text="Total number of items across all lists in this project"
    )
    completed_count = models.PositiveIntegerField(
        default=0, help_text="Total number of completed items across all lists"
    )

    # Soft archival (separate from deletion)
    is_archived = models.BooleanField(
        default=False, db_index=True, help_text="Archived projects are hidden but not deleted"
    )

    # User-controlled ordering for display
    display_order = models.PositiveIntegerField(
        default=0, db_index=True, help_text="Order for displaying projects (lower numbers first)"
    )

    objects = ProjectManager()

    class Meta:
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "is_deleted", "is_archived"]),
            models.Index(fields=["owner", "display_order"]),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(item_count__gte=0), name="project_item_count_non_negative"),
            models.CheckConstraint(check=models.Q(completed_count__gte=0), name="project_completed_count_non_negative"),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.email})"

    @property
    def completion_percentage(self):
        """Calculate completion percentage.

        Returns:
            int: Percentage (0-100), or 0 if no items

        """
        if self.item_count == 0:
            return 0
        return int((self.completed_count / self.item_count) * 100)

    def update_counts(self):
        """Recalculate item counts from child lists.

        This should be called via service layer when lists are added/removed
        or when list counts change.
        """
        from django.db.models import Sum

        aggregates = self.lists.filter(is_deleted=False).aggregate(
            total_items=Sum("item_count"), total_completed=Sum("completed_count")
        )

        self.item_count = aggregates["total_items"] or 0
        self.completed_count = aggregates["total_completed"] or 0
        self.save(update_fields=["item_count", "completed_count", "updated_at"])


class TodoListQuerySet(SoftDeleteQuerySet):
    """Custom queryset for TodoList model."""

    def with_stats(self):
        """Annotate lists with item statistics."""
        return self.annotate(
            total_items_calc=models.Count("items", filter=models.Q(items__is_deleted=False), distinct=True),
            completed_items_calc=models.Count(
                "items", filter=models.Q(items__is_deleted=False, items__status="completed"), distinct=True
            ),
            lane_count=models.Count("kanban_lanes", filter=models.Q(kanban_lanes__is_deleted=False), distinct=True),
        )

    def standalone(self):
        """Get lists that don't belong to any project."""
        return self.filter(project__isnull=True)

    def in_project(self, project):
        """Get lists belonging to a specific project."""
        return self.filter(project=project)


class TodoListManager(SoftDeleteManager):
    """Custom manager for TodoList model."""

    def get_queryset(self):
        """Return queryset with select_related optimizations."""
        return TodoListQuerySet(self.model, using=self._db).active().select_related("owner", "project")

    def for_user(self, user):
        """Get all lists for a specific user (standalone + in projects)."""
        return self.filter(owner=user)


class TodoList(SoftDeleteModel):
    """A todo list contains items and can be viewed in list or kanban mode.

    Design Decisions:
    - Lists can exist standalone OR belong to a project (nullable FK)
    - Cached item counts for performance
    - View mode stored per-list (user preference)
    - Default kanban lane stored in settings field
    """

    class ViewMode(models.TextChoices):
        LIST = "list", "List View"
        KANBAN = "kanban", "Kanban View"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todo_lists", db_index=True
    )
    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="lists",
        null=True,
        blank=True,
        help_text="Optional: List can belong to a project",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    # View configuration
    view_mode = models.CharField(
        max_length=10, choices=ViewMode.choices, default=ViewMode.LIST, help_text="Current view mode for this list"
    )

    # Denormalized counts (updated via signals or service layer)
    item_count = models.PositiveIntegerField(default=0, help_text="Total number of items in this list")
    completed_count = models.PositiveIntegerField(default=0, help_text="Number of completed items")

    # User-controlled ordering
    display_order = models.PositiveIntegerField(
        default=0, db_index=True, help_text="Order within project or standalone lists"
    )

    objects = TodoListManager()

    class Meta:
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "is_deleted"]),
            models.Index(fields=["project", "is_deleted"]),
            models.Index(fields=["owner", "project", "display_order"]),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(item_count__gte=0), name="list_item_count_non_negative"),
            models.CheckConstraint(check=models.Q(completed_count__gte=0), name="list_completed_count_non_negative"),
        ]

    def __str__(self):
        if self.project:
            return f"{self.name} (Project: {self.project.name})"
        return f"{self.name} (Standalone)"

    @property
    def completion_percentage(self):
        """Calculate completion percentage."""
        if self.item_count == 0:
            return 0
        return int((self.completed_count / self.item_count) * 100)

    def update_counts(self):
        """Recalculate item counts from child items.

        Should be called via service layer when items are added/removed/completed.
        Also updates parent project counts if this list belongs to one.
        """
        from django.db.models import Count, Q

        stats = self.items.filter(is_deleted=False).aggregate(
            total=Count("id"), completed=Count("id", filter=Q(status="completed"))
        )

        self.item_count = stats["total"] or 0
        self.completed_count = stats["completed"] or 0
        self.save(update_fields=["item_count", "completed_count", "updated_at"])

        # Update parent project if exists
        if self.project:
            self.project.update_counts()

    def get_or_create_default_lane(self):
        """Get or create the default 'Backlog' lane for kanban view.

        Returns:
            KanbanLane: The default backlog lane

        """
        return self.kanban_lanes.get_or_create(name="Backlog", defaults={"display_order": 0, "is_default": True})[0]


class KanbanLaneQuerySet(SoftDeleteQuerySet):
    """Custom queryset for KanbanLane model."""

    def for_list(self, todo_list):
        """Get lanes for a specific list."""
        return self.filter(todo_list=todo_list)


class KanbanLaneManager(SoftDeleteManager):
    """Custom manager for KanbanLane model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return KanbanLaneQuerySet(self.model, using=self._db).active().select_related("todo_list")


class KanbanLane(SoftDeleteModel):
    """A kanban lane (column) within a todo list's kanban view.

    Design Decisions:
    - Each list can have multiple custom lanes
    - One lane is marked as default (Backlog)
    - Lanes have ordering for left-to-right display
    - Items reference lanes via FK for O(1) lane assignment
    """

    todo_list = models.ForeignKey("TodoList", on_delete=models.CASCADE, related_name="kanban_lanes", db_index=True)
    name = models.CharField(max_length=100, help_text='Lane name (e.g., "In Progress", "Done")')
    color = models.CharField(
        max_length=7,
        default="#6B7280",  # Tailwind gray-500
        help_text="Hex color code for lane header",
    )

    is_default = models.BooleanField(default=False, help_text='Default lane (usually "Backlog")')

    # User-controlled ordering (left to right)
    display_order = models.PositiveIntegerField(
        default=0, db_index=True, help_text="Order for displaying lanes left-to-right"
    )

    objects = KanbanLaneManager()

    class Meta:
        ordering = ["display_order", "created_at"]
        indexes = [
            models.Index(fields=["todo_list", "is_deleted", "display_order"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["todo_list", "name"], condition=models.Q(is_deleted=False), name="unique_lane_name_per_list"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.todo_list.name})"

    @property
    def item_count(self):
        """Count items in this lane (non-deleted only)."""
        return self.items.filter(is_deleted=False).count()


class TodoItemQuerySet(SoftDeleteQuerySet):
    """Custom queryset for TodoItem model."""

    def completed(self):
        """Get completed items."""
        return self.filter(status="completed")

    def pending(self):
        """Get pending items."""
        return self.filter(status="pending")

    def in_list(self, todo_list):
        """Get items for a specific list."""
        return self.filter(todo_list=todo_list)

    def in_lane(self, lane):
        """Get items in a specific kanban lane."""
        return self.filter(kanban_lane=lane)

    def recently_completed(self, minutes=5):
        """Get items completed within the last N minutes (for undo functionality).

        Args:
            minutes: Number of minutes to look back (default: 5)

        """
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(minutes=minutes)
        return self.filter(status="completed", completed_at__gte=cutoff)


class TodoItemManager(SoftDeleteManager):
    """Custom manager for TodoItem model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return (
            TodoItemQuerySet(self.model, using=self._db)
            .active()
            .select_related("todo_list", "kanban_lane", "todo_list__project")
        )

    def for_user(self, user):
        """Get all items for a specific user (across all lists)."""
        return self.filter(todo_list__owner=user)


class TodoItem(SoftDeleteModel):
    """An individual todo item within a list.

    Design Decisions:
    - Status field for completed/pending (extensible for future states)
    - Kanban lane FK (nullable - only used in kanban view)
    - completed_at timestamp for undo functionality
    - display_order for user-controlled ordering within list/lane
    - due_date optional for time-sensitive tasks
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        # Future: ARCHIVED, IN_PROGRESS, etc.

    todo_list = models.ForeignKey("TodoList", on_delete=models.CASCADE, related_name="items", db_index=True)
    kanban_lane = models.ForeignKey(
        "KanbanLane",
        on_delete=models.SET_NULL,
        related_name="items",
        null=True,
        blank=True,
        help_text="Lane assignment for kanban view (null for list view)",
    )

    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    # Completion tracking (for undo functionality)
    completed_at = models.DateTimeField(
        null=True, blank=True, db_index=True, help_text="Timestamp when item was marked complete"
    )

    # Optional due date
    due_date = models.DateTimeField(
        null=True, blank=True, db_index=True, help_text="Optional due date for time-sensitive tasks"
    )

    # User-controlled ordering (within list or lane)
    display_order = models.PositiveIntegerField(default=0, db_index=True, help_text="Order within list or kanban lane")

    # Priority (for future sorting)
    priority = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0)], help_text="Priority level (0=normal, higher=more important)"
    )

    objects = TodoItemManager()

    class Meta:
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(fields=["todo_list", "is_deleted", "status"]),
            models.Index(fields=["kanban_lane", "is_deleted", "display_order"]),
            models.Index(fields=["todo_list", "status", "display_order"]),
            models.Index(fields=["completed_at"]),  # For undo queries
            models.Index(fields=["due_date"]),  # For due date filtering
        ]

    def __str__(self):
        return f"{self.title[:50]} ({self.status})"

    def complete(self):
        """Mark item as completed.

        Updates status, sets completed_at, and triggers list/project count updates.
        """
        if self.status != self.Status.COMPLETED:
            self.status = self.Status.COMPLETED
            self.completed_at = timezone.now()
            self.save()
            self.todo_list.update_counts()

    def uncomplete(self):
        """Mark item as pending (undo completion).

        Resets status and completed_at, triggers list/project count updates.
        """
        if self.status == self.Status.COMPLETED:
            self.status = self.Status.PENDING
            self.completed_at = None
            self.save()
            self.todo_list.update_counts()

    def move_to_lane(self, lane):
        """Move item to a different kanban lane.

        Args:
            lane: KanbanLane instance or None (to remove from lanes)

        Raises:
            ValueError: If lane doesn't belong to the same list

        """
        if lane and lane.todo_list_id != self.todo_list_id:
            raise ValueError("Lane must belong to the same todo list")

        self.kanban_lane = lane
        self.save()

    @property
    def is_overdue(self):
        """Check if item is overdue (has due_date in the past and not completed)."""
        if not self.due_date or self.status == self.Status.COMPLETED:
            return False
        return self.due_date < timezone.now()
