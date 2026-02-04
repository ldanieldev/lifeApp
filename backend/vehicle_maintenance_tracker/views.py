"""ViewSets for Vehicle Maintenance Tracker API.

All ViewSets use session-based authentication via django-allauth.
User ownership is enforced at the queryset level.
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Sum
from django.db.models.functions import Coalesce, TruncMonth, TruncYear
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Note, Reminder, ServiceRecord, ServiceRecordAttachment, ServiceType, Shop, Vehicle
from .permissions import IsOwner, IsOwnerOrSystemServiceType
from .serializers import (
    NoteDetailSerializer,
    NoteListSerializer,
    NoteWriteSerializer,
    ReminderDetailSerializer,
    ReminderListSerializer,
    ReminderWriteSerializer,
    ServiceRecordAttachmentSerializer,
    ServiceRecordAttachmentWriteSerializer,
    ServiceRecordDetailSerializer,
    ServiceRecordListSerializer,
    ServiceRecordWriteSerializer,
    ServiceTypeSerializer,
    ServiceTypeWriteSerializer,
    ShopDetailSerializer,
    ShopListSerializer,
    ShopWriteSerializer,
    VehicleDashboardSerializer,
    VehicleDetailSerializer,
    VehicleListSerializer,
    VehicleOdometerUpdateSerializer,
    VehicleWriteSerializer,
)

# =============================================================================
# Service Type ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(summary="List service types", description="Get all service types (system + user's custom)"),
    retrieve=extend_schema(summary="Get service type", description="Get a specific service type"),
    create=extend_schema(summary="Create custom service type", description="Create a new custom service type"),
    update=extend_schema(summary="Update service type", description="Update a custom service type"),
    partial_update=extend_schema(summary="Partial update service type"),
    destroy=extend_schema(summary="Delete service type", description="Soft delete a custom service type"),
)
class ServiceTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for ServiceType model.

    Users can view all system service types and their own custom types.
    Users can only create, update, and delete their own custom types.
    """

    permission_classes = [IsAuthenticated, IsOwnerOrSystemServiceType]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["display_order", "name", "created_at"]
    ordering = ["display_order", "name"]

    def get_queryset(self):
        """Return system types and user's custom types."""
        return ServiceType.objects.for_user(self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ["create", "update", "partial_update"]:
            return ServiceTypeWriteSerializer
        return ServiceTypeSerializer


# =============================================================================
# Shop ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(summary="List shops", description="Get all user's shops"),
    retrieve=extend_schema(summary="Get shop", description="Get a specific shop"),
    create=extend_schema(summary="Create shop", description="Create a new shop"),
    update=extend_schema(summary="Update shop", description="Update a shop"),
    partial_update=extend_schema(summary="Partial update shop"),
    destroy=extend_schema(summary="Delete shop", description="Soft delete a shop"),
)
class ShopViewSet(viewsets.ModelViewSet):
    """ViewSet for Shop model.

    Shops are shared across all of a user's vehicles.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "address"]
    ordering_fields = ["display_order", "name", "created_at"]
    ordering = ["display_order", "name"]

    def get_queryset(self):
        """Return only user's shops."""
        return Shop.objects.for_user(self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ShopListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ShopWriteSerializer
        return ShopDetailSerializer


# =============================================================================
# Vehicle ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(
        summary="List vehicles",
        description="Get all user's vehicles",
        parameters=[
            OpenApiParameter(name="is_archived", type=bool, description="Filter by archived status"),
        ],
    ),
    retrieve=extend_schema(summary="Get vehicle", description="Get a specific vehicle with details"),
    create=extend_schema(summary="Create vehicle", description="Create a new vehicle"),
    update=extend_schema(summary="Update vehicle", description="Update a vehicle"),
    partial_update=extend_schema(summary="Partial update vehicle"),
    destroy=extend_schema(summary="Delete vehicle", description="Soft delete a vehicle"),
)
class VehicleViewSet(viewsets.ModelViewSet):
    """ViewSet for Vehicle model."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "make", "model", "vin"]
    ordering_fields = ["display_order", "year", "make", "model", "created_at"]
    ordering = ["display_order", "-created_at"]
    filterset_fields = ["is_archived"]

    def get_queryset(self):
        """Return only user's vehicles."""
        return Vehicle.objects.for_user(self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return VehicleListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return VehicleWriteSerializer
        if self.action == "update_odometer":
            return VehicleOdometerUpdateSerializer
        if self.action == "dashboard":
            return VehicleDashboardSerializer
        return VehicleDetailSerializer

    @extend_schema(
        summary="Update odometer",
        description="Update the vehicle's current odometer reading",
        request=VehicleOdometerUpdateSerializer,
        responses={200: VehicleDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def update_odometer(self, request, pk=None):
        """Update the vehicle's odometer reading."""
        vehicle = self.get_object()
        serializer = VehicleOdometerUpdateSerializer(data=request.data, context={"vehicle": vehicle})
        serializer.is_valid(raise_exception=True)

        vehicle.update_odometer(serializer.validated_data["odometer"])
        return Response(VehicleDetailSerializer(vehicle).data)

    @extend_schema(
        summary="Archive vehicle",
        description="Archive a vehicle (hide from main list)",
        responses={200: VehicleDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive a vehicle."""
        vehicle = self.get_object()
        vehicle.is_archived = True
        vehicle.save(update_fields=["is_archived", "updated_at"])
        return Response(VehicleDetailSerializer(vehicle).data)

    @extend_schema(
        summary="Unarchive vehicle",
        description="Unarchive a vehicle (show in main list)",
        responses={200: VehicleDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        """Unarchive a vehicle."""
        vehicle = self.get_object()
        vehicle.is_archived = False
        vehicle.save(update_fields=["is_archived", "updated_at"])
        return Response(VehicleDetailSerializer(vehicle).data)

    @extend_schema(
        summary="Get vehicle dashboard",
        description="Get dashboard data for a vehicle including reminders, costs, and recent services",
        responses={200: VehicleDashboardSerializer},
    )
    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        """Get dashboard data for a vehicle."""
        vehicle = self.get_object()

        # Get reminders
        overdue_reminders = vehicle.reminders.filter(is_deleted=False).order_by("next_due_date")
        overdue_list = [r for r in overdue_reminders if r.status == Reminder.Status.OVERDUE]
        upcoming_list = [r for r in overdue_reminders if r.status != Reminder.Status.OVERDUE][:5]

        # Get recent services
        recent_services = vehicle.service_records.filter(is_deleted=False).order_by("-date")[:5]

        # Calculate monthly costs (last 12 months)
        monthly_costs = (
            vehicle.service_records.filter(is_deleted=False)
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Coalesce(Sum("parts_cost"), Decimal("0.00")) + Coalesce(Sum("labor_cost"), Decimal("0.00")))
            .order_by("-month")[:12]
        )

        # Calculate yearly costs
        yearly_costs = (
            vehicle.service_records.filter(is_deleted=False)
            .annotate(year=TruncYear("date"))
            .values("year")
            .annotate(total=Coalesce(Sum("parts_cost"), Decimal("0.00")) + Coalesce(Sum("labor_cost"), Decimal("0.00")))
            .order_by("-year")[:5]
        )

        # Total spent
        total_result = vehicle.service_records.filter(is_deleted=False).aggregate(
            total=Coalesce(Sum("parts_cost"), Decimal("0.00")) + Coalesce(Sum("labor_cost"), Decimal("0.00"))
        )

        data = {
            "vehicle": vehicle,
            "overdue_reminders": overdue_list,
            "upcoming_reminders": upcoming_list,
            "recent_services": recent_services,
            "monthly_costs": [
                {"month": item["month"].isoformat(), "total": str(item["total"])} for item in monthly_costs
            ],
            "yearly_costs": [{"year": item["year"].year, "total": str(item["total"])} for item in yearly_costs],
            "total_spent": total_result["total"] or Decimal("0.00"),
        }

        serializer = VehicleDashboardSerializer(data)
        return Response(serializer.data)

    @extend_schema(
        summary="Upload vehicle photo",
        description="Upload a photo for the vehicle",
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
                "required": ["file"],
            }
        },
        responses={200: VehicleDetailSerializer},
    )
    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def upload_photo(self, request, pk=None):
        """Upload a photo for the vehicle."""
        vehicle = self.get_object()

        # Check if file was provided
        if "file" not in request.FILES:
            return Response(
                {"error": "validation_error", "message": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES["file"]

        # Validate file type (images only)
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if uploaded_file.content_type not in allowed_types:
            return Response(
                {"error": "validation_error", "message": "Only image files are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024
        if uploaded_file.size > max_size:
            return Response(
                {"error": "validation_error", "message": "File size exceeds 10MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate unique filename
        file_ext = uploaded_file.name.split(".")[-1] if "." in uploaded_file.name else "jpg"
        unique_filename = f"vehicles/{vehicle.id}/{uuid.uuid4().hex}.{file_ext}"

        # Save file to storage (Garage S3)
        file_path = default_storage.save(unique_filename, uploaded_file)

        # Store the file path (presigned URLs are generated dynamically in serializers)
        vehicle.photo_url = file_path
        vehicle.save(update_fields=["photo_url", "updated_at"])

        return Response(VehicleDetailSerializer(vehicle).data)

    @extend_schema(
        summary="Delete vehicle photo",
        description="Remove the photo from a vehicle",
        responses={200: VehicleDetailSerializer},
    )
    @action(detail=True, methods=["delete"], url_path="photo")
    def delete_photo(self, request, pk=None):
        """Delete the vehicle's photo."""
        vehicle = self.get_object()
        vehicle.photo_url = ""
        vehicle.save(update_fields=["photo_url", "updated_at"])
        return Response(VehicleDetailSerializer(vehicle).data)


# =============================================================================
# Service Record ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(
        summary="List service records",
        description="Get all service records for user's vehicles",
        parameters=[
            OpenApiParameter(name="vehicle", type=int, description="Filter by vehicle ID"),
            OpenApiParameter(name="service_type", type=int, description="Filter by service type ID"),
        ],
    ),
    retrieve=extend_schema(summary="Get service record", description="Get a specific service record"),
    create=extend_schema(summary="Create service record", description="Create a new service record"),
    update=extend_schema(summary="Update service record", description="Update a service record"),
    partial_update=extend_schema(summary="Partial update service record"),
    destroy=extend_schema(summary="Delete service record", description="Soft delete a service record"),
)
class ServiceRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for ServiceRecord model."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["notes", "service_type__name", "shop__name"]
    ordering_fields = ["date", "odometer", "created_at"]
    ordering = ["-date", "-created_at"]
    filterset_fields = ["vehicle", "service_type", "shop"]

    def get_queryset(self):
        """Return only user's service records."""
        return ServiceRecord.objects.filter(vehicle__owner=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ServiceRecordListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ServiceRecordWriteSerializer
        return ServiceRecordDetailSerializer


# =============================================================================
# Service Record Attachment ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(summary="List attachments", description="Get all attachments for a service record"),
    retrieve=extend_schema(summary="Get attachment", description="Get a specific attachment"),
    create=extend_schema(summary="Create attachment", description="Add attachment to service record"),
    destroy=extend_schema(summary="Delete attachment", description="Remove attachment from service record"),
)
class ServiceRecordAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for ServiceRecordAttachment model.

    This is a nested viewset under service records.
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete"]  # No updates

    def get_queryset(self):
        """Return attachments for the specified service record."""
        service_record_id = self.kwargs.get("service_record_pk")
        return ServiceRecordAttachment.objects.filter(
            service_record_id=service_record_id,
            service_record__vehicle__owner=self.request.user,
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return ServiceRecordAttachmentWriteSerializer
        return ServiceRecordAttachmentSerializer

    def perform_create(self, serializer):
        """Create attachment linked to the service record."""
        service_record_id = self.kwargs.get("service_record_pk")

        # Verify user owns the service record
        try:
            service_record = ServiceRecord.objects.get(id=service_record_id, vehicle__owner=self.request.user)
        except ServiceRecord.DoesNotExist:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not have permission to add attachments to this service record.") from None

        serializer.save(service_record=service_record)

    @extend_schema(
        summary="Upload attachment file",
        description="Upload a file and create attachment for service record",
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
                "required": ["file"],
            }
        },
        responses={201: ServiceRecordAttachmentSerializer},
    )
    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request, service_record_pk=None):
        """Upload a file and create an attachment record."""
        service_record_id = service_record_pk

        # Verify user owns the service record
        try:
            service_record = ServiceRecord.objects.get(id=service_record_id, vehicle__owner=request.user)
        except ServiceRecord.DoesNotExist:
            return Response(
                {"error": "permission_denied", "message": "You do not have permission to add attachments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if file was provided
        if "file" not in request.FILES:
            return Response(
                {"error": "validation_error", "message": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES["file"]

        # Validate file size (20MB limit)
        max_size = getattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE", 20 * 1024 * 1024)
        if uploaded_file.size > max_size:
            return Response(
                {"error": "validation_error", "message": f"File size exceeds limit of {max_size // (1024 * 1024)}MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate unique filename to avoid collisions
        file_ext = uploaded_file.name.split(".")[-1] if "." in uploaded_file.name else ""
        unique_filename = f"attachments/{service_record_id}/{uuid.uuid4().hex}"
        if file_ext:
            unique_filename = f"{unique_filename}.{file_ext}"

        # Save file to storage (Garage S3)
        file_path = default_storage.save(unique_filename, uploaded_file)

        # Create attachment record (store file path, presigned URLs generated in serializers)
        attachment = ServiceRecordAttachment.objects.create(
            service_record=service_record,
            file_url=file_path,
            file_name=uploaded_file.name,
            file_size=uploaded_file.size,
            content_type=uploaded_file.content_type or "application/octet-stream",
        )

        serializer = ServiceRecordAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# =============================================================================
# Reminder ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(
        summary="List reminders",
        description="Get all reminders for user's vehicles",
        parameters=[
            OpenApiParameter(name="vehicle", type=int, description="Filter by vehicle ID"),
            OpenApiParameter(name="status", type=str, description="Filter by status (upcoming, due_soon, overdue)"),
        ],
    ),
    retrieve=extend_schema(summary="Get reminder", description="Get a specific reminder"),
    create=extend_schema(summary="Create reminder", description="Create a new reminder"),
    update=extend_schema(summary="Update reminder", description="Update a reminder"),
    partial_update=extend_schema(summary="Partial update reminder"),
    destroy=extend_schema(summary="Delete reminder", description="Soft delete a reminder"),
)
class ReminderViewSet(viewsets.ModelViewSet):
    """ViewSet for Reminder model."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["service_type__name", "notes"]
    ordering_fields = ["next_due_date", "next_due_odometer", "created_at"]
    ordering = ["next_due_date", "next_due_odometer"]
    filterset_fields = ["vehicle", "service_type"]

    def get_queryset(self):
        """Return only user's reminders, with optional status filtering."""
        queryset = Reminder.objects.filter(vehicle__owner=self.request.user)

        # Filter by status if provided
        status_filter = self.request.query_params.get("status")
        if status_filter:
            # We need to filter in Python since status is a property
            reminders = list(queryset)
            filtered = [r for r in reminders if r.status == status_filter]
            # Return queryset with matching IDs
            filtered_ids = [r.id for r in filtered]
            return queryset.filter(id__in=filtered_ids)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ReminderListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ReminderWriteSerializer
        return ReminderDetailSerializer

    @extend_schema(
        summary="Mark reminder complete",
        description="Mark a reminder as completed with current date/odometer",
        responses={200: ReminderDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark a reminder as completed."""
        reminder = self.get_object()
        date = timezone.now().date()
        odometer = reminder.vehicle.current_odometer

        reminder.mark_completed(date, odometer)
        return Response(ReminderDetailSerializer(reminder).data)


# =============================================================================
# Note ViewSet
# =============================================================================


@extend_schema_view(
    list=extend_schema(
        summary="List notes",
        description="Get all notes for user's vehicles",
        parameters=[
            OpenApiParameter(name="vehicle", type=int, description="Filter by vehicle ID"),
        ],
    ),
    retrieve=extend_schema(summary="Get note", description="Get a specific note"),
    create=extend_schema(summary="Create note", description="Create a new note"),
    update=extend_schema(summary="Update note", description="Update a note"),
    partial_update=extend_schema(summary="Partial update note"),
    destroy=extend_schema(summary="Delete note", description="Soft delete a note"),
)
class NoteViewSet(viewsets.ModelViewSet):
    """ViewSet for Note model (vehicle journal)."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["content"]
    ordering_fields = ["created_at", "odometer"]
    ordering = ["-created_at"]
    filterset_fields = ["vehicle"]

    def get_queryset(self):
        """Return only user's notes."""
        return Note.objects.filter(vehicle__owner=self.request.user)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return NoteListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return NoteWriteSerializer
        return NoteDetailSerializer

    @extend_schema(
        summary="Upload note image",
        description="Upload an image attachment for the note",
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
                "required": ["file"],
            }
        },
        responses={200: NoteDetailSerializer},
    )
    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def upload_image(self, request, pk=None):
        """Upload an image for the note."""
        note = self.get_object()

        # Check if file was provided
        if "file" not in request.FILES:
            return Response(
                {"error": "validation_error", "message": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES["file"]

        # Validate file type (images only)
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if uploaded_file.content_type not in allowed_types:
            return Response(
                {"error": "validation_error", "message": "Only image files are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024
        if uploaded_file.size > max_size:
            return Response(
                {"error": "validation_error", "message": "File size exceeds 10MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate unique filename
        file_ext = uploaded_file.name.split(".")[-1] if "." in uploaded_file.name else "jpg"
        unique_filename = f"notes/{note.vehicle_id}/{note.id}/{uuid.uuid4().hex}.{file_ext}"

        # Save file to storage (Garage S3)
        file_path = default_storage.save(unique_filename, uploaded_file)

        # Store the file path (presigned URLs are generated dynamically in serializers)
        note.image_url = file_path
        note.save(update_fields=["image_url", "updated_at"])

        return Response(NoteDetailSerializer(note).data)

    @extend_schema(
        summary="Delete note image",
        description="Remove the image from a note",
        responses={200: NoteDetailSerializer},
    )
    @action(detail=True, methods=["delete"], url_path="image")
    def delete_image(self, request, pk=None):
        """Delete the note's image."""
        note = self.get_object()
        note.image_url = ""
        note.save(update_fields=["image_url", "updated_at"])
        return Response(NoteDetailSerializer(note).data)
