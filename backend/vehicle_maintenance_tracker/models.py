"""Vehicle Maintenance Tracker application models.

Design Decisions:
-----------------
1. Soft deletes: All models use soft delete (is_deleted flag) to support undo functionality
2. Denormalization: Cached counts for performance where needed
3. Ordering: display_order field for user-controlled ordering
4. Audit trail: created_at/updated_at timestamps on all models
5. Indexes: Composite indexes on (owner, is_deleted) for common query patterns
6. File storage: Uses Garage S3-compatible storage for attachments
"""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that filters out soft-deleted objects by default."""

    def active(self):
        """Return only non-deleted objects."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Return only soft-deleted objects."""
        return self.filter(is_deleted=True)

    def hard_delete(self):
        """Permanently delete objects (use with caution)."""
        return super().delete()


class SoftDeleteManager(models.Manager):
    """Manager that returns only non-deleted objects by default."""

    def get_queryset(self):
        """Override to return only active objects."""
        return SoftDeleteQuerySet(self.model, using=self._db).active()

    def all_with_deleted(self):
        """Return all objects including soft-deleted ones."""
        return SoftDeleteQuerySet(self.model, using=self._db)

    def deleted_only(self):
        """Return only soft-deleted objects."""
        return SoftDeleteQuerySet(self.model, using=self._db).deleted()


class TimeStampedModel(models.Model):
    """Abstract base model with timestamp fields."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(TimeStampedModel):
    """Abstract base model with soft delete functionality."""

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    all_objects = models.Manager()  # Access to all objects including deleted

    objects = SoftDeleteManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete the object."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(using=using)

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the object."""
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restore a soft-deleted object."""
        self.is_deleted = False
        self.deleted_at = None
        self.save()


# =============================================================================
# Service Type - Lookup table for service categories
# =============================================================================


class ServiceTypeManager(SoftDeleteManager):
    """Custom manager for ServiceType model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return SoftDeleteQuerySet(self.model, using=self._db).active()

    def system_defaults(self):
        """Get system-wide default service types."""
        return self.filter(is_custom=False)

    def for_user(self, user):
        """Get all service types available to a user (defaults + custom)."""
        return self.filter(models.Q(is_custom=False) | models.Q(user=user))


class ServiceType(SoftDeleteModel):
    """Service type lookup table (oil change, brakes, tires, etc.).

    Design Decisions:
    - System defaults have is_custom=False and user=null
    - Custom types have is_custom=True and reference the user who created them
    - Custom types are only visible to the user who created them
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="custom_service_types",
        null=True,
        blank=True,
        help_text="User who created this custom type (null for system defaults)",
    )
    name = models.CharField(max_length=100, help_text="Service type name (e.g., 'Oil Change')")
    description = models.TextField(blank=True, default="", help_text="Optional description")
    is_custom = models.BooleanField(default=True, db_index=True, help_text="False for system defaults")

    # Display ordering
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    objects = ServiceTypeManager()

    class Meta:
        ordering = ["display_order", "name"]
        indexes = [
            models.Index(fields=["is_custom", "is_deleted"]),
            models.Index(fields=["user", "is_deleted"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=models.Q(is_deleted=False, is_custom=False),
                name="unique_system_service_type_name",
            ),
            models.UniqueConstraint(
                fields=["user", "name"],
                condition=models.Q(is_deleted=False, is_custom=True),
                name="unique_user_service_type_name",
            ),
        ]

    def __str__(self):
        if self.is_custom and self.user:
            return f"{self.name} (custom - {self.user.email})"
        return f"{self.name} (system)"


# =============================================================================
# Shop / Service Location
# =============================================================================


class ShopManager(SoftDeleteManager):
    """Custom manager for Shop model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return SoftDeleteQuerySet(self.model, using=self._db).active().select_related("owner")

    def for_user(self, user):
        """Get all shops for a specific user."""
        return self.filter(owner=user)


