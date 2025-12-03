"""Django admin interface for todo models.

Design decisions:
- Read-only fields for denormalized counts (updated via signals)
- Soft delete actions (restore deleted items)
- Inline editing for efficient bulk operations
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import KanbanLane, Project, TodoItem, TodoList


@admin.action(description="Restore selected items")
def restore_items(modeladmin, request, queryset):
    """Restore soft-deleted items."""
    for obj in queryset:
        if obj.is_deleted:
            obj.restore()


@admin.action(description="Recalculate counts")
def recalculate_counts(modeladmin, request, queryset):
    """Manually recalculate denormalized counts."""
    for obj in queryset:
        if hasattr(obj, "update_counts"):
            obj.update_counts()


class TodoListInline(admin.TabularInline):
    """Inline for editing lists within a project."""

    model = TodoList
    extra = 0
    fields = ("name", "view_mode", "item_count", "completed_count", "completion_percentage", "display_order")
    readonly_fields = ("item_count", "completed_count", "completion_percentage")
    show_change_link = True

    def completion_percentage(self, obj):
        """Display completion percentage."""
        if obj.item_count == 0:
            return "0%"
        percentage = int((obj.completed_count / obj.item_count) * 100)
        color = "green" if percentage == 100 else "orange" if percentage >= 50 else "red"
        return format_html('<span style="color: {}; font-weight: bold;">{:.0f}%</span>', color, percentage)

    completion_percentage.short_description = "% Complete"


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin interface for Project model."""

    list_display = (
        "name",
        "owner",
        "colored_name",
        "list_count",
        "item_count",
        "completed_count",
        "completion_percentage_display",
        "is_archived",
        "created_at",
    )
    list_filter = ("is_archived", "is_deleted", "created_at", "owner")
    search_fields = ("name", "description", "owner__email")
    readonly_fields = ("item_count", "completed_count", "completion_percentage_display", "created_at", "updated_at")
    fields = (
        "owner",
        "name",
        "description",
        "color",
        "is_archived",
        "display_order",
        ("item_count", "completed_count", "completion_percentage_display"),
        ("created_at", "updated_at"),
        "is_deleted",
    )
    inlines = [TodoListInline]
    actions = [restore_items, recalculate_counts]

    def colored_name(self, obj):
        """Display project name with its color."""
        return format_html('<span style="color: {}; font-weight: bold;">⬤</span> {}', obj.color, obj.name)

    colored_name.short_description = "Color"

    def list_count(self, obj):
        """Count of lists in project."""
        return obj.lists.filter(is_deleted=False).count()

    list_count.short_description = "Lists"

    def completion_percentage_display(self, obj):
        """Display completion percentage with color."""
        percentage = obj.completion_percentage
        color = "green" if percentage == 100 else "orange" if percentage >= 50 else "red"
        return format_html('<span style="color: {}; font-weight: bold;">{:.0f}%</span>', color, percentage)

    completion_percentage_display.short_description = "% Complete"


class TodoItemInline(admin.TabularInline):
    """Inline for editing items within a list."""

    model = TodoItem
    extra = 0
    fields = ("title", "status", "kanban_lane", "due_date", "display_order", "is_deleted")
    show_change_link = True


class KanbanLaneInline(admin.TabularInline):
    """Inline for editing kanban lanes within a list."""

    model = KanbanLane
    extra = 0
    fields = ("name", "color", "is_default", "display_order", "item_count_display")
    readonly_fields = ("item_count_display",)

    def item_count_display(self, obj):
        """Display item count in lane."""
        if obj.pk:
            count = obj.items.filter(is_deleted=False).count()
            return f"{count} items"
        return "0 items"

    item_count_display.short_description = "Items"


@admin.register(TodoList)
class TodoListAdmin(admin.ModelAdmin):
    """Admin interface for TodoList model."""

    list_display = (
        "name",
        "owner",
        "project",
        "view_mode",
        "item_count",
        "completed_count",
        "completion_percentage_display",
        "created_at",
    )
    list_filter = ("view_mode", "is_deleted", "created_at", "owner", "project")
    search_fields = ("name", "description", "owner__email", "project__name")
    readonly_fields = ("item_count", "completed_count", "completion_percentage_display", "created_at", "updated_at")
    fields = (
        "owner",
        "project",
        "name",
        "description",
        "view_mode",
        "display_order",
        ("item_count", "completed_count", "completion_percentage_display"),
        ("created_at", "updated_at"),
        "is_deleted",
    )
    inlines = [KanbanLaneInline, TodoItemInline]
    actions = [restore_items, recalculate_counts]

    def completion_percentage_display(self, obj):
        """Display completion percentage with color."""
        percentage = obj.completion_percentage
        color = "green" if percentage == 100 else "orange" if percentage >= 50 else "red"
        return format_html('<span style="color: {}; font-weight: bold;">{:.0f}%</span>', color, percentage)

    completion_percentage_display.short_description = "% Complete"


@admin.register(KanbanLane)
class KanbanLaneAdmin(admin.ModelAdmin):
    """Admin interface for KanbanLane model."""

    list_display = (
        "name",
        "todo_list",
        "colored_name",
        "is_default",
        "item_count_display",
        "display_order",
        "created_at",
    )
    list_filter = ("is_default", "is_deleted", "created_at", "todo_list")
    search_fields = ("name", "todo_list__name")
    fields = ("todo_list", "name", "color", "is_default", "display_order", ("created_at", "updated_at"), "is_deleted")
    actions = [restore_items]

    def colored_name(self, obj):
        """Display lane name with its color."""
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            obj.color,
            obj.name,
        )

    colored_name.short_description = "Color"

    def item_count_display(self, obj):
        """Display item count in lane."""
        count = obj.items.filter(is_deleted=False).count()
        return f"{count} items"

    item_count_display.short_description = "Items"


@admin.register(TodoItem)
class TodoItemAdmin(admin.ModelAdmin):
    """Admin interface for TodoItem model."""

    list_display = (
        "title_short",
        "todo_list",
        "status",
        "kanban_lane",
        "priority",
        "due_date",
        "is_overdue_display",
        "completed_at",
        "created_at",
    )
    list_filter = ("status", "is_deleted", "priority", "created_at", "due_date", "todo_list")
    search_fields = ("title", "description", "todo_list__name")
    fields = (
        "todo_list",
        "kanban_lane",
        "title",
        "description",
        "status",
        "priority",
        "due_date",
        "display_order",
        "completed_at",
        ("created_at", "updated_at"),
        "is_deleted",
    )
    readonly_fields = ("completed_at", "created_at", "updated_at")
    actions = [restore_items, "mark_complete", "mark_pending"]

    def title_short(self, obj):
        """Display truncated title."""
        if len(obj.title) > 50:
            return f"{obj.title[:50]}..."
        return obj.title

    title_short.short_description = "Title"

    def is_overdue_display(self, obj):
        """Display overdue status with color."""
        if obj.is_overdue:
            return format_html('<span style="color: red; font-weight: bold;">⚠ OVERDUE</span>')
        return "—"

    is_overdue_display.short_description = "Overdue?"

    @admin.action(description="Mark as complete")
    def mark_complete(self, request, queryset):
        """Mark selected items as complete."""
        for item in queryset:
            item.complete()

    @admin.action(description="Mark as pending")
    def mark_pending(self, request, queryset):
        """Mark selected items as pending (undo)."""
        for item in queryset:
            item.uncomplete()
