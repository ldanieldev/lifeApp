"""Custom permission classes for Vehicle Maintenance Tracker."""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Check if user owns the object.

    Works with models that have:
    - owner field (Vehicle, Shop)
    - vehicle.owner field (ServiceRecord, Reminder, Note)
    - service_record.vehicle.owner field (ServiceRecordAttachment)
    """

    def has_object_permission(self, request, view, obj):
        """Check ownership at the object level."""
        # Direct owner relationship
        if hasattr(obj, "owner"):
            return obj.owner == request.user

        # Nested via vehicle
        if hasattr(obj, "vehicle") and hasattr(obj.vehicle, "owner"):
            return obj.vehicle.owner == request.user

        # Nested via service_record.vehicle
        if hasattr(obj, "service_record") and hasattr(obj.service_record, "vehicle"):
            return obj.service_record.vehicle.owner == request.user

        return False


class IsOwnerOrSystemServiceType(permissions.BasePermission):
    """Permission for ServiceType model.

    - System service types (is_custom=False) are read-only for everyone
    - Custom service types can only be modified by their creator
    """

    def has_object_permission(self, request, view, obj):
        """Check permission for service type access."""
        # Allow read access to all service types (system + custom)
        if request.method in permissions.SAFE_METHODS:
            # System types are readable by all authenticated users
            if not obj.is_custom:
                return True
            # Custom types are readable only by their creator
            return obj.user == request.user

        # Write access only for custom types owned by the user
        if obj.is_custom and obj.user == request.user:
            return True

        # Deny write access to system types
        return False