class Shop(SoftDeleteModel):
    """Service location (mechanic, dealer, etc.).

    Design Decisions:
    - Shops are shared across all of a user's vehicles
    - Can be added via Google Places API or manual entry
    - DIY is handled as a special case in service records, not as a shop
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shops",
        db_index=True,
    )
    name = models.CharField(max_length=255, help_text="Business name")
    address = models.TextField(blank=True, default="", help_text="Full address")
    phone = models.CharField(max_length=50, blank=True, default="", help_text="Phone number")

    # Google Places integration
    google_place_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Google Places ID for 'open in maps' functionality",
    )

    # Display ordering
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    objects = ShopManager()

    class Meta:
        ordering = ["display_order", "name"]
        indexes = [
            models.Index(fields=["owner", "is_deleted"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                condition=models.Q(is_deleted=False),
                name="unique_shop_name_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.email})"

    @property
    def has_google_maps_link(self):
        """Check if this shop has Google Maps integration."""
        return bool(self.google_place_id)

    @property
    def google_maps_url(self):
        """Generate Google Maps URL if place_id is available."""
        if self.google_place_id:
            return f"https://www.google.com/maps/place/?q=place_id:{self.google_place_id}"
        return None


# =============================================================================
# Vehicle
# =============================================================================


class VehicleQuerySet(SoftDeleteQuerySet):
    """Custom queryset for Vehicle model."""

    def with_stats(self):
        """Annotate vehicles with calculated statistics."""
        return self.annotate(
            total_service_records=models.Count(
                "service_records", filter=models.Q(service_records__is_deleted=False), distinct=True
            ),
            total_cost=models.Sum(
                models.F("service_records__parts_cost") + models.F("service_records__labor_cost"),
                filter=models.Q(service_records__is_deleted=False),
            ),
        )


class VehicleManager(SoftDeleteManager):
    """Custom manager for Vehicle model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return VehicleQuerySet(self.model, using=self._db).active().select_related("owner")

    def for_user(self, user):
        """Get all vehicles for a specific user."""
        return self.filter(owner=user)


class Vehicle(SoftDeleteModel):
    """A vehicle tracked by the user.

    Design Decisions:
    - VIN is optional (some users may not have it handy)
    - Current odometer is tracked and updated periodically
    - Photo stored via Garage S3-compatible storage
    - is_archived for vehicles no longer in use (separate from soft delete)
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vehicles",
        db_index=True,
    )

    # Basic info
    name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Nickname for the vehicle (e.g., 'Daily Driver')",
    )
    year = models.PositiveSmallIntegerField(help_text="Model year (e.g., 2020)")
    make = models.CharField(max_length=100, help_text="Manufacturer (e.g., 'Toyota')")
    model = models.CharField(max_length=100, help_text="Model name (e.g., 'Camry')")
    vin = models.CharField(
        max_length=17,
        blank=True,
        default="",
        help_text="Vehicle Identification Number (optional)",
    )
    license_plate = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="License plate number",
    )

    # Engine/trim info (can be populated from VIN decode)
    engine = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Engine description (e.g., '2.5L 4-Cylinder')",
    )
    trim = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Trim level (e.g., 'SE', 'Limited')",
    )

    # Odometer tracking
    current_odometer = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Current odometer reading in miles",
    )
    odometer_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the odometer was last updated",
    )

    # Photo
    photo_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        help_text="URL to vehicle photo (stored in Garage S3)",
    )

    # Archival (separate from deletion)
    is_archived = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Archived vehicles are hidden but not deleted",
    )

    # Display ordering
    display_order = models.PositiveIntegerField(default=0, db_index=True)

    objects = VehicleManager()

    class Meta:
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "is_deleted", "is_archived"]),
            models.Index(fields=["owner", "display_order"]),
            models.Index(fields=["vin"]),
        ]

    def __str__(self):
        name_part = f" '{self.name}'" if self.name else ""
        return f"{self.year} {self.make} {self.model}{name_part}"

    @property
    def display_name(self):
        """Get a display-friendly name for the vehicle."""
        if self.name:
            return self.name
        return f"{self.year} {self.make} {self.model}"

    @property
    def full_description(self):
        """Get full vehicle description including trim and engine."""
        parts = [str(self.year), self.make, self.model]
        if self.trim:
            parts.append(self.trim)
        if self.engine:
            parts.append(f"({self.engine})")
        return " ".join(parts)

    def update_odometer(self, mileage):
        """Update the current odometer reading.

        Args:
            mileage: New odometer reading (must be >= current)

        Raises:
            ValueError: If new mileage is less than current

        """
        if mileage < self.current_odometer:
            raise ValueError("New odometer reading cannot be less than current reading")
        self.current_odometer = mileage
        self.odometer_updated_at = timezone.now()
        self.save(update_fields=["current_odometer", "odometer_updated_at", "updated_at"])


# =============================================================================
# Service Record
# =============================================================================


class ServiceRecordQuerySet(SoftDeleteQuerySet):
    """Custom queryset for ServiceRecord model."""

    def for_vehicle(self, vehicle):
        """Get records for a specific vehicle."""
        return self.filter(vehicle=vehicle)

    def by_date_range(self, start_date, end_date):
        """Filter by date range."""
        return self.filter(date__gte=start_date, date__lte=end_date)

    def by_service_type(self, service_type):
        """Filter by service type."""
        return self.filter(service_type=service_type)


class ServiceRecordManager(SoftDeleteManager):
    """Custom manager for ServiceRecord model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return (
            ServiceRecordQuerySet(self.model, using=self._db)
            .active()
            .select_related("vehicle", "vehicle__owner", "service_type", "shop")
        )

    def for_vehicle(self, vehicle):
        """Get all records for a specific vehicle."""
        return self.filter(vehicle=vehicle)


