from rest_framework.permissions import BasePermission

from moderation.permissions import IsModerator as ModerationIsModerator


class IsModerator(ModerationIsModerator):
    """
    Allows access to moderators and superusers.

    Uses the same moderator permission logic as the
    moderation app so that all moderation-related APIs
    follow one consistent authorization rule.
    """

    pass


class IsReportOwnerOrModerator(BasePermission):
    """
    Allows moderators/superusers to access any report.

    Normal authenticated users can only access their
    own reports.
    """

    def has_permission(
        self,
        request,
        view,
    ):
        return request.user.is_authenticated

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        if not request.user.is_authenticated:
            return False

        if ModerationIsModerator().has_permission(
            request,
            view,
        ):
            return True

        return obj.reporter_id == request.user.id