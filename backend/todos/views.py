"""API views for the todos app.

Provides ViewSets for all models with custom actions for specialized operations.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import KanbanLaneFilter, ProjectFilter, TodoItemFilter, TodoListFilter
from .models import KanbanLane, Project, TodoItem, TodoList
from .permissions import IsListOwner, IsOwner, IsProjectOwner
from .serializers import (
    BulkCompleteSerializer,
    BulkDeleteSerializer,
    KanbanLaneListSerializer,
    KanbanLaneWithItemsSerializer,
    KanbanLaneWriteSerializer,
    MoveLaneSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectWriteSerializer,
    ReorderSerializer,
    TodoItemDetailSerializer,
    TodoItemListSerializer,
    TodoItemWriteSerializer,
    TodoListDetailSerializer,
    TodoListListSerializer,
    TodoListWriteSerializer,
)
from .services import TodoService


@extend_schema_view(
    list=extend_schema(
        summary="List all projects",
        description="Get all projects for the authenticated user. Excludes deleted projects.",
        parameters=[
            OpenApiParameter(name="is_archived", type=bool, description="Filter by archived status"),
            OpenApiParameter(name="search", type=str, description="Search in name and description"),
            OpenApiParameter(
                name="ordering", type=str, description="Order by field (e.g., 'display_order', '-created_at')"
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Get project details",
        description="Get a single project with nested lists.",
    ),
    create=extend_schema(
        summary="Create a project",
        description="Create a new project for the authenticated user.",
    ),
    update=extend_schema(
        summary="Update a project",
        description="Update an existing project.",
    ),
    partial_update=extend_schema(
        summary="Partially update a project",
        description="Update specific fields of an existing project.",
    ),
    destroy=extend_schema(
        summary="Delete a project",
        description="Soft delete a project and all its lists/items. Can be restored later.",
    ),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for Project model.

    Provides CRUD operations and custom actions for projects.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = ProjectFilter
    ordering_fields = ["display_order", "created_at", "updated_at", "name"]
    ordering = ["display_order", "-created_at"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        """Get projects for current user.

        By default, excludes archived projects for list action unless explicitly filtered.
        """
        queryset = Project.objects.filter(owner=self.request.user)

        # Only apply default filter for list action (not for retrieve, update, archive, etc.)
        if self.action == "list" and "is_archived" not in self.request.query_params:
            queryset = queryset.filter(is_archived=False)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ProjectListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ProjectWriteSerializer
        return ProjectDetailSerializer

    def perform_destroy(self, instance):
        """Soft delete project and all child resources."""
        TodoService.delete_project_with_lists(instance)

    @extend_schema(
        summary="Archive a project",
        description="Archive a project (hide but don't delete).",
        request=None,
        responses={200: ProjectDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive a project."""
        project = self.get_object()
        TodoService.archive_project(project, archived=True)
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @extend_schema(
        summary="Unarchive a project",
        description="Restore an archived project.",
        request=None,
        responses={200: ProjectDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        """Unarchive a project."""
        project = self.get_object()
        TodoService.archive_project(project, archived=False)
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @extend_schema(
        summary="Restore a deleted project",
        description="Restore a soft-deleted project (lists/items remain deleted).",
        request=None,
        responses={200: ProjectDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Restore a soft-deleted project."""
        # Get project including deleted ones
        project = Project.all_objects.filter(
            pk=pk,
            owner=request.user,
            is_deleted=True,
        ).first()

        if not project:
            return Response(
                {"error": "not_found", "message": "Deleted project not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        TodoService.restore_project(project)
        serializer = self.get_serializer(project)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary="List all todo lists",
        description="Get all todo lists for the authenticated user.",
        parameters=[
            OpenApiParameter(name="view_mode", type=str, description="Filter by view mode (list/kanban)"),
            OpenApiParameter(name="project", type=int, description="Filter by project ID"),
            OpenApiParameter(name="standalone", type=bool, description="Filter lists without a project"),
            OpenApiParameter(name="search", type=str, description="Search in name and description"),
        ],
    ),
    retrieve=extend_schema(
        summary="Get todo list details",
        description="Get a single todo list with items (list view) or lanes (kanban view).",
    ),
    create=extend_schema(
        summary="Create a todo list",
        description="Create a new todo list, optionally within a project.",
    ),
    update=extend_schema(
        summary="Update a todo list",
        description="Update an existing todo list.",
    ),
    partial_update=extend_schema(
        summary="Partially update a todo list",
        description="Update specific fields of an existing todo list.",
    ),
    destroy=extend_schema(
        summary="Delete a todo list",
        description="Soft delete a todo list and all its items. Can be restored later.",
    ),
)
class TodoListViewSet(viewsets.ModelViewSet):
    """ViewSet for TodoList model.

    Provides CRUD operations and custom actions for todo lists.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = TodoListFilter
    ordering_fields = ["display_order", "created_at", "updated_at", "name"]
    ordering = ["display_order", "-created_at"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        """Get lists for current user."""
        return TodoList.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return TodoListListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TodoListWriteSerializer
        return TodoListDetailSerializer

    def perform_destroy(self, instance):
        """Soft delete list and all items."""
        TodoService.delete_list_with_items(instance)

    @extend_schema(
        summary="Switch view mode",
        description="Switch list between list and kanban view modes.",
        request={"application/json": {"example": {"view_mode": "kanban"}}},
        responses={200: TodoListDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def switch_view(self, request, pk=None):
        """Switch between list and kanban view modes."""
        todo_list = self.get_object()
        new_mode = request.data.get("view_mode")

        if not new_mode:
            return Response(
                {"error": "validation_error", "message": "view_mode is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            TodoService.switch_list_view_mode(todo_list, new_mode)
            serializer = self.get_serializer(todo_list)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {"error": "validation_error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        summary="Restore a deleted list",
        description="Restore a soft-deleted list (items remain deleted).",
        request=None,
        responses={200: TodoListDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Restore a soft-deleted list."""
        # Get list including deleted ones
        todo_list = TodoList.all_objects.filter(
            pk=pk,
            owner=request.user,
            is_deleted=True,
        ).first()

        if not todo_list:
            return Response(
                {"error": "not_found", "message": "Deleted list not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            TodoService.restore_list(todo_list)
            serializer = self.get_serializer(todo_list)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {"error": "validation_error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema_view(
    list=extend_schema(
        summary="List all todo items",
        description="Get all todo items for the authenticated user across all lists.",
        parameters=[
            OpenApiParameter(name="status", type=str, description="Filter by status (pending/completed)"),
            OpenApiParameter(name="priority", type=int, description="Filter by exact priority"),
            OpenApiParameter(name="priority_gte", type=int, description="Filter by minimum priority"),
            OpenApiParameter(name="is_overdue", type=bool, description="Filter overdue items"),
            OpenApiParameter(name="todo_list", type=int, description="Filter by list ID"),
            OpenApiParameter(name="project", type=int, description="Filter by project ID"),
            OpenApiParameter(name="kanban_lane", type=int, description="Filter by kanban lane ID"),
            OpenApiParameter(
                name="recently_completed", type=bool, description="Filter recently completed (last 5 min)"
            ),
            OpenApiParameter(name="search", type=str, description="Search in title and description"),
        ],
    ),
    retrieve=extend_schema(
        summary="Get todo item details",
        description="Get a single todo item with all details.",
    ),
    create=extend_schema(
        summary="Create a todo item",
        description="Create a new todo item in a list.",
    ),
    update=extend_schema(
        summary="Update a todo item",
        description="Update an existing todo item.",
    ),
    partial_update=extend_schema(
        summary="Partially update a todo item",
        description="Update specific fields of an existing todo item.",
    ),
    destroy=extend_schema(
        summary="Delete a todo item",
        description="Soft delete a todo item. Can be restored later.",
    ),
)
class TodoItemViewSet(viewsets.ModelViewSet):
    """ViewSet for TodoItem model.

    Provides CRUD operations and custom actions for todo items.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = TodoItemFilter
    ordering_fields = ["display_order", "created_at", "updated_at", "due_date", "priority", "completed_at"]
    ordering = ["display_order", "-created_at"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        """Get items for current user."""
        return TodoItem.objects.filter(todo_list__owner=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return TodoItemListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TodoItemWriteSerializer
        return TodoItemDetailSerializer

    def perform_destroy(self, instance):
        """Soft delete item."""
        instance.delete()
        # Update list counts after deletion
        instance.todo_list.update_counts()

    @extend_schema(
        summary="Complete a todo item",
        description="Mark a todo item as completed.",
        request=None,
        responses={200: TodoItemDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark item as completed."""
        item = self.get_object()
        TodoService.complete_item(item)
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @extend_schema(
        summary="Uncomplete a todo item",
        description="Mark a completed item as pending (undo completion).",
        request=None,
        responses={200: TodoItemDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def uncomplete(self, request, pk=None):
        """Mark item as pending (undo completion)."""
        item = self.get_object()
        TodoService.uncomplete_item(item)
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @extend_schema(
        summary="Move item to kanban lane",
        description="Move a todo item to a different kanban lane.",
        request=MoveLaneSerializer,
        responses={200: TodoItemDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def move_lane(self, request, pk=None):
        """Move item to a different kanban lane."""
        item = self.get_object()
        serializer = MoveLaneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lane = serializer.validated_data["kanban_lane_id"]
        display_order = serializer.validated_data.get("display_order")

        try:
            TodoService.move_item_to_lane(item, lane, display_order)
            response_serializer = self.get_serializer(item)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response(
                {"error": "validation_error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        summary="Restore a deleted item",
        description="Restore a soft-deleted item.",
        request=None,
        responses={200: TodoItemDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Restore a soft-deleted item."""
        # Get item including deleted ones
        item = TodoItem.all_objects.filter(
            pk=pk,
            todo_list__owner=request.user,
            is_deleted=True,
        ).first()

        if not item:
            return Response(
                {"error": "not_found", "message": "Deleted item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            TodoService.restore_item(item)
            serializer = self.get_serializer(item)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {"error": "validation_error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        summary="Bulk complete items",
        description="Mark multiple items as completed.",
        request=BulkCompleteSerializer,
        responses={200: {"type": "object", "properties": {"count": {"type": "integer"}}}},
    )
    @action(detail=False, methods=["post"])
    def bulk_complete(self, request):
        """Bulk complete multiple items."""
        serializer = BulkCompleteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        item_ids = serializer.validated_data["item_ids"]
        count = TodoService.bulk_complete_items(item_ids)

        return Response({"count": count, "message": f"{count} items marked as completed."})

    @extend_schema(
        summary="Bulk delete items",
        description="Soft delete multiple items.",
        request=BulkDeleteSerializer,
        responses={200: {"type": "object", "properties": {"count": {"type": "integer"}}}},
    )
    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        """Bulk delete multiple items."""
        serializer = BulkDeleteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        item_ids = serializer.validated_data["item_ids"]
        count = TodoService.bulk_delete_items(item_ids)

        return Response({"count": count, "message": f"{count} items deleted."})

    @extend_schema(
        summary="Reorder items",
        description="Reorder items by providing new sequence of IDs.",
        request=ReorderSerializer,
        responses={200: {"type": "object", "properties": {"count": {"type": "integer"}}}},
    )
    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Reorder items based on provided ID sequence."""
        serializer = ReorderSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        item_ids = serializer.validated_data["item_ids"]
        updated_items = TodoService.reorder_items(item_ids)

        return Response(
            {
                "count": len(updated_items),
                "message": f"{len(updated_items)} items reordered.",
            }
        )


@extend_schema_view(
    list=extend_schema(
        summary="List kanban lanes",
        description="Get all kanban lanes for a specific todo list.",
        parameters=[
            OpenApiParameter(name="todo_list", type=int, description="Filter by list ID"),
            OpenApiParameter(name="is_default", type=bool, description="Filter default lane"),
        ],
    ),
    retrieve=extend_schema(
        summary="Get kanban lane details",
        description="Get a single kanban lane with items.",
    ),
    create=extend_schema(
        summary="Create a kanban lane",
        description="Create a new kanban lane in a list.",
    ),
    update=extend_schema(
        summary="Update a kanban lane",
        description="Update an existing kanban lane.",
    ),
    partial_update=extend_schema(
        summary="Partially update a kanban lane",
        description="Update specific fields of an existing kanban lane.",
    ),
    destroy=extend_schema(
        summary="Delete a kanban lane",
        description="Soft delete a kanban lane. Items in the lane are NOT deleted.",
    ),
)
class KanbanLaneViewSet(viewsets.ModelViewSet):
    """ViewSet for KanbanLane model.

    Provides CRUD operations for kanban lanes.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = KanbanLaneFilter
    ordering_fields = ["display_order", "created_at", "name"]
    ordering = ["display_order", "created_at"]

    def get_queryset(self):
        """Get lanes for current user's lists."""
        return KanbanLane.objects.filter(todo_list__owner=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "retrieve":
            return KanbanLaneWithItemsSerializer
        if self.action in ["create", "update", "partial_update"]:
            return KanbanLaneWriteSerializer
        return KanbanLaneListSerializer

    def get_serializer_context(self):
        """Add todo_list to context for validation."""
        context = super().get_serializer_context()

        # Get todo_list from request data (for create/update)
        if self.action in ["create"]:
            todo_list_id = self.request.data.get("todo_list_id")
            if todo_list_id:
                try:
                    todo_list = TodoList.objects.get(
                        pk=todo_list_id,
                        owner=self.request.user,
                        is_deleted=False,
                    )
                    context["todo_list"] = todo_list
                except TodoList.DoesNotExist:
                    pass

        # For update actions, get from instance
        if self.action in ["update", "partial_update"] and hasattr(self, "get_object"):
            try:
                instance = self.get_object()
                context["todo_list"] = instance.todo_list
            except Exception:
                pass

        return context

    def perform_create(self, serializer):
        """Create lane with todo_list from request."""
        todo_list_id = self.request.data.get("todo_list_id")

        if not todo_list_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"todo_list_id": "This field is required."})

        try:
            todo_list = TodoList.objects.get(
                pk=todo_list_id,
                owner=self.request.user,
                is_deleted=False,
            )
        except TodoList.DoesNotExist:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"todo_list_id": "Invalid list ID."}) from None

        serializer.save(todo_list=todo_list)

    def perform_destroy(self, instance):
        """Soft delete lane (items are NOT deleted)."""
        instance.delete()


# ============================================================================
# Nested ViewSets (for project/{id}/lists/ etc.)
# ============================================================================


class ProjectListViewSet(viewsets.ModelViewSet):
    """Nested ViewSet for lists within a project.

    Endpoint: /api/todos/projects/{project_pk}/lists/
    """

    permission_classes = [IsAuthenticated, IsProjectOwner, IsOwner]
    serializer_class = TodoListListSerializer
    ordering_fields = ["display_order", "created_at", "name"]
    ordering = ["display_order", "-created_at"]

    def get_queryset(self):
        """Get lists for specific project."""
        project_pk = self.kwargs.get("project_pk")
        return TodoList.objects.filter(
            project_id=project_pk,
            owner=self.request.user,
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["create", "update", "partial_update"]:
            return TodoListWriteSerializer
        if self.action == "retrieve":
            return TodoListDetailSerializer
        return TodoListListSerializer

    def perform_create(self, serializer):
        """Create list in this project."""
        project_pk = self.kwargs.get("project_pk")
        try:
            project = Project.objects.get(pk=project_pk, owner=self.request.user)
            serializer.save(owner=self.request.user, project=project)
        except Project.DoesNotExist:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"project": "Invalid project ID."}) from None


class ListItemViewSet(viewsets.ModelViewSet):
    """Nested ViewSet for items within a list.

    Endpoint: /api/todos/lists/{list_pk}/items/
    """

    permission_classes = [IsAuthenticated, IsListOwner, IsOwner]
    serializer_class = TodoItemListSerializer
    filterset_class = TodoItemFilter
    ordering_fields = ["display_order", "created_at", "due_date", "priority"]
    ordering = ["display_order", "-created_at"]

    def get_queryset(self):
        """Get items for specific list."""
        list_pk = self.kwargs.get("list_pk")
        return TodoItem.objects.filter(
            todo_list_id=list_pk,
            todo_list__owner=self.request.user,
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["create", "update", "partial_update"]:
            return TodoItemWriteSerializer
        if self.action == "retrieve":
            return TodoItemDetailSerializer
        return TodoItemListSerializer

    def perform_create(self, serializer):
        """Create item in this list."""
        list_pk = self.kwargs.get("list_pk")
        try:
            todo_list = TodoList.objects.get(pk=list_pk, owner=self.request.user)

            # Override todo_list_id from URL
            validated_data = serializer.validated_data
            validated_data["todo_list"] = todo_list

            serializer.save()
        except TodoList.DoesNotExist:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"todo_list": "Invalid list ID."}) from None
