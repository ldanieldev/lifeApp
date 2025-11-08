"""URL configuration for the authentication app.

Custom authentication endpoints will be defined here.
"""

from django.urls import path

from .views import CurrentUserView, UserProvidersView

app_name = "authentication"

urlpatterns = [
    path("user", CurrentUserView.as_view(), name="current_user"),
    path("user/providers", UserProvidersView.as_view(), name="user_providers"),
]
