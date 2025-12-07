"""URL configuration for the notifications app."""

from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("preferences/", views.NotificationPreferenceView.as_view(), name="preferences"),
    path("push/subscribe/", views.PushSubscriptionView.as_view(), name="push-subscribe"),
    path("push/vapid-key/", views.VapidPublicKeyView.as_view(), name="vapid-key"),
    path("history/", views.NotificationLogListView.as_view(), name="history"),
]
