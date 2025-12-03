"""Serializers for the todos app.

Provides nested serializers with read/write variants for projects, lists, lanes, and items.
"""

from rest_framework import serializers

from .models import KanbanLane, Project, TodoItem, TodoList

# ============================================================================
# Project Serializers
# ============================================================================


class ProjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for project list views.

    Includes denormalized counts for dashboard display.
    """

    completion_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "color",
            "item_count",
            "completed_count",
            "completion_percentage",
            "is_archived",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["item_count", "completed_count", "created_at", "updated_at"]


class ProjectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for project detail view.

    Includes nested lists with their item counts.
    """

    completion_percentage = serializers.IntegerField(read_only=True)
    lists = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "color",
            "item_count",
            "completed_count",
            "completion_percentage",
            "is_archived",
            "display_order",
            "lists",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["item_count", "completed_count", "created_at", "updated_at"]

    def get_lists(self, obj):
        """Get lists for this project (active only)."""
        from .models import TodoList

        lists = TodoList.objects.filter(project=obj, is_deleted=False).order_by("display_order")
        return TodoListNestedSerializer(lists, many=True).data


class ProjectWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating projects.

    Write-only serializer that excludes computed fields.
    """

    class Meta:
        model = Project
        fields = [
            "name",
            "description",
            "color",
            "is_archived",
            "display_order",
        ]

    def validate_color(self, value):
        """Validate color is a valid hex code."""
        import re

        if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
            raise serializers.ValidationError("Color must be a valid hex code (e.g., #3B82F6)")
        return value

    def create(self, validated_data):
        """Create project with owner from request context."""
        user = self.context["request"].user
        validated_data["owner"] = user
        return super().create(validated_data)


# ============================================================================
# TodoList Serializers
# ============================================================================


class TodoListNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for lists within project views.

    Lightweight with only essential fields.
    """

    completion_percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = TodoList
        fields = [
            "id",
            "name",
            "description",
            "view_mode",
            "item_count",
            "completed_count",
            "completion_percentage",
            "display_order",
        ]
        read_only_fields = ["item_count", "completed_count"]


