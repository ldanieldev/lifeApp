"""Custom permissions for the todos app.

Ensures users can only access and modify their own todo data.
"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Permission class that checks if user owns the object.

    Works with Project, TodoList, TodoItem models.
    """

    def has_object_permission(self, request, view, obj):
        """Check if user owns the object.

        For projects and lists, checks obj.owner directly.
        For items and lanes, checks obj.todo_list.owner.
        """
        # Import here to avoid circular imports
        from .models import KanbanLane, Project, TodoItem, TodoList

        if isinstance(obj, (Project, TodoList)):
            return obj.owner == request.user

        if isinstance(obj, TodoItem):
            return obj.todo_list.owner == request.user

        if isinstance(obj, KanbanLane):
            return obj.todo_list.owner == request.user

        return False


class IsListOwner(permissions.BasePermission):
    """Permission class for nested resources under TodoList.

    Checks if user owns the parent list (for lanes and items).
    """

    def has_permission(self, request, view):
        """Check if user owns the parent list.

        Expects 'list_pk' or 'todo_list_pk' in view kwargs.
        """
        from .models import TodoList

        # Get list PK from URL kwargs
        list_pk = view.kwargs.get("list_pk") or view.kwargs.get("todo_list_pk")

        if not list_pk:
            # No list context, defer to object-level permission
            return True

        # Check if list exists and user owns it
        try:
            todo_list = TodoList.objects.get(pk=list_pk, is_deleted=False)
            return todo_list.owner == request.user
        except TodoList.DoesNotExist:
            return False


class IsProjectOwner(permissions.BasePermission):
    """Permission class for nested resources under Project.

    Checks if user owns the parent project (for lists).
    """

    def has_permission(self, request, view):
        """Check if user owns the parent project.

        Expects 'project_pk' in view kwargs.
        """
        from .models import Project

        # Get project PK from URL kwargs
        project_pk = view.kwargs.get("project_pk")

        if not project_pk:
            # No project context, defer to object-level permission
            return True

        # Check if project exists and user owns it
        try:
            project = Project.objects.get(pk=project_pk, is_deleted=False)
            return project.owner == request.user
        except Project.DoesNotExist:
            return False
