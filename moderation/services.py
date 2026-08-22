from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone


from comments.models import Comment
from post.models import Post


from reports.constants import (
    ALLOWED_REPORT_MODELS,
    REPORT_ACTION_ACCOUNT_BANNED,
    REPORT_ACTION_ACCOUNT_RESTRICTED,
    REPORT_ACTION_ACCOUNT_SUSPENDED,
    REPORT_ACTION_CONTENT_REMOVED,
    REPORT_ACTION_NONE,
    REPORT_ACTION_WARNING,
    REPORT_STATUS_IN_REVIEW,
    REPORT_STATUS_REJECTED,
    REPORT_STATUS_RESOLVED,
)

from reports.models import Report, ReportAction

from .constants import (
    MODERATION_DECISION_REJECT,
    MODERATION_DECISION_RESOLVE,
)

from .models import (
    ModerationActionLog,
    ModerationCase,
    UserModeration,
)

User = get_user_model()


# ============================================================
# Exceptions
# ============================================================

class ModerationServiceError(Exception):
    """
    Base exception for moderation service errors.
    """


class InvalidModerationAction(ModerationServiceError):
    """
    Raised when an unsupported moderation action is requested.
    """


class InvalidModerationDecision(ModerationServiceError):
    """
    Raised when an unsupported moderation decision is requested.
    """


class ModerationTargetNotFound(ModerationServiceError):
    """
    Raised when the reported target cannot be resolved.
    """


class ModerationPermissionError(ModerationServiceError):
    """
    Raised when a moderator is not allowed to perform an action.
    """


# ============================================================
# Constants
# ============================================================

ALLOWED_ACTIONS = frozenset({
    REPORT_ACTION_NONE,
    REPORT_ACTION_WARNING,
    REPORT_ACTION_CONTENT_REMOVED,
    REPORT_ACTION_ACCOUNT_RESTRICTED,
    REPORT_ACTION_ACCOUNT_SUSPENDED,
    REPORT_ACTION_ACCOUNT_BANNED,
})


ALLOWED_DECISIONS = frozenset({
    MODERATION_DECISION_RESOLVE,
    MODERATION_DECISION_REJECT,
})


ACCOUNT_ACTIONS = frozenset({
    REPORT_ACTION_ACCOUNT_RESTRICTED,
    REPORT_ACTION_ACCOUNT_SUSPENDED,
    REPORT_ACTION_ACCOUNT_BANNED,
})


# ============================================================
# Validation
# ============================================================

def _validate_action(action_taken):

    if action_taken not in ALLOWED_ACTIONS:
        raise InvalidModerationAction(
            f"Unsupported moderation action: {action_taken}"
        )


def _validate_decision(decision):

    if decision not in ALLOWED_DECISIONS:
        raise InvalidModerationDecision(
            f"Unsupported moderation decision: {decision}"
        )


def _validate_note(note):

    if note is None:
        return

    if not isinstance(note, str):
        raise ModerationServiceError(
            "Moderator note must be a string."
        )

    if len(note) > 10000:
        raise ModerationServiceError(
            "Moderator note cannot exceed 10000 characters."
        )


def _validate_action_reason(action_reason):

    if action_reason is None:
        return

    if not isinstance(action_reason, str):
        raise ModerationServiceError(
            "Action reason must be a string."
        )

    if len(action_reason) > 10000:
        raise ModerationServiceError(
            "Action reason cannot exceed 10000 characters."
        )


# ============================================================
# Report Target Helpers
# ============================================================

def _get_report_target(report):

    content_type = report.content_type

    model_name = content_type.model

    if model_name not in ALLOWED_REPORT_MODELS:
        raise ModerationTargetNotFound(
            f"Unsupported report target: {model_name}"
        )

    target = report.content_object

    if target is None:
        raise ModerationTargetNotFound(
            "Reported content no longer exists."
        )

    if isinstance(target, Post):
        return target

    if isinstance(target, Comment):
        return target

    raise ModerationTargetNotFound(
        "Invalid moderation target."
    )


def _get_target_user(report):

    target = _get_report_target(report)

    if isinstance(target, Post):
        return target.author

    if isinstance(target, Comment):
        return target.user

    raise ModerationTargetNotFound(
        "Unable to determine target user."
    )


# ============================================================
# Moderation State Helpers
# ============================================================