class TodoListListSerializer(serializers.ModelSerializer):
    """Serializer for todo list list views.

    Includes project information if list belongs to one.
    """

    completion_percentage = serializers.IntegerField(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(source="project", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = TodoList
        fields = [
            "id",
            "name",
            "description",
            "view_mode",
            "project_id",
            "project_name",
            "item_count",
            "completed_count",
            "completion_percentage",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["item_count", "completed_count", "created_at", "updated_at"]


class TodoListDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for todo list detail view.

    Includes nested items for list view OR lanes for kanban view.
    """

    completion_percentage = serializers.IntegerField(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(source="project", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    items = serializers.SerializerMethodField()
    kanban_lanes = serializers.SerializerMethodField()

    class Meta:
        model = TodoList
        fields = [
            "id",
            "name",
            "description",
            "view_mode",
            "project_id",
            "project_name",
            "item_count",
            "completed_count",
            "completion_percentage",
            "display_order",
            "items",
            "kanban_lanes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["item_count", "completed_count", "created_at", "updated_at"]

    def get_items(self, obj):
        """Get items for list view (only if not in kanban mode)."""
        if obj.view_mode == TodoList.ViewMode.KANBAN:
            return None

        items = obj.items.filter(is_deleted=False).order_by("display_order")
        return TodoItemListSerializer(items, many=True).data

    def get_kanban_lanes(self, obj):
        """Get lanes with items for kanban view (only if in kanban mode)."""
        if obj.view_mode == TodoList.ViewMode.LIST:
            return None

        lanes = obj.kanban_lanes.filter(is_deleted=False).order_by("display_order")
        return KanbanLaneWithItemsSerializer(lanes, many=True).data


class TodoListWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating todo lists.

    Allows optional project assignment.
    """

    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        source="project",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TodoList
        fields = [
            "name",
            "description",
            "view_mode",
            "project_id",
            "display_order",
        ]

    def validate_project_id(self, value):
        """Validate user owns the project."""
        if value and value.owner != self.context["request"].user:
            raise serializers.ValidationError("You do not have permission to add lists to this project.")
        return value

    def create(self, validated_data):
        """Create list with owner from request context."""
        user = self.context["request"].user
        validated_data["owner"] = user
        list_instance = super().create(validated_data)

        # If kanban mode, create default lane
        if list_instance.view_mode == TodoList.ViewMode.KANBAN:
            list_instance.get_or_create_default_lane()

        return list_instance


# ============================================================================
# KanbanLane Serializers
# ============================================================================


class KanbanLaneListSerializer(serializers.ModelSerializer):
    """Serializer for kanban lane list/detail views.

    Includes item count but not items.
    """

    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = KanbanLane
        fields = [
            "id",
            "name",
            "color",
            "is_default",
            "display_order",
            "item_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["item_count", "created_at", "updated_at"]


class KanbanLaneWithItemsSerializer(serializers.ModelSerializer):
    """Serializer for kanban lane with nested items.

    Used in kanban board view.
    """

    items = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = KanbanLane
        fields = [
            "id",
            "name",
            "color",
            "is_default",
            "display_order",
            "item_count",
            "items",
        ]
        read_only_fields = ["item_count"]

    def get_items(self, obj):
        """Get items in this lane."""
        items = obj.items.filter(is_deleted=False).order_by("display_order")
        return TodoItemListSerializer(items, many=True).data


class KanbanLaneWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating kanban lanes.

    Requires todo_list for creation.
    """

    class Meta:
        model = KanbanLane
        fields = [
            "name",
            "color",
            "display_order",
        ]

    def validate_color(self, value):
        """Validate color is a valid hex code."""
        import re

        if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
            raise serializers.ValidationError("Color must be a valid hex code (e.g., #6B7280)")
        return value

    def validate_name(self, value):
        """Ensure lane name is unique within the list."""
        todo_list = self.context.get("todo_list")
        if not todo_list:
            return value

        # Check for existing lane with same name (excluding current instance if updating)
        existing = KanbanLane.objects.filter(
            todo_list=todo_list,
            name=value,
            is_deleted=False,
        )

        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError("A lane with this name already exists in this list.")

        return value


# ============================================================================
# TodoItem Serializers
# ============================================================================


class TodoItemListSerializer(serializers.ModelSerializer):
    """Serializer for todo item list views.

    Includes essential fields for display.
    """

    is_overdue = serializers.BooleanField(read_only=True)
    kanban_lane_id = serializers.PrimaryKeyRelatedField(source="kanban_lane", read_only=True)
    kanban_lane_name = serializers.CharField(source="kanban_lane.name", read_only=True)

    class Meta:
        model = TodoItem
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "is_overdue",
            "completed_at",
            "display_order",
            "kanban_lane_id",
            "kanban_lane_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["completed_at", "is_overdue", "created_at", "updated_at"]


class TodoItemDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for todo item detail view.

    Includes all fields and related list/project information.
    """

    is_overdue = serializers.BooleanField(read_only=True)
    todo_list_id = serializers.PrimaryKeyRelatedField(source="todo_list", read_only=True)
    todo_list_name = serializers.CharField(source="todo_list.name", read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(source="todo_list.project", read_only=True)
    project_name = serializers.CharField(source="todo_list.project.name", read_only=True)
    kanban_lane_id = serializers.PrimaryKeyRelatedField(source="kanban_lane", read_only=True)
    kanban_lane_name = serializers.CharField(source="kanban_lane.name", read_only=True)

    class Meta:
        model = TodoItem
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "is_overdue",
            "completed_at",
            "display_order",
            "todo_list_id",
            "todo_list_name",
            "project_id",
            "project_name",
            "kanban_lane_id",
            "kanban_lane_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["completed_at", "is_overdue", "created_at", "updated_at"]


class TodoItemWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating todo items.

    Allows optional kanban lane assignment.
    """

    todo_list_id = serializers.PrimaryKeyRelatedField(
        queryset=TodoList.objects.all(),
        source="todo_list",
        required=True,
    )
    kanban_lane_id = serializers.PrimaryKeyRelatedField(
        queryset=KanbanLane.objects.all(),
        source="kanban_lane",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TodoItem
        fields = [
            "title",
            "description",
            "priority",
            "due_date",
            "display_order",
            "todo_list_id",
            "kanban_lane_id",
        ]

    def validate_todo_list_id(self, value):
        """Validate user owns the list."""
        if value.owner != self.context["request"].user:
            raise serializers.ValidationError("You do not have permission to add items to this list.")
        return value

    def validate_kanban_lane_id(self, value):
        """Validate lane belongs to the same list."""
        if not value:
            return value

        todo_list = self.initial_data.get("todo_list_id")
        if todo_list and value.todo_list_id != int(todo_list):
            raise serializers.ValidationError("Lane must belong to the same list as the item.")

        return value

    def validate(self, attrs):
        """Cross-field validation."""
        todo_list = attrs.get("todo_list")
        kanban_lane = attrs.get("kanban_lane")

        # If list is in kanban mode, require a lane
        if todo_list and todo_list.view_mode == TodoList.ViewMode.KANBAN and not kanban_lane:
            # Auto-assign to default lane
            attrs["kanban_lane"] = todo_list.get_or_create_default_lane()

        # If list is in list mode, clear any lane assignment
        if todo_list and todo_list.view_mode == TodoList.ViewMode.LIST:
            attrs["kanban_lane"] = None

        return attrs


# ============================================================================
# Bulk Operation Serializers
# ============================================================================


class BulkCompleteSerializer(serializers.Serializer):
    """Serializer for bulk complete operation.

    Accepts list of item IDs to mark as complete.
    """

    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )

    def validate_item_ids(self, value):
        """Validate all items exist and user owns them."""
        user = self.context["request"].user
        items = TodoItem.objects.filter(id__in=value, is_deleted=False)

        # Check all items exist
        if items.count() != len(value):
            raise serializers.ValidationError("Some items do not exist.")

        # Check ownership
        for item in items:
            if item.todo_list.owner != user:
                raise serializers.ValidationError(f"You do not have permission to modify item {item.id}.")

        return value


class BulkDeleteSerializer(serializers.Serializer):
    """Serializer for bulk delete (soft delete) operation.

    Accepts list of item IDs to move to trash.
    """

    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )

    def validate_item_ids(self, value):
        """Validate all items exist and user owns them."""
        user = self.context["request"].user
        items = TodoItem.objects.filter(id__in=value, is_deleted=False)

        # Check all items exist
        if items.count() != len(value):
            raise serializers.ValidationError("Some items do not exist.")

        # Check ownership
        for item in items:
            if item.todo_list.owner != user:
                raise serializers.ValidationError(f"You do not have permission to delete item {item.id}.")

        return value


class ReorderSerializer(serializers.Serializer):
    """Serializer for reordering items.

    Accepts list of item IDs in desired order.
    """

    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )

    def validate_item_ids(self, value):
        """Validate all items exist and belong to same list/lane."""
        user = self.context["request"].user
        items = TodoItem.objects.filter(id__in=value, is_deleted=False)

        # Check all items exist
        if items.count() != len(value):
            raise serializers.ValidationError("Some items do not exist.")

        # Check ownership and same list
        todo_list = None
        kanban_lane = None
        for item in items:
            if item.todo_list.owner != user:
                raise serializers.ValidationError(f"You do not have permission to reorder item {item.id}.")

            if todo_list is None:
                todo_list = item.todo_list
                kanban_lane = item.kanban_lane
            else:
                if item.todo_list != todo_list:
                    raise serializers.ValidationError("All items must belong to the same list.")
                if item.kanban_lane != kanban_lane:
                    raise serializers.ValidationError(
                        "All items must belong to the same lane (or all be in list view)."
                    )

        return value


class MoveLaneSerializer(serializers.Serializer):
    """Serializer for moving items between kanban lanes.

    Accepts item ID and target lane ID.
    """

    kanban_lane_id = serializers.PrimaryKeyRelatedField(
        queryset=KanbanLane.objects.all(),
        required=True,
    )
    display_order = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    def validate_kanban_lane_id(self, value):
        """Validate lane belongs to a kanban-mode list."""
        if value.todo_list.view_mode != TodoList.ViewMode.KANBAN:
            raise serializers.ValidationError("Target lane must belong to a kanban-mode list.")
        return value
