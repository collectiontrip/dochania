from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)


class IsModerator(BasePermission):

    def has_permission(
        self,
        request,
        view,
    ):
        return (
            request.user.is_authenticated
            and request.user.is_staff
        )


class IsReportOwnerOrModerator(BasePermission):

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        if request.user.is_staff:
            return True

        return obj.reporter == request.user