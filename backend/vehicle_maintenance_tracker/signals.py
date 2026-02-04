"""Signal handlers for Vehicle Maintenance Tracker app.

Handles automatic updates when:
- Service records are created/updated (updates related reminders)
- Vehicles are modified (recalculates reminder due dates)
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Reminder, ServiceRecord


@receiver(post_save, sender=ServiceRecord)
def update_reminder_on_service_record(sender, instance, created, **kwargs):
    """Update related reminders when a service record is created or updated.

    When a service record is saved, find any reminders for the same vehicle
    and service type, and mark them as completed with the service record's
    date and odometer.
    """
    if instance.is_deleted:
        return

    # Find reminders that match this service record
    matching_reminders = Reminder.objects.filter(
        vehicle=instance.vehicle,
        service_type=instance.service_type,
        is_deleted=False,
    )

    for reminder in matching_reminders:
        # Only update if this service is more recent
        should_update = False
        if reminder.last_completed_date is None:
            should_update = True
        elif instance.date > reminder.last_completed_date:
            should_update = True
        elif instance.date == reminder.last_completed_date:
            # Same date - check odometer
            if reminder.last_completed_odometer is None or instance.odometer > reminder.last_completed_odometer:
                should_update = True

        if should_update:
            reminder.mark_completed(instance.date, instance.odometer)
