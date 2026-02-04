"""Django admin configuration for Vehicle Maintenance Tracker."""

from django.contrib import admin

from .models import Note, Reminder, ServiceRecord, ServiceRecordAttachment, ServiceType, Shop, Vehicle


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    """Admin for ServiceType model."""

    list_display = ["name", "is_custom", "user", "display_order", "is_deleted"]
    list_filter = ["is_custom", "is_deleted"]
    search_fields = ["name", "description"]
    ordering = ["display_order", "name"]


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    """Admin for Shop model."""

    list_display = ["name", "owner", "address", "phone", "has_google_maps_link", "is_deleted"]
    list_filter = ["is_deleted"]
    search_fields = ["name", "address", "owner__email"]
    ordering = ["name"]
    raw_id_fields = ["owner"]


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    """Admin for Vehicle model."""

    list_display = [
        "display_name",
        "year",
        "make",
        "model",
        "owner",
        "current_odometer",
        "is_archived",
        "is_deleted",
    ]
    list_filter = ["is_archived", "is_deleted", "make"]
    search_fields = ["name", "make", "model", "vin", "owner__email"]
    ordering = ["-created_at"]
    raw_id_fields = ["owner"]
    readonly_fields = ["created_at", "updated_at", "odometer_updated_at"]

    fieldsets = (
        (None, {"fields": ("owner", "name", "year", "make", "model")}),
        ("Details", {"fields": ("vin", "license_plate", "engine", "trim")}),
        ("Odometer", {"fields": ("current_odometer", "odometer_updated_at")}),
        ("Media", {"fields": ("photo_url",)}),
        ("Status", {"fields": ("is_archived", "display_order")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


class ServiceRecordAttachmentInline(admin.TabularInline):
    """Inline admin for service record attachments."""

    model = ServiceRecordAttachment
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(ServiceRecord)
class ServiceRecordAdmin(admin.ModelAdmin):
    """Admin for ServiceRecord model."""

    list_display = [
        "service_type",
        "vehicle",
        "date",
        "odometer",
        "total_cost",
        "location_display",
        "is_deleted",
    ]
    list_filter = ["service_type", "is_deleted", "date"]
    search_fields = ["vehicle__name", "vehicle__make", "vehicle__model", "notes"]
    ordering = ["-date"]
    raw_id_fields = ["vehicle", "service_type", "shop"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [ServiceRecordAttachmentInline]

    fieldsets = (
        (None, {"fields": ("vehicle", "service_type", "shop")}),
        ("Service Details", {"fields": ("date", "odometer")}),
        ("Costs", {"fields": ("parts_cost", "labor_cost")}),
        ("Notes", {"fields": ("notes",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """Admin for Reminder model."""

    list_display = [
        "service_type",
        "vehicle",
        "mileage_interval",
        "time_interval_months",
        "next_due_date",
        "next_due_odometer",
        "status",
        "is_deleted",
    ]
    list_filter = ["service_type", "is_deleted", "is_manufacturer_recommended"]
    search_fields = ["vehicle__name", "vehicle__make", "vehicle__model"]
    ordering = ["next_due_date"]
    raw_id_fields = ["vehicle", "service_type"]
    readonly_fields = ["created_at", "updated_at", "next_due_date", "next_due_odometer"]

    fieldsets = (
        (None, {"fields": ("vehicle", "service_type")}),
        ("Intervals", {"fields": ("mileage_interval", "time_interval_months")}),
        (
            "Last Completion",
            {"fields": ("last_completed_date", "last_completed_odometer")},
        ),
        (
            "Next Due (Calculated)",
            {"fields": ("next_due_date", "next_due_odometer")},
        ),
        ("Options", {"fields": ("notes", "is_manufacturer_recommended")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin for Note model."""

    list_display = ["__str__", "vehicle", "odometer", "created_at", "is_deleted"]
    list_filter = ["is_deleted"]
    search_fields = ["content", "vehicle__name", "vehicle__make", "vehicle__model"]
    ordering = ["-created_at"]
    raw_id_fields = ["vehicle"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("vehicle",)}),
        ("Content", {"fields": ("content", "odometer", "image_url")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