def _get_or_create_user_moderation(user):

    locked_user = (
        User.objects
        .select_for_update()
        .get(pk=user.pk)
    )

    moderation = (
        UserModeration.objects
        .select_for_update()
        .filter(user=locked_user)
        .first()
    )

    if moderation is None:
        moderation = UserModeration.objects.create(
            user=locked_user,
        )

    return moderation


def _normalize_moderation_state(
    moderation,
    now,
):

    update_fields = []

    if (
        moderation.is_restricted
        and moderation.restriction_expires_at is not None
        and moderation.restriction_expires_at <= now
    ):

        moderation.is_restricted = False
        moderation.restriction_expires_at = None

        update_fields.extend([
            "is_restricted",
            "restriction_expires_at",
        ])

    if (
        moderation.is_suspended
        and moderation.suspension_expires_at is not None
        and moderation.suspension_expires_at <= now
    ):

        moderation.is_suspended = False
        moderation.suspension_expires_at = None

        update_fields.extend([
            "is_suspended",
            "suspension_expires_at",
        ])

    if update_fields:
        update_fields.append("updated_at")

        moderation.save(
            update_fields=update_fields
        )


def _validate_restriction_expiry(
    restriction_expires_at,
    now,
):

    if restriction_expires_at is None:
        return

    if restriction_expires_at <= now:
        raise ModerationServiceError(
            "Restriction expiry must be in the future."
        )


def _validate_suspension_expiry(
    suspension_expires_at,
    now,
):

    if suspension_expires_at is None:
        return

    if suspension_expires_at <= now:
        raise ModerationServiceError(
            "Suspension expiry must be in the future."
        )


# ============================================================
# Content Moderation
# ============================================================

def _remove_reported_content(report):

    target = _get_report_target(report)

    if not hasattr(target, "is_deleted"):
        raise ModerationServiceError(
            "Reported content does not support soft deletion."
        )

    if target.is_deleted:
        return target

    target.delete()

    return target


# ============================================================
# Audit Logs
# ============================================================

def _create_report_action(
    *,
    report,
    moderator,
    old_status,
    new_status,
    action_taken,
    note="",
):

    return ReportAction.objects.create(
        report=report,
        moderator=moderator,
        old_status=old_status,
        new_status=new_status,
        action_taken=action_taken,
        note=note or "",
    )


def _create_moderation_action_log(
    *,
    moderation_case,
    moderator,
    old_decision,
    new_decision,
    action_taken="",
    action_reason="",
    restriction_expires_at=None,
    suspension_expires_at=None,
    is_permanent=False,
    note="",
):

    return ModerationActionLog.objects.create(
        moderation_case=moderation_case,
        moderator=moderator,
        old_decision=old_decision,
        new_decision=new_decision,
        action_taken=action_taken,
        action_reason=action_reason or "",
        restriction_expires_at=restriction_expires_at,
        suspension_expires_at=suspension_expires_at,
        is_permanent=is_permanent,
        note=note or "",
    )


# ============================================================
# Case Management
# ============================================================

@transaction.atomic
def assign_case(
    *,
    moderation_case,
    moderator,
):

    case = (
        ModerationCase.objects
        .select_for_update()
        .get(pk=moderation_case.pk)
    )

    if case.decision is not None:
        raise ModerationServiceError(
            "A completed moderation case cannot be reassigned."
        )

    case.assigned_to = moderator

    case.save(
        update_fields=[
            "assigned_to",
            "updated_at",
        ]
    )

    return case


@transaction.atomic
def start_case(
    *,
    moderation_case,
    moderator,
):

    case = (
        ModerationCase.objects
        .select_for_update()
        .select_related("report")
        .get(pk=moderation_case.pk)
    )

    if case.decision is not None:
        raise ModerationServiceError(
            "This moderation case has already been completed."
        )

    if (
        case.assigned_to_id is not None
        and case.assigned_to_id != moderator.pk
    ):
        raise ModerationPermissionError(
            "This case is assigned to another moderator."
        )

    now = timezone.now()

    case.assigned_to = moderator

    if case.started_at is None:
        case.started_at = now

    report = (
        Report.objects
        .select_for_update()
        .get(pk=case.report_id)
    )

    if report.status in {
        REPORT_STATUS_RESOLVED,
        REPORT_STATUS_REJECTED,
    }:
        raise ModerationServiceError(
            "This report has already been completed."
        )

    if report.status != REPORT_STATUS_IN_REVIEW:
        report.status = REPORT_STATUS_IN_REVIEW
        report.reviewed_by = moderator

        report.save(
            update_fields=[
                "status",
                "reviewed_by",
                "updated_at",
            ]
        )

    case.save(
        update_fields=[
            "assigned_to",
            "started_at",
            "updated_at",
        ]
    )

    return case


