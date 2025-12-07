"""API views for the notifications app."""

from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationLog, NotificationPreference, PushSubscription
from .serializers import (
    NotificationLogSerializer,
    NotificationPreferenceSerializer,
    PushSubscriptionSerializer,
)


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """Get or update user's notification preferences.

    GET: Returns current notification preferences
    PUT/PATCH: Updates notification preferences
    """

    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self) -> NotificationPreference:
        """Get or create notification preferences for the current user."""
        obj, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj


class PushSubscriptionView(APIView):
    """Subscribe/unsubscribe from push notifications.

    POST: Subscribe to push notifications
    DELETE: Unsubscribe from push notifications
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Subscribe to push notifications."""
        serializer = PushSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=serializer.validated_data["endpoint"],
            defaults={
                "p256dh_key": serializer.validated_data["p_256dh_key"],
                "auth_key": serializer.validated_data["auth_key"],
                "user_agent": serializer.validated_data.get("user_agent", ""),
            },
        )
        return Response({"status": "subscribed"}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        """Unsubscribe from push notifications."""
        endpoint = request.data.get("endpoint")
        if endpoint:
            PushSubscription.objects.filter(
                user=request.user,
                endpoint=endpoint,
            ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VapidPublicKeyView(APIView):
    """Get VAPID public key for push subscription.

    The VAPID public key is needed by the browser to subscribe to push notifications.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return the VAPID public key."""
        public_key = getattr(settings, "VAPID_PUBLIC_KEY", "")
        return Response({"public_key": public_key})


class NotificationLogListView(generics.ListAPIView):
    """List user's notification history.

    Returns the most recent 50 notifications for the authenticated user.
    """

    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return notifications for the current user."""
        return NotificationLog.objects.filter(user=self.request.user)[:50]
