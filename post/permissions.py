from rest_framework.permissions import BasePermission


class IsOwnerOrAdmin(BasePermission):

    message = "You do not have permission to modifiy this post."

    def has_objects_permission(self, request, view, obj):
        return (
            obj.author == request.user
            or request.user.is_staff
        )