# ============================================================
# Main Moderation Operation
# ============================================================

@transaction.atomic
def apply_moderation_action(
    *,
    moderation_case,
    moderator,
    action_taken,
    decision,
    action_reason="",
    restriction_expires_at=None,
    suspension_expires_at=None,
    is_permanent=False,
    note="",
):

    _validate_action(action_taken)
    _validate_decision(decision)
    _validate_action_reason(action_reason)
    _validate_note(note)

    # --------------------------------------------------------
    # Reject invalid combinations
    # --------------------------------------------------------

    if (
        decision == MODERATION_DECISION_REJECT
        and action_taken != REPORT_ACTION_NONE
    ):
        raise ModerationServiceError(
            "A rejected report cannot have a moderation action."
        )

    if (
        action_taken == REPORT_ACTION_ACCOUNT_RESTRICTED
        and restriction_expires_at is None
    ):
        raise ModerationServiceError(
            "Restriction expiry is required for account restriction."
        )

    if (
        action_taken == REPORT_ACTION_ACCOUNT_SUSPENDED
        and suspension_expires_at is None
    ):
        raise ModerationServiceError(
            "Suspension expiry is required for account suspension."
        )

    if (
        action_taken != REPORT_ACTION_ACCOUNT_RESTRICTED
        and restriction_expires_at is not None
    ):
        raise ModerationServiceError(
            "Restriction expiry is only allowed for account restriction."
        )

    if (
        action_taken != REPORT_ACTION_ACCOUNT_SUSPENDED
        and suspension_expires_at is not None
    ):
        raise ModerationServiceError(
            "Suspension expiry is only allowed for account suspension."
        )

    if (
        action_taken != REPORT_ACTION_ACCOUNT_BANNED
        and is_permanent
    ):
        raise ModerationServiceError(
            "Permanent flag is only allowed for account ban."
        )

    if (
        action_taken == REPORT_ACTION_ACCOUNT_BANNED
        and not is_permanent
    ):
        raise ModerationServiceError(
            "Account ban must be permanent."
        )


    # --------------------------------------------------------
    # Lock case
    # --------------------------------------------------------

    case = (
        ModerationCase.objects
        .select_for_update()
        .select_related("report")
        .get(pk=moderation_case.pk)
    )

    if case.decision is not None:
        raise ModerationServiceError(
            "This moderation case has already been completed."
        )

    if (
        case.assigned_to_id is not None
        and case.assigned_to_id != moderator.pk
    ):
        raise ModerationPermissionError(
            "This case is assigned to another moderator."
        )


    # --------------------------------------------------------
    # Lock report
    # --------------------------------------------------------

    report = (
        Report.objects
        .select_for_update()
        .select_related("content_type")
        .get(pk=case.report_id)
    )

    if report.status in {
        REPORT_STATUS_RESOLVED,
        REPORT_STATUS_REJECTED,
    }:
        raise ModerationServiceError(
            "This report has already been completed."
        )

    now = timezone.now()


    # --------------------------------------------------------
    # Validate temporary action expiry
    # --------------------------------------------------------

    if action_taken == REPORT_ACTION_ACCOUNT_RESTRICTED:
        _validate_restriction_expiry(
            restriction_expires_at,
            now,
        )

    if action_taken == REPORT_ACTION_ACCOUNT_SUSPENDED:
        _validate_suspension_expiry(
            suspension_expires_at,
            now,
        )


    # --------------------------------------------------------
    # Get target user when account action is required
    # --------------------------------------------------------

    target_user = None
    user_moderation = None

    if action_taken in ACCOUNT_ACTIONS:

        target_user = _get_target_user(report)

        user_moderation = _get_or_create_user_moderation(
            target_user,
        )

        _normalize_moderation_state(
            user_moderation,
            now,
        )


    # --------------------------------------------------------
    # Apply action to target
    # --------------------------------------------------------

    if action_taken == REPORT_ACTION_CONTENT_REMOVED:

        _remove_reported_content(report)


    elif action_taken == REPORT_ACTION_ACCOUNT_RESTRICTED:

        if user_moderation.is_banned:
            raise ModerationServiceError(
                "A banned account cannot be restricted."
            )

        if user_moderation.is_suspended:
            raise ModerationServiceError(
                "A suspended account cannot be restricted."
            )

        user_moderation.is_restricted = True
        user_moderation.restriction_expires_at = (
            restriction_expires_at
        )

        user_moderation.save(
            update_fields=[
                "is_restricted",
                "restriction_expires_at",
                "updated_at",
            ]
        )


    elif action_taken == REPORT_ACTION_ACCOUNT_SUSPENDED:

        if user_moderation.is_banned:
            raise ModerationServiceError(
                "A banned account cannot be suspended."
            )

        user_moderation.is_restricted = False
        user_moderation.restriction_expires_at = None

        user_moderation.is_suspended = True
        user_moderation.suspension_expires_at = (
            suspension_expires_at
        )

        user_moderation.save(
            update_fields=[
                "is_restricted",
                "restriction_expires_at",
                "is_suspended",
                "suspension_expires_at",
                "updated_at",
            ]
        )


    elif action_taken == REPORT_ACTION_ACCOUNT_BANNED:

        user_moderation.is_restricted = False
        user_moderation.restriction_expires_at = None

        user_moderation.is_suspended = False
        user_moderation.suspension_expires_at = None

        user_moderation.is_banned = True
        user_moderation.banned_at = now
        user_moderation.ban_reason = (
            action_reason
            or note
            or "Account permanently banned."
        )

        user_moderation.save(
            update_fields=[
                "is_restricted",
                "restriction_expires_at",
                "is_suspended",
                "suspension_expires_at",
                "is_banned",
                "banned_at",
                "ban_reason",
                "updated_at",
            ]
        )


    # --------------------------------------------------------
    # Determine new report status
    # --------------------------------------------------------

    old_report_status = report.status

    if decision == MODERATION_DECISION_RESOLVE:
        new_report_status = REPORT_STATUS_RESOLVED
    else:
        new_report_status = REPORT_STATUS_REJECTED


    # --------------------------------------------------------
    # Update report
    # --------------------------------------------------------

    report.status = new_report_status
    report.action_taken = action_taken
    report.reviewed_by = moderator
    report.reviewed_at = now

    report.save(
        update_fields=[
            "status",
            "action_taken",
            "reviewed_by",
            "reviewed_at",
            "updated_at",
        ]
    )


    # --------------------------------------------------------
    # Update moderation case
    # --------------------------------------------------------

    old_decision = case.decision

    case.assigned_to = moderator
    case.decision = decision
    case.moderator_note = note or ""
    case.resolved_at = now

    if case.started_at is None:
        case.started_at = now

    case.save(
        update_fields=[
            "assigned_to",
            "decision",
            "moderator_note",
            "started_at",
            "resolved_at",
            "updated_at",
        ]
    )


    # --------------------------------------------------------
    # Report audit
    # --------------------------------------------------------

    _created_report_action(
        report=report,
        moderator=moderator,
        old_status=old_report_status,
        new_status=new_report_status,
        action_taken=action_taken,
        note=note,
    )


    # --------------------------------------------------------
    # Moderation audit
    # --------------------------------------------------------

    _create_moderation_action_log(
        moderation_case=case,
        moderator=moderator,
        old_decision=old_decision,
        new_decision=decision,
        action_taken=action_taken,
        action_reason=action_reason,
        restriction_expires_at=restriction_expires_at,
        suspension_expires_at=suspension_expires_at,
        is_permanent=is_permanent,
        note=note,
    )

    return case


# ============================================================
# Public Convenience Services
# ============================================================

def resolve_case(
    *,
    moderation_case,
    moderator,
    action_taken=REPORT_ACTION_NONE,
    action_reason="",
    restriction_expires_at=None,
    suspension_expires_at=None,
    is_permanent=False,
    note="",
):

    return apply_moderation_action(
        moderation_case=moderation_case,
        moderator=moderator,
        action_taken=action_taken,
        decision=MODERATION_DECISION_RESOLVE,
        action_reason=action_reason,
        restriction_expires_at=restriction_expires_at,
        suspension_expires_at=suspension_expires_at,
        is_permanent=is_permanent,
        note=note,
    )


def reject_case(
    *,
    moderation_case,
    moderator,
    note="",
):

    return apply_moderation_action(
        moderation_case=moderation_case,
        moderator=moderator,
        action_taken=REPORT_ACTION_NONE,
        decision=MODERATION_DECISION_REJECT,
        note=note,
    )