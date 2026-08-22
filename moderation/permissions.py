from rest_framework.permissions import BasePermission


# ============================================================
# Moderator Permission
# ============================================================

class IsModerator(BasePermission):

    message = (
        "You do not have permission to access "
        "moderation resources."
    )

    def has_permission(self, request, view):

        user = request.user

        if user.is_superuser:
            return True

        return bool(
            getattr(
                user,
                "is_moderator",
                False,
            )
        )


# ============================================================
# Moderator OR Staff Permission
# ============================================================

class IsModeratorOrStaff(BasePermission):

    message = (
        "You do not have permission to access "
        "this moderation resource."
    )

    def has_permission(self, request, view):

        user = request.user

        if user.is_superuser:
            return True

        if user.is_staff:
            return True

        return bool(
            getattr(
                user,
                "is_moderator",
                False,
            )
        )


# ============================================================
# Superuser Permission
# ============================================================

class IsSuperuser(BasePermission):

    message = (
        "Only a superuser can perform this operation."
    )

    def has_permission(self, request, view):

        return bool(
            request.user.is_superuser
        )


# ============================================================
# Assigned Moderator Permission
# ============================================================

class IsAssignedModerator(BasePermission):

    message = (
        "You are not assigned to this moderation case."
    )

    def has_permission(self, request, view):

        user = request.user

        if user.is_superuser:
            return True

        return bool(
            getattr(
                user,
                "is_moderator",
                False,
            )
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):

        user = request.user

        if user.is_superuser:
            return True

        assigned_to_id = getattr(
            obj,
            "assigned_to_id",
            None,
        )

        if assigned_to_id is None:
            self.message = (
                "This moderation case is not assigned "
                "to a moderator."
            )
            return False

        if assigned_to_id != user.pk:
            self.message = (
                "You are not assigned to this "
                "moderation case."
            )
            return False

        return True


# ============================================================
# Moderation Case View Permission
# ============================================================

class CanViewModerationCase(BasePermission):

    message = (
        "You do not have permission to view "
        "this moderation case."
    )

    def has_permission(self, request, view):

        user = request.user

        if user.is_superuser:
            return True

        return bool(
            getattr(
                user,
                "is_moderator",
                False,
            )
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):

        user = request.user

        if user.is_superuser:
            return True

        assigned_to_id = getattr(
            obj,
            "assigned_to_id",
            None,
        )

        # Unassigned cases can be viewed
        # by any moderator.
        if assigned_to_id is None:
            return bool(
                getattr(
                    user,
                    "is_moderator",
                    False,
                )
            )

        # Assigned case can only be viewed
        # by the assigned moderator.
        return assigned_to_id == user.pk