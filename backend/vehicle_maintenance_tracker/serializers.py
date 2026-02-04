"""Serializers for Vehicle Maintenance Tracker API.

Design Pattern:
- List serializers: Lightweight, for list views
- Detail serializers: Include nested data for detail views
- Write serializers: For create/update operations with validation
"""

from decimal import Decimal

from rest_framework import serializers

from .models import Note, Reminder, ServiceRecord, ServiceRecordAttachment, ServiceType, Shop, Vehicle
from .utils import get_public_presigned_url

# =============================================================================
# Service Type Serializers
# =============================================================================


class ServiceTypeSerializer(serializers.ModelSerializer):
    """Serializer for ServiceType model (read operations)."""

    class Meta:
        model = ServiceType
        fields = [
            "id",
            "name",
            "description",
            "is_custom",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_custom", "created_at", "updated_at"]


class ServiceTypeWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating custom service types."""

    class Meta:
        model = ServiceType
        fields = ["name", "description", "display_order"]

    def validate_name(self, value):
        """Ensure name is unique for the user."""
        user = self.context["request"].user
        queryset = ServiceType.objects.filter(user=user, name=value, is_deleted=False)

        # Exclude current instance if updating
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("You already have a service type with this name.")
        return value

    def create(self, validated_data):
        """Create a custom service type for the current user."""
        user = self.context["request"].user
        validated_data["user"] = user
        validated_data["is_custom"] = True
        return super().create(validated_data)


# =============================================================================
# Shop Serializers
# =============================================================================


class ShopListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for shop list views."""

    google_maps_url = serializers.CharField(read_only=True)

    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "google_place_id",
            "google_maps_url",
            "display_order",
        ]


class ShopDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for shop detail views."""

    google_maps_url = serializers.CharField(read_only=True)
    has_google_maps_link = serializers.BooleanField(read_only=True)
    service_record_count = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "google_place_id",
            "google_maps_url",
            "has_google_maps_link",
            "display_order",
            "service_record_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_service_record_count(self, obj):
        """Count service records for this shop."""
        return obj.service_records.filter(is_deleted=False).count()


class ShopWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating shops."""

    class Meta:
        model = Shop
        fields = ["name", "address", "phone", "google_place_id", "display_order"]

    def validate_name(self, value):
        """Ensure name is unique for the user."""
        user = self.context["request"].user
        queryset = Shop.objects.filter(owner=user, name=value, is_deleted=False)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("You already have a shop with this name.")
        return value

    def create(self, validated_data):
        """Create a shop for the current user."""
        user = self.context["request"].user
        validated_data["owner"] = user
        return super().create(validated_data)


# =============================================================================
# Vehicle Serializers
# =============================================================================


class VehicleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vehicle list views."""

    display_name = serializers.CharField(read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "name",
            "year",
            "make",
            "model",
            "display_name",
            "current_odometer",
            "photo_url",
            "is_archived",
            "display_order",
        ]

    def get_photo_url(self, obj):
        """Generate presigned URL for photo."""
        if obj.photo_url:
            return get_public_presigned_url(obj.photo_url)
        return ""


class VehicleDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for vehicle detail views."""

    display_name = serializers.CharField(read_only=True)
    full_description = serializers.CharField(read_only=True)
    photo_url = serializers.SerializerMethodField()
    upcoming_reminders = serializers.SerializerMethodField()
    recent_service = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "name",
            "year",
            "make",
            "model",
            "vin",
            "license_plate",
            "engine",
            "trim",
            "current_odometer",
            "odometer_updated_at",
            "photo_url",
            "is_archived",
            "display_order",
            "display_name",
            "full_description",
            "upcoming_reminders",
            "recent_service",
            "total_spent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "odometer_updated_at"]

    def get_photo_url(self, obj):
        """Generate presigned URL for photo."""
        if obj.photo_url:
            return get_public_presigned_url(obj.photo_url)
        return ""

    def get_upcoming_reminders(self, obj):
        """Get the next 3 upcoming/due reminders."""
        reminders = obj.reminders.filter(is_deleted=False).order_by("next_due_date", "next_due_odometer")[:3]
        return ReminderListSerializer(reminders, many=True).data

    def get_recent_service(self, obj):
        """Get the most recent service record."""
        record = obj.service_records.filter(is_deleted=False).order_by("-date").first()
        if record:
            return ServiceRecordListSerializer(record).data
        return None

    def get_total_spent(self, obj):
        """Calculate total spent on this vehicle."""
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        result = obj.service_records.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum("parts_cost"), Decimal("0.00")) + Coalesce(Sum("labor_cost"), Decimal("0.00"))
        )
        return str(result["total"] or Decimal("0.00"))


class VehicleWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating vehicles."""

    class Meta:
        model = Vehicle
        fields = [
            "name",
            "year",
            "make",
            "model",
            "vin",
            "license_plate",
            "engine",
            "trim",
            "current_odometer",
            "photo_url",
            "is_archived",
            "display_order",
        ]

    def validate_year(self, value):
        """Validate year is reasonable."""
        import datetime

        current_year = datetime.date.today().year
        if value < 1900 or value > current_year + 2:
            raise serializers.ValidationError(f"Year must be between 1900 and {current_year + 2}.")
        return value

    def validate_vin(self, value):
        """Validate VIN format if provided."""
        if value and len(value) != 17:
            raise serializers.ValidationError("VIN must be exactly 17 characters.")
        return value.upper() if value else value

    def create(self, validated_data):
        """Create a vehicle for the current user."""
        user = self.context["request"].user
        validated_data["owner"] = user
        return super().create(validated_data)


class VehicleOdometerUpdateSerializer(serializers.Serializer):
    """Serializer for updating vehicle odometer."""

    odometer = serializers.IntegerField(min_value=0)

    def validate_odometer(self, value):
        """Validate odometer is not less than current reading."""
        vehicle = self.context.get("vehicle")
        if vehicle and value < vehicle.current_odometer:
            raise serializers.ValidationError(
                f"Odometer reading cannot be less than current reading ({vehicle.current_odometer})."
            )
        return value


# =============================================================================
# Service Record Attachment Serializers
# =============================================================================


class ServiceRecordAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for service record attachments."""

    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRecordAttachment
        fields = [
            "id",
            "file_url",
            "file_name",
            "file_size",
            "content_type",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_file_url(self, obj):
        """Generate presigned URL for attachment."""
        if obj.file_url:
            return get_public_presigned_url(obj.file_url)
        return ""


class ServiceRecordAttachmentWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating attachments."""

    class Meta:
        model = ServiceRecordAttachment
        fields = ["file_url", "file_name", "file_size", "content_type"]


# =============================================================================
# Service Record Serializers
# =============================================================================


class ServiceRecordListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for service record list views."""

    service_type_name = serializers.CharField(source="service_type.name", read_only=True)
    location_display = serializers.CharField(read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_diy = serializers.BooleanField(read_only=True)
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRecord
        fields = [
            "id",
            "date",
            "odometer",
            "service_type",
            "service_type_name",
            "parts_cost",
            "labor_cost",
            "total_cost",
            "shop",
            "location_display",
            "is_diy",
            "attachment_count",
        ]

    def get_attachment_count(self, obj):
        """Get the count of attachments for this service record."""
        return obj.attachments.count()


class ServiceRecordDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for service record detail views."""

    service_type = ServiceTypeSerializer(read_only=True)
    shop = ShopListSerializer(read_only=True)
    attachments = ServiceRecordAttachmentSerializer(many=True, read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_diy = serializers.BooleanField(read_only=True)
    location_display = serializers.CharField(read_only=True)
    vehicle_display = serializers.CharField(source="vehicle.display_name", read_only=True)

    class Meta:
        model = ServiceRecord
        fields = [
            "id",
            "vehicle",
            "vehicle_display",
            "date",
            "odometer",
            "service_type",
            "parts_cost",
            "labor_cost",
            "total_cost",
            "shop",
            "is_diy",
            "location_display",
            "notes",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ServiceRecordWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating service records."""

    class Meta:
        model = ServiceRecord
        fields = [
            "vehicle",
            "service_type",
            "shop",
            "date",
            "odometer",
            "parts_cost",
            "labor_cost",
            "notes",
        ]

    def validate_vehicle(self, value):
        """Ensure user owns the vehicle."""
        user = self.context["request"].user
        if value.owner != user:
            raise serializers.ValidationError("You do not own this vehicle.")
        return value

    def validate_shop(self, value):
        """Ensure user owns the shop if provided."""
        if value:
            user = self.context["request"].user
            if value.owner != user:
                raise serializers.ValidationError("You do not own this shop.")
        return value

    def validate_service_type(self, value):
        """Ensure service type is available to user."""
        user = self.context["request"].user
        if value.is_custom and value.user != user:
            raise serializers.ValidationError("This service type is not available to you.")
        return value


# =============================================================================
# Reminder Serializers
# =============================================================================


class ReminderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for reminder list views."""

    service_type_name = serializers.CharField(source="service_type.name", read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Reminder
        fields = [
            "id",
            "service_type",
            "service_type_name",
            "mileage_interval",
            "time_interval_months",
            "next_due_date",
            "next_due_odometer",
            "status",
        ]


class ReminderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for reminder detail views."""

    service_type = ServiceTypeSerializer(read_only=True)
    status = serializers.CharField(read_only=True)
    vehicle_display = serializers.CharField(source="vehicle.display_name", read_only=True)

    class Meta:
        model = Reminder
        fields = [
            "id",
            "vehicle",
            "vehicle_display",
            "service_type",
            "mileage_interval",
            "time_interval_months",
            "last_completed_date",
            "last_completed_odometer",
            "next_due_date",
            "next_due_odometer",
            "status",
            "notes",
            "is_manufacturer_recommended",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "next_due_date", "next_due_odometer"]


class ReminderWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating reminders."""

    class Meta:
        model = Reminder
        fields = [
            "vehicle",
            "service_type",
            "mileage_interval",
            "time_interval_months",
            "last_completed_date",
            "last_completed_odometer",
            "notes",
        ]

    def validate_vehicle(self, value):
        """Ensure user owns the vehicle."""
        user = self.context["request"].user
        if value.owner != user:
            raise serializers.ValidationError("You do not own this vehicle.")
        return value

    def validate_service_type(self, value):
        """Ensure service type is available to user."""
        user = self.context["request"].user
        if value.is_custom and value.user != user:
            raise serializers.ValidationError("This service type is not available to you.")
        return value

    def validate(self, data):
        """Ensure at least one interval is set."""
        mileage = data.get("mileage_interval")
        time = data.get("time_interval_months")

        if not mileage and not time:
            raise serializers.ValidationError("At least one of mileage_interval or time_interval_months is required.")
        return data

    def create(self, validated_data):
        """Create reminder and calculate next due."""
        reminder = super().create(validated_data)
        reminder.calculate_next_due()
        return reminder

    def update(self, instance, validated_data):
        """Update reminder and recalculate next due."""
        reminder = super().update(instance, validated_data)
        reminder.calculate_next_due()
        return reminder


# =============================================================================
# Note Serializers
# =============================================================================


class NoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for note list views."""

    content_preview = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            "id",
            "content_preview",
            "odometer",
            "image_url",
            "created_at",
        ]

    def get_content_preview(self, obj):
        """Get first 100 characters of content."""
        if len(obj.content) > 100:
            return obj.content[:100] + "..."
        return obj.content

    def get_image_url(self, obj):
        """Generate presigned URL for image."""
        if obj.image_url:
            return get_public_presigned_url(obj.image_url)
        return ""


class NoteDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for note detail views."""

    vehicle_display = serializers.CharField(source="vehicle.display_name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            "id",
            "vehicle",
            "vehicle_display",
            "content",
            "odometer",
            "image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_image_url(self, obj):
        """Generate presigned URL for image."""
        if obj.image_url:
            return get_public_presigned_url(obj.image_url)
        return ""


class NoteWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating notes."""

    class Meta:
        model = Note
        fields = ["vehicle", "content", "odometer", "image_url"]

    def validate_vehicle(self, value):
        """Ensure user owns the vehicle."""
        user = self.context["request"].user
        if value.owner != user:
            raise serializers.ValidationError("You do not own this vehicle.")
        return value


# =============================================================================
# Dashboard Serializer
# =============================================================================


class VehicleDashboardSerializer(serializers.Serializer):
    """Serializer for vehicle dashboard data."""

    vehicle = VehicleDetailSerializer()
    overdue_reminders = ReminderListSerializer(many=True)
    upcoming_reminders = ReminderListSerializer(many=True)
    recent_services = ServiceRecordListSerializer(many=True)
    monthly_costs = serializers.ListField(child=serializers.DictField())
    yearly_costs = serializers.ListField(child=serializers.DictField())
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2)
