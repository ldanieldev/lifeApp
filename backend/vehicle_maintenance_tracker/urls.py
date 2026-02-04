"""URL configuration for Vehicle Maintenance Tracker API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import (
    NoteViewSet,
    ReminderViewSet,
    ServiceRecordAttachmentViewSet,
    ServiceRecordViewSet,
    ServiceTypeViewSet,
    ShopViewSet,
    VehicleViewSet,
)

# Main router
router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"service-records", ServiceRecordViewSet, basename="service-record")
router.register(r"service-types", ServiceTypeViewSet, basename="service-type")
router.register(r"shops", ShopViewSet, basename="shop")
router.register(r"reminders", ReminderViewSet, basename="reminder")
router.register(r"notes", NoteViewSet, basename="note")

# Nested router for service record attachments
service_records_router = routers.NestedDefaultRouter(router, r"service-records", lookup="service_record")
service_records_router.register(r"attachments", ServiceRecordAttachmentViewSet, basename="service-record-attachment")

app_name = "vehicle_maintenance_tracker"

urlpatterns = [
    path("", include(router.urls)),
    path("", include(service_records_router.urls)),
]
