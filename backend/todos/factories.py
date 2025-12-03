"""Factory Boy factories for todo models.

Use these factories in tests to create realistic test data.
"""

import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from .models import KanbanLane, Project, TodoItem, TodoList


class ProjectFactory(DjangoModelFactory):
    """Factory for creating Project instances."""

    class Meta:
        model = Project

    owner = factory.SubFactory("users.factories.UserFactory")
    name = factory.Sequence(lambda n: f"Project {n}")
    description = factory.Faker("paragraph")
    color = factory.Faker("hex_color")
    is_archived = False
    display_order = factory.Sequence(lambda n: n)


class TodoListFactory(DjangoModelFactory):
    """Factory for creating TodoList instances."""

    class Meta:
        model = TodoList

    owner = factory.SubFactory("users.factories.UserFactory")
    project = factory.SubFactory(ProjectFactory)
    name = factory.Sequence(lambda n: f"List {n}")
    description = factory.Faker("sentence")
    view_mode = TodoList.ViewMode.LIST
    display_order = factory.Sequence(lambda n: n)


class StandaloneTodoListFactory(TodoListFactory):
    """Factory for creating TodoList instances without a project."""

    project = None


class KanbanLaneFactory(DjangoModelFactory):
    """Factory for creating KanbanLane instances."""

    class Meta:
        model = KanbanLane

    todo_list = factory.SubFactory(TodoListFactory, view_mode=TodoList.ViewMode.KANBAN)
    name = factory.Sequence(lambda n: f"Lane {n}")
    color = factory.Faker("hex_color")
    is_default = False
    display_order = factory.Sequence(lambda n: n)


class BacklogLaneFactory(KanbanLaneFactory):
    """Factory for creating the default Backlog lane."""

    name = "Backlog"
    is_default = True
    display_order = 0
    color = "#6B7280"


class TodoItemFactory(DjangoModelFactory):
    """Factory for creating TodoItem instances."""

    class Meta:
        model = TodoItem

    todo_list = factory.SubFactory(TodoListFactory)
    title = factory.Faker("sentence", nb_words=6)
    description = factory.Faker("paragraph")
    status = TodoItem.Status.PENDING
    display_order = factory.Sequence(lambda n: n)
    priority = 0


class CompletedTodoItemFactory(TodoItemFactory):
    """Factory for creating completed TodoItem instances."""

    status = TodoItem.Status.COMPLETED
    completed_at = factory.LazyFunction(timezone.now)


class KanbanTodoItemFactory(TodoItemFactory):
    """Factory for creating TodoItem instances in kanban view."""

    todo_list = factory.SubFactory(TodoListFactory, view_mode=TodoList.ViewMode.KANBAN)
    kanban_lane = factory.SubFactory(KanbanLaneFactory, todo_list=factory.SelfAttribute("..todo_list"))


class OverdueTodoItemFactory(TodoItemFactory):
    """Factory for creating overdue TodoItem instances."""

    status = TodoItem.Status.PENDING
    due_date = factory.LazyFunction(lambda: timezone.now() - timezone.timedelta(days=1))
