"""URL configuration for the todos app.

Provides RESTful routes for all todo models with nested routes.
"""

from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import (
    KanbanLaneViewSet,
    ListItemViewSet,
    ProjectListViewSet,
    ProjectViewSet,
    TodoItemViewSet,
    TodoListViewSet,
)

# Main router for top-level resources
router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"lists", TodoListViewSet, basename="todolist")
router.register(r"items", TodoItemViewSet, basename="todoitem")
router.register(r"lanes", KanbanLaneViewSet, basename="kanbanlane")

# Nested router for project/{id}/lists/
projects_router = routers.NestedDefaultRouter(router, r"projects", lookup="project")
projects_router.register(r"lists", ProjectListViewSet, basename="project-lists")

# Nested router for lists/{id}/items/
lists_router = routers.NestedDefaultRouter(router, r"lists", lookup="list")
lists_router.register(r"items", ListItemViewSet, basename="list-items")

# Combine all URL patterns
urlpatterns = router.urls + projects_router.urls + lists_router.urls