class ServiceRecord(SoftDeleteModel):
    """A single maintenance or repair record.

    Design Decisions:
    - Each record has a service type, date, odometer, and costs
    - Shop is nullable (null = DIY)
    - Costs split into parts and labor for true cost comparison
    - Attachments stored separately for flexibility
    """

    vehicle = models.ForeignKey(
        "Vehicle",
        on_delete=models.CASCADE,
        related_name="service_records",
        db_index=True,
    )
    service_type = models.ForeignKey(
        "ServiceType",
        on_delete=models.PROTECT,  # Don't allow deletion of used service types
        related_name="service_records",
        db_index=True,
    )
    shop = models.ForeignKey(
        "Shop",
        on_delete=models.SET_NULL,
        related_name="service_records",
        null=True,
        blank=True,
        help_text="Service location (null for DIY)",
    )

    # When the service was performed
    date = models.DateField(db_index=True, help_text="Date of service")
    odometer = models.PositiveIntegerField(
        validators=[MinValueValidator(0)],
        help_text="Odometer reading at time of service",
    )

    # Costs (stored as Decimal for precision)
    parts_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Cost of parts",
    )
    labor_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Cost of labor (typically 0 for DIY)",
    )

    # Notes
    notes = models.TextField(blank=True, default="", help_text="Additional notes about the service")

    objects = ServiceRecordManager()

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["vehicle", "is_deleted", "-date"]),
            models.Index(fields=["service_type", "is_deleted"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return f"{self.service_type.name} - {self.vehicle} ({self.date})"

    def save(self, *args, **kwargs):
        """Override save to update vehicle odometer if this is the latest record."""
        super().save(*args, **kwargs)

        # Update vehicle odometer if this record has a higher reading
        if self.odometer > self.vehicle.current_odometer:
            self.vehicle.current_odometer = self.odometer
            self.vehicle.odometer_updated_at = timezone.now()
            self.vehicle.save(update_fields=["current_odometer", "odometer_updated_at", "updated_at"])

    @property
    def total_cost(self):
        """Calculate total cost (parts + labor)."""
        return self.parts_cost + self.labor_cost

    @property
    def is_diy(self):
        """Check if this was a DIY service."""
        return self.shop is None

    @property
    def location_display(self):
        """Get display string for the service location."""
        if self.is_diy:
            return "DIY"
        return self.shop.name if self.shop else "Unknown"


# =============================================================================
# Service Record Attachment
# =============================================================================


class ServiceRecordAttachment(SoftDeleteModel):
    """Attachment for a service record (receipt, invoice, photo).

    Design Decisions:
    - Files stored in Garage S3-compatible storage
    - Keep file metadata for display without fetching from storage
    - Multiple attachments per service record allowed
    """

    service_record = models.ForeignKey(
        "ServiceRecord",
        on_delete=models.CASCADE,
        related_name="attachments",
        db_index=True,
    )
    file_url = models.URLField(max_length=500, help_text="URL to file in Garage S3")
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size = models.PositiveIntegerField(
        default=0,
        help_text="File size in bytes",
    )
    content_type = models.CharField(
        max_length=100,
        default="application/octet-stream",
        help_text="MIME type of the file",
    )

    objects = SoftDeleteManager()

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["service_record", "is_deleted"]),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.service_record})"


