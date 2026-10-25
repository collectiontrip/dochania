
from django.utils import timezone
from rest_framework.permissions import BasePermission

from moderation.models import UserModeration


class IsOwnerOrAdmin(BasePermission):
    message = "You do not have permission to modify this post."

    def has_object_permission(self, request, view, obj):
        return (
            obj.author == request.user
            or request.user.is_staff
        )


class CanCreatePost(BasePermission):
    message = "Your account is not allowed to create posts."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        moderation = UserModeration.objects.filter(
            user=user,
        ).first()

        if moderation is None:
            return True

        now = timezone.now()

        if moderation.is_banned:
            self.message = (
                "Your account is permanently banned. "
                "You cannot create posts."
            )
            return False

        if (
            moderation.is_suspended
            and (
                moderation.suspension_expires_at is None
                or moderation.suspension_expires_at > now
            )
        ):
            self.message = (
                "Your account is suspended. "
                "You cannot create posts."
            )
            return False

        if (
            moderation.is_restricted
            and (
                moderation.restriction_expires_at is None
                or moderation.restriction_expires_at > now
            )
        ):
            self.message = (
                "Your account is restricted. "
                "You cannot create posts."
            )
            return False

        return True
