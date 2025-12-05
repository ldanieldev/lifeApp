"""Pytest fixtures for todo API tests.

Provides shared fixtures for:
- API clients (authenticated and unauthenticated)
- Test users (owner and other user for permission tests)
- Test data (projects, lists, items, lanes)
- JWT authentication helpers
"""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from users.factories import UserFactory

from todos.factories import (
    BacklogLaneFactory,
    CompletedTodoItemFactory,
    KanbanLaneFactory,
    KanbanTodoItemFactory,
    OverdueTodoItemFactory,
    ProjectFactory,
    StandaloneTodoListFactory,
    TodoItemFactory,
    TodoListFactory,
)
from todos.models import TodoList

# ============================================================================
# API Client Fixtures
# ============================================================================


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user():
    """Create a test user."""
    return UserFactory(email="testuser@example.com", password="TestPass123!")


@pytest.fixture
def other_user():
    """Create another test user for permission tests."""
    return UserFactory(email="otheruser@example.com", password="TestPass123!")


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an API client authenticated with session (django-allauth headless)."""
    # Force login using DRF's force_authenticate
    api_client.force_authenticate(user=user)
    api_client.user = user  # Attach user for reference in tests

    return api_client


@pytest.fixture
def other_authenticated_client(api_client, other_user):
    """Return an API client authenticated as other_user."""
    # Force login using DRF's force_authenticate
    api_client.force_authenticate(user=other_user)
    api_client.user = other_user

    return api_client


# ============================================================================
# Project Fixtures
# ============================================================================


@pytest.fixture
def project(user):
    """Create a project owned by user."""
    return ProjectFactory(
        owner=user,
        name="Test Project",
        description="Test project description",
        color="#3B82F6",
        is_archived=False,
        display_order=0,
    )


@pytest.fixture
def archived_project(user):
    """Create an archived project."""
    return ProjectFactory(
        owner=user,
        name="Archived Project",
        is_archived=True,
    )


@pytest.fixture
def other_users_project(other_user):
    """Create a project owned by other_user."""
    return ProjectFactory(
        owner=other_user,
        name="Other User's Project",
    )


# ============================================================================
# TodoList Fixtures
# ============================================================================


@pytest.fixture
def todo_list(user, project):
    """Create a list in list view mode."""
    return TodoListFactory(
        owner=user,
        project=project,
        name="Test List",
        description="Test list description",
        view_mode=TodoList.ViewMode.LIST,
        display_order=0,
    )


@pytest.fixture
def standalone_list(user):
    """Create a standalone list (no project)."""
    return StandaloneTodoListFactory(
        owner=user,
        name="Standalone List",
        view_mode=TodoList.ViewMode.LIST,
    )


@pytest.fixture
def kanban_list(user, project):
    """Create a list in kanban view mode with default lane."""
    todo_list = TodoListFactory(
        owner=user,
        project=project,
        name="Kanban Board",
        view_mode=TodoList.ViewMode.KANBAN,
    )
    # Create default backlog lane
    BacklogLaneFactory(todo_list=todo_list)
    return todo_list


@pytest.fixture
def other_users_list(other_user):
    """Create a list owned by other_user."""
    return TodoListFactory(
        owner=other_user,
        name="Other User's List",
    )


# ============================================================================
# TodoItem Fixtures
# ============================================================================


@pytest.fixture
def todo_item(todo_list):
    """Create a pending todo item."""
    return TodoItemFactory(
        todo_list=todo_list,
        title="Test Todo Item",
        description="Test item description",
        status="pending",
        priority=0,
        display_order=0,
    )


@pytest.fixture
def completed_item(todo_list):
    """Create a completed todo item."""
    return CompletedTodoItemFactory(
        todo_list=todo_list,
        title="Completed Item",
    )


@pytest.fixture
def overdue_item(todo_list):
    """Create an overdue todo item."""
    return OverdueTodoItemFactory(
        todo_list=todo_list,
        title="Overdue Item",
    )


@pytest.fixture
def high_priority_item(todo_list):
    """Create a high priority todo item."""
    return TodoItemFactory(
        todo_list=todo_list,
        title="High Priority Item",
        priority=3,
        due_date=timezone.now() + timedelta(days=2),
    )


@pytest.fixture
def other_users_item(other_users_list):
    """Create an item owned by other_user."""
    return TodoItemFactory(
        todo_list=other_users_list,
        title="Other User's Item",
    )


# ============================================================================
# KanbanLane Fixtures
# ============================================================================


@pytest.fixture
def kanban_lane(kanban_list):
    """Create a kanban lane."""
    return KanbanLaneFactory(
        todo_list=kanban_list,
        name="In Progress",
        color="#3B82F6",
        display_order=1,
    )


@pytest.fixture
def done_lane(kanban_list):
    """Create a 'Done' lane."""
    return KanbanLaneFactory(
        todo_list=kanban_list,
        name="Done",
        color="#10B981",
        display_order=2,
    )


@pytest.fixture
def kanban_item(kanban_list, kanban_lane):
    """Create an item in a kanban lane."""
    return KanbanTodoItemFactory(
        todo_list=kanban_list,
        kanban_lane=kanban_lane,
        title="Kanban Item",
    )


# ============================================================================
# Bulk Data Fixtures
# ============================================================================


@pytest.fixture
def multiple_projects(user):
    """Create multiple projects for pagination tests."""
    return ProjectFactory.create_batch(5, owner=user)


@pytest.fixture
def multiple_items(todo_list):
    """Create multiple items for bulk operations."""
    return TodoItemFactory.create_batch(5, todo_list=todo_list)


@pytest.fixture
def mixed_status_items(todo_list):
    """Create items with mixed statuses."""
    pending_items = TodoItemFactory.create_batch(3, todo_list=todo_list, status="pending")
    completed_items = CompletedTodoItemFactory.create_batch(2, todo_list=todo_list)
    return {"pending": pending_items, "completed": completed_items}


# ============================================================================
# Helper Fixtures
# ============================================================================


@pytest.fixture
def recently_completed_item(todo_list):
    """Create an item completed within the last minute."""
    item = CompletedTodoItemFactory(todo_list=todo_list)
    # Ensure completed_at is very recent (within last minute)
    item.completed_at = timezone.now() - timedelta(seconds=30)
    item.save()
    return item


@pytest.fixture
def old_completed_item(todo_list):
    """Create an item completed 10 minutes ago."""
    item = CompletedTodoItemFactory(todo_list=todo_list)
    item.completed_at = timezone.now() - timedelta(minutes=10)
    item.save()
    return item