# =============================================================================
# Reminder
# =============================================================================


class ReminderQuerySet(SoftDeleteQuerySet):
    """Custom queryset for Reminder model."""

    def for_vehicle(self, vehicle):
        """Get reminders for a specific vehicle."""
        return self.filter(vehicle=vehicle)

    def due_soon(self, days=30):
        """Get reminders due within N days."""
        from datetime import timedelta

        cutoff = timezone.now().date() + timedelta(days=days)
        return self.filter(next_due_date__lte=cutoff)

    def overdue(self):
        """Get overdue reminders."""
        return self.filter(next_due_date__lt=timezone.now().date())


class ReminderManager(SoftDeleteManager):
    """Custom manager for Reminder model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return (
            ReminderQuerySet(self.model, using=self._db)
            .active()
            .select_related("vehicle", "vehicle__owner", "service_type")
        )

    def for_vehicle(self, vehicle):
        """Get all reminders for a specific vehicle."""
        return self.filter(vehicle=vehicle)


class Reminder(SoftDeleteModel):
    """Maintenance reminder based on time or mileage intervals.

    Design Decisions:
    - Reminders can be triggered by mileage, time, or both (whichever comes first)
    - Reminders auto-reset when matching service records are added
    - Status calculated dynamically based on current date/odometer
    """

    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        DUE_SOON = "due_soon", "Due Soon"
        OVERDUE = "overdue", "Overdue"

    vehicle = models.ForeignKey(
        "Vehicle",
        on_delete=models.CASCADE,
        related_name="reminders",
        db_index=True,
    )
    service_type = models.ForeignKey(
        "ServiceType",
        on_delete=models.PROTECT,
        related_name="reminders",
        db_index=True,
    )

    # Trigger conditions (whichever comes first)
    mileage_interval = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Miles between services (e.g., 5000)",
    )
    time_interval_months = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Months between services (e.g., 6)",
    )

    # Last completion tracking (auto-updated when matching service record added)
    last_completed_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of last completed service",
    )
    last_completed_odometer = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Odometer at last completed service",
    )

    # Calculated next due (for easier querying)
    next_due_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Calculated next due date",
    )
    next_due_odometer = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Calculated next due odometer",
    )

    # Custom notes
    notes = models.TextField(blank=True, default="")

    # Is this an auto-suggested reminder from manufacturer data?
    is_manufacturer_recommended = models.BooleanField(
        default=False,
        help_text="True if this reminder was auto-populated from manufacturer data",
    )

    objects = ReminderManager()

    class Meta:
        ordering = ["next_due_date", "next_due_odometer"]
        indexes = [
            models.Index(fields=["vehicle", "is_deleted"]),
            models.Index(fields=["next_due_date"]),
        ]
        constraints = [
            # At least one interval must be set
            models.CheckConstraint(
                check=models.Q(mileage_interval__isnull=False) | models.Q(time_interval_months__isnull=False),
                name="reminder_has_interval",
            ),
        ]

    def __str__(self):
        return f"{self.service_type.name} reminder - {self.vehicle}"

    @property
    def status(self):
        """Calculate current status based on date and odometer."""
        today = timezone.now().date()
        current_odometer = self.vehicle.current_odometer

        # Check if overdue
        is_date_overdue = self.next_due_date and self.next_due_date < today
        is_mileage_overdue = self.next_due_odometer and current_odometer >= self.next_due_odometer

        if is_date_overdue or is_mileage_overdue:
            return self.Status.OVERDUE

        # Check if due soon (within 30 days or 500 miles)
        from datetime import timedelta

        due_soon_date = today + timedelta(days=30)
        due_soon_mileage = current_odometer + 500

        is_date_due_soon = self.next_due_date and self.next_due_date <= due_soon_date
        is_mileage_due_soon = self.next_due_odometer and self.next_due_odometer <= due_soon_mileage

        if is_date_due_soon or is_mileage_due_soon:
            return self.Status.DUE_SOON

        return self.Status.UPCOMING

    def calculate_next_due(self):
        """Recalculate next due date and odometer based on last completion."""
        from dateutil.relativedelta import relativedelta

        # Calculate next due date
        if self.time_interval_months and self.last_completed_date:
            self.next_due_date = self.last_completed_date + relativedelta(months=self.time_interval_months)
        elif self.time_interval_months:
            # No last completed date, use creation date
            self.next_due_date = self.created_at.date() + relativedelta(months=self.time_interval_months)
        else:
            self.next_due_date = None

        # Calculate next due odometer
        if self.mileage_interval and self.last_completed_odometer is not None:
            self.next_due_odometer = self.last_completed_odometer + self.mileage_interval
        elif self.mileage_interval:
            # No last completed odometer, use vehicle's current odometer
            self.next_due_odometer = self.vehicle.current_odometer + self.mileage_interval
        else:
            self.next_due_odometer = None

        self.save(update_fields=["next_due_date", "next_due_odometer", "updated_at"])

    def mark_completed(self, date, odometer):
        """Mark this reminder as completed and recalculate next due.

        Args:
            date: Date of completion
            odometer: Odometer at completion

        """
        self.last_completed_date = date
        self.last_completed_odometer = odometer
        self.save(update_fields=["last_completed_date", "last_completed_odometer", "updated_at"])
        self.calculate_next_due()


# =============================================================================
# Note (Vehicle Journal)
# =============================================================================


class NoteManager(SoftDeleteManager):
    """Custom manager for Note model."""

    def get_queryset(self):
        """Return queryset with select_related optimization."""
        return SoftDeleteQuerySet(self.model, using=self._db).active().select_related("vehicle", "vehicle__owner")

    def for_vehicle(self, vehicle):
        """Get all notes for a specific vehicle."""
        return self.filter(vehicle=vehicle)


class Note(SoftDeleteModel):
    """A journal entry for a vehicle (observations, issues, quotes, etc.).

    Design Decisions:
    - Simple chronological journal entries
    - Optional odometer and image attachment
    - No categories or tags (keeping it simple)
    """

    vehicle = models.ForeignKey(
        "Vehicle",
        on_delete=models.CASCADE,
        related_name="notes",
        db_index=True,
    )

    content = models.TextField(help_text="Note content")
    odometer = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optional odometer reading at time of note",
    )

    # Optional image attachment
    image_url = models.URLField(
        max_length=500,
        blank=True,
        default="",
        help_text="URL to image in Garage S3 (optional)",
    )

    objects = NoteManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["vehicle", "is_deleted", "-created_at"]),
        ]

    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"Note: {preview} ({self.vehicle})"
