from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from rest_framework import status

from .models import (
    LiveSession,
    LiveMessage,
    LiveViewer,
    LiveKickedViewer,
    BroadcasterLiveAdmin,
    LiveModerationAction,
)

from .moderation import moderate_live_message

from relationships.models import Block
from moderation.models import UserModeration


# ============================================================
# SERVICE RESULT HELPERS
# ============================================================


def _success(data=None):
    """
    Return a successful service result.
    """

    return {
        "success": True,
        "data": data,
        "error": None,
    }


def _error(
    message,
    http_status=status.HTTP_400_BAD_REQUEST,
):
    """
    Return a failed service result.
    """

    return {
        "success": False,
        "data": None,
        "error": {
            "message": message,
            "status": http_status,
        },
    }


# ============================================================
# ACCOUNT MODERATION HELPERS
# ============================================================


def get_active_user_moderation(user):
    """
    Return the user's moderation record.

    Expired temporary restriction/suspension is automatically
    normalized.

    Permanent ban remains active.
    """

    moderation = (
        UserModeration.objects
        .filter(
            user=user,
        )
        .first()
    )

    if moderation is None:

        return None

    now = timezone.now()

    update_fields = []

    # EXPIRED RESTRICTION

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

    # EXPIRED SUSPENSION

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

    # SAVE NORMALIZED STATE

    if update_fields:

        update_fields.append(
            "updated_at",
        )

        moderation.save(
            update_fields=update_fields,
        )

    return moderation


# ============================================================
# LIVE ACCOUNT ACCESS
# ============================================================


def get_live_start_block_reason(user):
    """
    Return an error message when the user is not allowed
    to start or continue a live session.

    Returns None when live start is allowed.
    """

    moderation = get_active_user_moderation(
        user,
    )

    if moderation is None:

        return None

    # PERMANENT BAN

    if moderation.is_banned:

        return (
            "Your account is permanently banned "
            "and cannot start a live session."
        )

    # ACTIVE SUSPENSION

    if moderation.is_suspended:

        return (
            "Your account is suspended "
            "and cannot start a live session."
        )

    # ACTIVE RESTRICTION

    if moderation.is_restricted:

        return (
            "Your account is restricted "
            "and cannot start a live session."
        )

    return None


def get_live_access_block_reason(user):
    """
    Return an error message when the user cannot access
    live sessions.

    Restricted users can still watch/join lives.

    Suspended and banned users cannot access lives.
    """

    moderation = get_active_user_moderation(
        user,
    )

    if moderation is None:

        return None

    # PERMANENT BAN

    if moderation.is_banned:

        return (
            "Your account is permanently banned "
            "and cannot access live sessions."
        )

    # ACTIVE SUSPENSION

    if moderation.is_suspended:

        return (
            "Your account is suspended "
            "and cannot access live sessions."
        )

    return None


# ============================================================
# LIVE MODERATION STAFF
# ============================================================


def is_platform_moderator(user):
    """
    Return True when the user is allowed to perform
    platform-level live moderation actions.

    Superusers and Dochania moderators are allowed.
    """

    return bool(
        getattr(
            user,
            "is_superuser",
            False,
        )
        or getattr(
            user,
            "is_moderator",
            False,
        )
    )


def can_moderate_live(
    *,
    session,
    user,
):
    """
    Return True when the user can perform platform-level
    moderation actions on a live session.
    """

    if not session.is_live:

        return False

    return is_platform_moderator(
        user,
    )


# ============================================================
# LIVE MODERATION ACTION HELPERS
# ============================================================


def get_active_live_moderation_action(
    *,
    session,
    action,
):
    """
    Return the currently active moderation action.

    Expired actions are automatically normalized.
    """

    now = timezone.now()

    moderation_action = (
        LiveModerationAction.objects
        .filter(
            session=session,
            action=action,
            is_active=True,
        )
        .order_by(
            "-created_at",
        )
        .first()
    )

    if moderation_action is None:

        return None

    # EXPIRED ACTION

    if (
        moderation_action.expires_at is not None
        and moderation_action.expires_at <= now
    ):

        moderation_action.is_active = False
        moderation_action.ended_at = now

        moderation_action.save(
            update_fields=[
                "is_active",
                "ended_at",
                "updated_at",
            ],
        )

        # TEMPORARY SHUTDOWN EXPIRY

        if (
            action
            == LiveModerationAction.ACTION_TEMPORARY_SHUTDOWN
        ):

            session.is_shutdown = False
            session.shutdown_at = None
            session.shutdown_expires_at = None
            session.shutdown_reason = ""

            session.save(
                update_fields=[
                    "is_shutdown",
                    "shutdown_at",
                    "shutdown_expires_at",
                    "shutdown_reason",
                ],
            )

        return None

    return moderation_action


def normalize_live_shutdown(
    *,
    session,
):
    """
    Automatically restore a live after a temporary
    shutdown expires.
    """

    if not session.is_shutdown:

        return session

    now = timezone.now()

    # PERMANENT SHUTDOWN

    if session.shutdown_expires_at is None:

        return session

    # STILL ACTIVE

    if session.shutdown_expires_at > now:

        return session

    # EXPIRE SHUTDOWN

    session.is_shutdown = False
    session.shutdown_at = None
    session.shutdown_expires_at = None
    session.shutdown_reason = ""

    session.save(
        update_fields=[
            "is_shutdown",
            "shutdown_at",
            "shutdown_expires_at",
            "shutdown_reason",
        ],
    )

    # EXPIRE ACTION

    (
        LiveModerationAction.objects
        .filter(
            session=session,
            action=(
                LiveModerationAction
                .ACTION_TEMPORARY_SHUTDOWN
            ),
            is_active=True,
            expires_at__lte=now,
        )
        .update(
            is_active=False,
            ended_at=now,
        )
    )

    return session


def is_live_shutdown_active(
    *,
    session,
):
    """
    Return True when a live is currently shut down.
    """

    session = normalize_live_shutdown(
        session=session,
    )

    return bool(
        session.is_live
        and session.is_shutdown
    )


def is_live_chat_restricted(
    *,
    session,
):
    """
    Return True when live chat is currently restricted.
    """

    if not session.is_live:

        return False

    action = get_active_live_moderation_action(
        session=session,
        action=(
            LiveModerationAction
            .ACTION_CHAT_RESTRICTED
        ),
    )

    return action is not None


def is_live_permanently_terminated(
    *,
    session,
):
    """
    Return True when a permanent termination action exists.
    """

    return (
        LiveModerationAction.objects
        .filter(
            session=session,
            action=(
                LiveModerationAction
                .ACTION_PERMANENT_TERMINATION
            ),
        )
        .exists()
    )


# ============================================================
# APPLY LIVE MODERATION ACTION
# ============================================================


@transaction.atomic
def apply_live_moderation_action(
    *,
    user,
    session_id,
    action,
    reason,
    note="",
    duration_minutes=None,
):
    """
    Apply a platform-level moderation action to a live.

    Supported actions:

        warning
        chat_restricted
        temporary_shutdown
        permanent_termination
    """

    # VALIDATE ACTION

    valid_actions = {
        choice[0]
        for choice
        in LiveModerationAction.ACTION_CHOICES
    }

    if action not in valid_actions:

        return _error(
            "Invalid live moderation action.",
            status.HTTP_400_BAD_REQUEST,
        )

    # VALIDATE REASON

    valid_reasons = {
        choice[0]
        for choice
        in LiveModerationAction.REASON_CHOICES
    }

    if reason not in valid_reasons:

        return _error(
            "Invalid live moderation reason.",
            status.HTTP_400_BAD_REQUEST,
        )

    # NOTE

    if note is None:

        note = ""

    if not isinstance(
        note,
        str,
    ):

        return _error(
            "Moderator note must be text.",
            status.HTTP_400_BAD_REQUEST,
        )

    note = note.strip()

    # SESSION

    session = (
        LiveSession.objects
        .select_for_update()
        .filter(
            id=session_id,
        )
        .first()
    )

    if session is None:

        return _error(
            "Live session not found.",
            status.HTTP_404_NOT_FOUND,
        )

    # PERMANENT TERMINATION ALREADY EXISTS

    if is_live_permanently_terminated(
        session=session,
    ):

        return _error(
            "Live has already been permanently terminated.",
            status.HTTP_400_BAD_REQUEST,
        )

    # MODERATOR PERMISSION

    if not can_moderate_live(
        session=session,
        user=user,
    ):

        return _error(
            "You do not have permission to moderate this live.",
            status.HTTP_403_FORBIDDEN,
        )

    # DURATION

    if duration_minutes is not None:

        if (
            not isinstance(
                duration_minutes,
                int,
            )
            or isinstance(
                duration_minutes,
                bool,
            )
            or duration_minutes <= 0
        ):

            return _error(
                "Duration must be a positive integer.",
                status.HTTP_400_BAD_REQUEST,
            )

    # WARNING

    if (
        action
        == LiveModerationAction.ACTION_WARNING
    ):

        moderation_action = (
            LiveModerationAction.objects.create(
                session=session,
                moderator=user,
                action=action,
                reason=reason,
                note=note,
                is_active=False,
                ended_at=timezone.now(),
            )
        )

        return _success(
            {
                "message": "Live warning recorded successfully.",
                "action": moderation_action,
            }
        )

    # CHAT RESTRICTION

    if (
        action
        == LiveModerationAction.ACTION_CHAT_RESTRICTED
    ):

        existing = get_active_live_moderation_action(
            session=session,
            action=action,
        )

        if existing is not None:

            return _error(
                "Live chat is already restricted.",
                status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        expires_at = None

        if duration_minutes is not None:

            expires_at = (
                now
                + timezone.timedelta(
                    minutes=duration_minutes,
                )
            )

        moderation_action = (
            LiveModerationAction.objects.create(
                session=session,
                moderator=user,
                action=action,
                reason=reason,
                note=note,
                is_active=True,
                expires_at=expires_at,
            )
        )

        return _success(
            {
                "message": "Live chat restricted successfully.",
                "action": moderation_action,
            }
        )

    # TEMPORARY SHUTDOWN

    if (
        action
        == LiveModerationAction.ACTION_TEMPORARY_SHUTDOWN
    ):

        if duration_minutes is None:

            return _error(
                "Temporary shutdown requires a duration.",
                status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        expires_at = (
            now
            + timezone.timedelta(
                minutes=duration_minutes,
            )
        )

        existing = get_active_live_moderation_action(
            session=session,
            action=action,
        )

        if existing is not None:

            return _error(
                "Live is already under temporary shutdown.",
                status.HTTP_400_BAD_REQUEST,
            )

        moderation_action = (
            LiveModerationAction.objects.create(
                session=session,
                moderator=user,
                action=action,
                reason=reason,
                note=note,
                is_active=True,
                expires_at=expires_at,
            )
        )

        session.is_shutdown = True
        session.shutdown_at = now
        session.shutdown_expires_at = expires_at
        session.shutdown_reason = reason

        session.save(
            update_fields=[
                "is_shutdown",
                "shutdown_at",
                "shutdown_expires_at",
                "shutdown_reason",
            ],
        )

        return _success(
            {
                "message": (
                    "Live has been temporarily "
                    "shut down."
                ),
                "action": moderation_action,
                "session": session,
            }
        )

    # PERMANENT TERMINATION

    if (
        action
        == LiveModerationAction.ACTION_PERMANENT_TERMINATION
    ):

        existing = (
            LiveModerationAction.objects
            .filter(
                session=session,
                action=action,
            )
            .exists()
        )

        if existing:

            return _error(
                "Live has already been permanently terminated.",
                status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        moderation_action = (
            LiveModerationAction.objects.create(
                session=session,
                moderator=user,
                action=action,
                reason=reason,
                note=note,
                is_active=True,
                expires_at=None,
            )
        )

        session.is_live = False
        session.is_shutdown = False
        session.shutdown_at = None
        session.shutdown_expires_at = None
        session.shutdown_reason = ""
        session.ended_at = now

        session.save(
            update_fields=[
                "is_live",
                "is_shutdown",
                "shutdown_at",
                "shutdown_expires_at",
                "shutdown_reason",
                "ended_at",
            ],
        )

        # REMOVE VIEWERS

        LiveViewer.objects.filter(
            session=session,
        ).delete()

        return _success(
            {
                "message": (
                    "Live has been permanently "
                    "terminated."
                ),
                "action": moderation_action,
                "session": session,
            }
        )

    return _error(
        "Unable to apply live moderation action.",
        status.HTTP_400_BAD_REQUEST,
    )


# ============================================================
# END LIVE MODERATION ACTION
# ============================================================


@transaction.atomic
def end_live_moderation_action(
    *,
    user,
    action_id,
):
    """
    Manually end an active moderation action.

    Permanent termination cannot be reversed.
    """

    moderation_action = (
        LiveModerationAction.objects
        .select_related(
            "session",
        )
        .select_for_update()
        .filter(
            id=action_id,
            is_active=True,
        )
        .first()
    )

    if moderation_action is None:

        return _error(
            "Active moderation action not found.",
            status.HTTP_404_NOT_FOUND,
        )

    session = moderation_action.session

    if not is_platform_moderator(
        user,
    ):

        return _error(
            "You do not have permission to manage moderation actions.",
            status.HTTP_403_FORBIDDEN,
        )

    # PERMANENT TERMINATION

    if (
        moderation_action.action
        == LiveModerationAction.ACTION_PERMANENT_TERMINATION
    ):

        return _error(
            "Permanent termination cannot be reversed.",
            status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()

    moderation_action.is_active = False
    moderation_action.ended_at = now

    moderation_action.save(
        update_fields=[
            "is_active",
            "ended_at",
            "updated_at",
        ],
    )

    # RESTORE TEMPORARY SHUTDOWN

    if (
        moderation_action.action
        == LiveModerationAction.ACTION_TEMPORARY_SHUTDOWN
    ):

        if session.is_live:

            session.is_shutdown = False
            session.shutdown_at = None
            session.shutdown_expires_at = None
            session.shutdown_reason = ""

            session.save(
                update_fields=[
                    "is_shutdown",
                    "shutdown_at",
                    "shutdown_expires_at",
                    "shutdown_reason",
                ],
            )

    return _success(
        {
            "message": "Moderation action ended successfully.",
            "action": moderation_action,
            "session": session,
        }
    )


# ============================================================
# GET LIVE MODERATION ACTIONS
# ============================================================


def get_live_moderation_actions(
    *,
    user,
    session_id,
):
    """
    Return moderation actions for a live.

    Only platform moderators and superusers can view them.
    """

    session = (
        LiveSession.objects
        .filter(
            id=session_id,
        )
        .first()
    )

    if session is None:

        return _error(
            "Live session not found.",
            status.HTTP_404_NOT_FOUND,
        )

    if not is_platform_moderator(
        user,
    ):

        return _error(
            "You do not have permission to view live moderation actions.",
            status.HTTP_403_FORBIDDEN,
        )

    normalize_live_shutdown(
        session=session,
    )

    actions = list(
        LiveModerationAction.objects
        .filter(
            session=session,
        )
        .select_related(
            "moderator",
        )
        .order_by(
            "-created_at",
        )
    )

    return _success(
        actions,
    )


# ============================================================
# BLOCK HELPERS
# ============================================================


def users_blocked_each_other(
    user_a,
    user_b,
):
    """
    Return True when either user has blocked the other.

    Blocks are treated as bidirectional for live visibility
    and access.
    """

    if user_a.id == user_b.id:

        return False

    return Block.objects.filter(
        Q(
            blocker=user_a,
            blocked=user_b,
        )
        |
        Q(
            blocker=user_b,
            blocked=user_a,
        )
    ).exists()


# ============================================================
# LIVE SESSION ACCESS
# ============================================================


def get_live_session_for_user(
    *,
    session_id,
    user,
):
    """
    Resolve a live session while enforcing:

        - account moderation
        - shutdown state
        - permanent termination
        - block rules
    """

    access_error = get_live_access_block_reason(
        user,
    )

    if access_error:

        return _error(
            access_error,
            status.HTTP_403_FORBIDDEN,
        )

    session = (
        LiveSession.objects
        .select_related(
            "streamer",
        )
        .filter(
            id=session_id,
            is_live=True,
        )
        .first()
    )

    if session is None:

        return _error(
            "Session not live.",
            status.HTTP_404_NOT_FOUND,
        )

    # NORMALIZE SHUTDOWN

    session = normalize_live_shutdown(
        session=session,
    )

    # PERMANENT TERMINATION

    if is_live_permanently_terminated(
        session=session,
    ):

        return _error(
            "This live session has been permanently terminated.",
            status.HTTP_403_FORBIDDEN,
        )

    # TEMPORARY SHUTDOWN

    if session.is_shutdown:

        return _error(
            "This live session is temporarily unavailable.",
            status.HTTP_403_FORBIDDEN,
        )

    # STREAMER

    if session.streamer_id == user.id:

        return _success(
            session,
        )

    # BLOCK CHECK

    if users_blocked_each_other(
        user,
        session.streamer,
    ):

        return _error(
            "You cannot access this live session.",
            status.HTTP_403_FORBIDDEN,
        )

    return _success(
        session,
    )


# ============================================================
# LIVE ADMIN HELPERS
# ============================================================


def can_be_live_admin(
    *,
    broadcaster,
    user,
):
    """
    Return True when a user can become a persistent live admin.
    """

    if broadcaster.id == user.id:

        return False

    if not user.is_active:

        return False

    moderation = get_active_user_moderation(
        user,
    )

    if moderation is not None:

        if moderation.is_banned:

            return False

        if moderation.is_suspended:

            return False

        if moderation.is_restricted:

            return False

    if users_blocked_each_other(
        broadcaster,
        user,
    ):

        return False

    return True


def is_permanent_live_admin(
    *,
    session,
    user,
):
    """
    Return True when the user has a permanent admin
    assignment from the broadcaster.
    """

    if session.streamer_id == user.id:

        return False

    return (
        BroadcasterLiveAdmin.objects
        .filter(
            broadcaster_id=session.streamer_id,
            user_id=user.id,
        )
        .exists()
    )


def is_active_live_admin(
    *,
    session,
    user,
):
    """
    Return True when the user is a permanent admin and
    is currently joined in the live.
    """

    if session.streamer_id == user.id:

        return False

    assignment_exists = (
        BroadcasterLiveAdmin.objects
        .filter(
            broadcaster_id=session.streamer_id,
            user_id=user.id,
        )
        .exists()
    )

    if not assignment_exists:

        return False

    return (
        LiveViewer.objects
        .filter(
            session=session,
            user_id=user.id,
        )
        .exists()
    )


# ============================================================
# START LIVE
# ============================================================


@transaction.atomic
def start_live_session(
    *,
    user,
    title="",
):
    """
    Create a new live session.

    Permanent admin assignments are not copied into the
    session. They automatically become active when they
    join the live.
    """

    # ACCOUNT STATUS

    if not user.is_active:

        return _error(
            "Your account is not active.",
            status.HTTP_403_FORBIDDEN,
        )

    # ACCOUNT MODERATION

    moderation_error = get_live_start_block_reason(
        user,
    )

    if moderation_error:

        return _error(
            moderation_error,
            status.HTTP_403_FORBIDDEN,
        )

    # TITLE

    if title is None:

        title = ""

    if not isinstance(
        title,
        str,
    ):

        return _error(
            "Live title must be text.",
            status.HTTP_400_BAD_REQUEST,
        )

    title = title.strip()

    if len(title) > 255:

        return _error(
            "Live title cannot exceed 255 characters.",
            status.HTTP_400_BAD_REQUEST,
        )

    # LOCK USER

    user.__class__.objects.select_for_update().get(
        pk=user.pk,
    )

    # EXISTING LIVE

    existing_session = (
        LiveSession.objects
        .select_for_update()
        .filter(
            streamer_id=user.id,
            is_live=True,
        )
        .first()
    )

    if existing_session is not None:

        return _error(
            "Already live.",
            status.HTTP_400_BAD_REQUEST,
        )

    # CREATE

    now = timezone.now()

    session = LiveSession.objects.create(
        streamer=user,
        title=title,
        is_live=True,
        started_at=now,
        last_heartbeat=now,
    )

    return _success(
        session,
    )


# ============================================================
# END LIVE
# ============================================================


@transaction.atomic
def end_live_session(
    *,
    user,
    session_id,
):
    """
    End a live session owned by the broadcaster.

    Permanent admin assignments remain active for future
    live sessions.
    """

    session = (
        LiveSession.objects
        .select_for_update()
        .filter(
            id=session_id,
            streamer=user,
        )
        .first()
    )

    if session is None:

        return _error(
            "Session not found.",
            status.HTTP_404_NOT_FOUND,
        )

    if not session.is_live:

        return _error(
            "Live session has already ended.",
            status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()

    session.is_live = False
    session.is_shutdown = False
    session.shutdown_at = None
    session.shutdown_expires_at = None
    session.shutdown_reason = ""
    session.ended_at = now

    session.save(
        update_fields=[
            "is_live",
            "is_shutdown",
            "shutdown_at",
            "shutdown_expires_at",
            "shutdown_reason",
            "ended_at",
        ],
    )

    # REMOVE VIEWERS

    LiveViewer.objects.filter(
        session=session,
    ).delete()

    return _success(
        {
            "message": "Live ended successfully.",
            "session": session,
        }
    )


# ============================================================
# LIVE HEARTBEAT
# ============================================================


def update_live_heartbeat(
    *,
    user,
    session_id,
):
    """
    Update heartbeat of an active live session.

    Only broadcaster can send heartbeat.
    Account moderation is checked on every heartbeat.
    """

    moderation_error = get_live_start_block_reason(
        user,
    )

    if moderation_error:

        return _error(
            moderation_error,
            status.HTTP_403_FORBIDDEN,
        )

    session = (
        LiveSession.objects
        .filter(
            id=session_id,
            streamer=user,
            is_live=True,
        )
        .first()
    )

    if session is None:

        return _error(
            "Session not live.",
            status.HTTP_404_NOT_FOUND,
        )

    session = normalize_live_shutdown(
        session=session,
    )

    if session.is_shutdown:

        return _error(
            "This live session is temporarily shut down.",
            status.HTTP_403_FORBIDDEN,
        )

    if is_live_permanently_terminated(
        session=session,
    ):

        return _error(
            "This live session has been permanently terminated.",
            status.HTTP_403_FORBIDDEN,
        )

    session.last_heartbeat = timezone.now()

    session.save(
        update_fields=[
            "last_heartbeat",
        ],
    )

    return _success(
        {
            "message": "Heartbeat OK.",
            "session": session,
        }
    )


# ============================================================
# LIVE SESSION LIST
# ============================================================


def get_live_sessions_for_user(
    *,
    user,
):
    """
    Return live sessions visible to the current user.

    Rules:

        - banned/suspended users cannot access lives
        - temporary shutdown lives are hidden
        - permanently terminated lives are hidden
        - blocked streamers are hidden
        - own live remains visible
        - kicked viewers can still see the live in this list
    """

    access_error = get_live_access_block_reason(
        user,
    )

    if access_error:

        return _error(
            access_error,
            status.HTTP_403_FORBIDDEN,
        )

    sessions = (
        LiveSession.objects
        .select_related(
            "streamer",
        )
        .filter(
            is_live=True,
        )
        .order_by(
            "-started_at",
        )
    )

    visible_sessions = []

    for session in sessions:

        session = normalize_live_shutdown(
            session=session,
        )

        if is_live_permanently_terminated(
            session=session,
        ):

            continue

        if session.is_shutdown:

            continue

        # OWN LIVE

        if session.streamer_id == user.id:

            visible_sessions.append(
                session,
            )

            continue

        # BLOCK

        if users_blocked_each_other(
            user,
            session.streamer,
        ):

            continue

        visible_sessions.append(
            session,
        )

    # OWN LIVE FIRST

    own_session = next(
        (
            session
            for session
            in visible_sessions
            if session.streamer_id == user.id
        ),
        None,
    )

    if own_session is not None:

        visible_sessions.remove(
            own_session,
        )

        visible_sessions.insert(
            0,
            own_session,
        )

    return _success(
        visible_sessions,
    )


# ============================================================
# JOIN LIVE
# ============================================================


@transaction.atomic
def join_live_session(
    *,
    user,
    session_id,
):
    """
    Join a live session as a viewer.

    Broadcaster does not get a LiveViewer record.

    A kicked viewer cannot rejoin the same live session.

    A permanent admin automatically becomes an active admin
    because the user is now present in LiveViewer.
    """

    access_error = get_live_access_block_reason(
        user,
    )

    if access_error:

        return _error(
            access_error,
            status.HTTP_403_FORBIDDEN,
        )

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER

    if session.streamer_id == user.id:

        return _success(
            {
                "message": "Streamer is already in this live.",
                "session": session,
                "created": False,
                "is_admin": False,
            }
        )

    # KICK CHECK

    if LiveKickedViewer.objects.filter(
        session=session,
        user=user,
    ).exists():

        return _error(
            "You have been kicked from this live session.",
            status.HTTP_403_FORBIDDEN,
        )

    # VIEWER

    viewer, created = LiveViewer.objects.get_or_create(
        session=session,
        user=user,
    )

    # ACTIVE ADMIN STATUS

    is_admin = is_active_live_admin(
        session=session,
        user=user,
    )

    return _success(
        {
            "message": "Joined live successfully.",
            "session": session,
            "viewer": viewer,
            "created": created,
            "is_admin": is_admin,
        }
    )


# ============================================================
# LEAVE LIVE
# ============================================================


def leave_live_session(
    *,
    user,
    session_id,
):
    """
    Remove current user from live viewer list.

    Permanent admin assignment remains untouched.

    Leaving the live automatically makes a permanent admin
    inactive for this live because the LiveViewer record is
    removed.
    """

    deleted_count, _ = (
        LiveViewer.objects
        .filter(
            session_id=session_id,
            user=user,
        )
        .delete()
    )

    return _success(
        {
            "message": "Left live successfully.",
            "removed": deleted_count > 0,
        }
    )


# ============================================================
# LIVE PARTICIPANT HELPERS
# ============================================================


def get_live_viewer(
    *,
    session,
    user,
):
    """
    Return a viewer record.
    """

    return (
        LiveViewer.objects
        .filter(
            session=session,
            user=user,
        )
        .first()
    )


def is_live_broadcaster(
    *,
    session,
    user,
):
    """
    Return True when user is broadcaster.
    """

    return session.streamer_id == user.id


def is_live_moderator(
    *,
    session,
    user,
):
    """
    Return True when user is an active permanent admin
    currently present in the live.

    This function name is retained for compatibility with
    existing callers.
    """

    return is_active_live_admin(
        session=session,
        user=user,
    )


def can_manage_live(
    *,
    session,
    user,
):
    """
    Broadcaster and active permanent admins can manage
    viewer-level live actions.

    Platform-level moderation is handled separately.
    """

    if is_live_broadcaster(
        session=session,
        user=user,
    ):

        return True

    return is_active_live_admin(
        session=session,
        user=user,
    )


def get_live_moderator(
    *,
    session,
    user,
):
    """
    Return the permanent admin assignment when the user
    is currently active in the live.

    This function name is retained for compatibility.
    """

    if not is_active_live_admin(
        session=session,
        user=user,
    ):

        return None

    return (
        BroadcasterLiveAdmin.objects
        .filter(
            broadcaster_id=session.streamer_id,
            user_id=user.id,
        )
        .select_related(
            "user",
            "broadcaster",
        )
        .first()
    )


# ============================================================
# LIST LIVE VIEWERS
# ============================================================


def get_live_viewers(
    *,
    user,
    session_id,
):
    """
    Return viewers of a live.

    Broadcaster, active live admins, and current viewers
    can see the viewer list.

    Viewer management permissions remain separate.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER

    is_broadcaster = is_live_broadcaster(
        session=session,
        user=user,
    )

    # LIVE ADMIN

    is_admin = is_active_live_admin(
        session=session,
        user=user,
    )

    # CURRENT VIEWER

    is_viewer = (
        LiveViewer.objects
        .filter(
            session=session,
            user=user,
        )
        .exists()
    )

    if not (
        is_broadcaster
        or is_admin
        or is_viewer
    ):

        return _error(
            "You must join the live before viewing viewers.",
            status.HTTP_403_FORBIDDEN,
        )

    viewers = list(
        LiveViewer.objects
        .filter(
            session=session,
        )
        .select_related(
            "user",
        )
        .order_by(
            "joined_at",
        )
    )

    # REMOVE BLOCKED USERS

    visible_viewers = []

    for viewer in viewers:

        if users_blocked_each_other(
            user,
            viewer.user,
        ):

            continue

        visible_viewers.append(
            viewer,
        )

    return _success(
        visible_viewers,
    )


# ============================================================
# MUTE VIEWER
# ============================================================


@transaction.atomic
def mute_live_viewer(
    *,
    user,
    session_id,
    viewer_user_id,
    duration_minutes=None,
):
    """
    Mute a viewer from sending live chat messages.

    Broadcaster and active live admins can mute viewers.

    A live admin cannot mute the broadcaster.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    if not can_manage_live(
        session=session,
        user=user,
    ):

        return _error(
            "You do not have permission to mute viewers.",
            status.HTTP_403_FORBIDDEN,
        )

    viewer = (
        LiveViewer.objects
        .select_for_update()
        .filter(
            session=session,
            user_id=viewer_user_id,
        )
        .first()
    )

    if viewer is None:

        return _error(
            "Viewer is not in this live.",
            status.HTTP_404_NOT_FOUND,
        )

    if session.streamer_id == viewer.user_id:

        return _error(
            "The broadcaster cannot be muted.",
            status.HTTP_403_FORBIDDEN,
        )

    # BLOCKED TARGET

    if users_blocked_each_other(
        user,
        viewer.user,
    ):

        return _error(
            "You cannot manage a blocked user.",
            status.HTTP_403_FORBIDDEN,
        )

    # DURATION

    if duration_minutes is not None:

        if (
            not isinstance(
                duration_minutes,
                int,
            )
            or isinstance(
                duration_minutes,
                bool,
            )
            or duration_minutes <= 0
        ):

            return _error(
                "Mute duration must be a positive integer.",
                status.HTTP_400_BAD_REQUEST,
            )

    now = timezone.now()

    viewer.is_muted = True
    viewer.muted_at = now

    if duration_minutes is None:

        viewer.mute_expires_at = None

    else:

        viewer.mute_expires_at = (
            now
            + timezone.timedelta(
                minutes=duration_minutes,
            )
        )

    viewer.save(
        update_fields=[
            "is_muted",
            "muted_at",
            "mute_expires_at",
        ],
    )

    return _success(
        {
            "message": "Viewer muted successfully.",
            "viewer": viewer,
        }
    )


# ============================================================
# UNMUTE VIEWER
# ============================================================


@transaction.atomic
def unmute_live_viewer(
    *,
    user,
    session_id,
    viewer_user_id,
):
    """
    Remove chat mute from a viewer.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    if not can_manage_live(
        session=session,
        user=user,
    ):

        return _error(
            "You do not have permission to unmute viewers.",
            status.HTTP_403_FORBIDDEN,
        )

    viewer = (
        LiveViewer.objects
        .select_for_update()
        .filter(
            session=session,
            user_id=viewer_user_id,
        )
        .first()
    )

    if viewer is None:

        return _error(
            "Viewer is not in this live.",
            status.HTTP_404_NOT_FOUND,
        )

    viewer.is_muted = False
    viewer.muted_at = None
    viewer.mute_expires_at = None

    viewer.save(
        update_fields=[
            "is_muted",
            "muted_at",
            "mute_expires_at",
        ],
    )

    return _success(
        {
            "message": "Viewer unmuted successfully.",
            "viewer": viewer,
        }
    )


# ============================================================
# CHECK VIEWER CHAT MUTE
# ============================================================


def is_live_viewer_muted(
    *,
    viewer,
):
    """
    Return True when viewer currently cannot send messages.

    Expired temporary mute is automatically cleared.
    """

    if not viewer.is_muted:

        return False

    if viewer.mute_expires_at is None:

        return True

    now = timezone.now()

    if viewer.mute_expires_at <= now:

        viewer.is_muted = False
        viewer.muted_at = None
        viewer.mute_expires_at = None

        viewer.save(
            update_fields=[
                "is_muted",
                "muted_at",
                "mute_expires_at",
            ],
        )

        return False

    return True


# ============================================================
# KICK VIEWER
# ============================================================


@transaction.atomic
def kick_live_viewer(
    *,
    user,
    session_id,
    viewer_user_id,
):
    """
    Remove a viewer from the current live.

    Broadcaster and active live admins can kick viewers.

    Kick is temporary and applies only to the current
    LiveSession.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    if not can_manage_live(
        session=session,
        user=user,
    ):

        return _error(
            "You do not have permission to kick viewers.",
            status.HTTP_403_FORBIDDEN,
        )

    viewer = (
        LiveViewer.objects
        .select_for_update()
        .filter(
            session=session,
            user_id=viewer_user_id,
        )
        .select_related(
            "user",
        )
        .first()
    )

    if viewer is None:

        return _error(
            "Viewer is not in this live.",
            status.HTTP_404_NOT_FOUND,
        )

    if session.streamer_id == viewer.user_id:

        return _error(
            "The broadcaster cannot be kicked.",
            status.HTTP_403_FORBIDDEN,
        )

    if users_blocked_each_other(
        user,
        viewer.user,
    ):

        return _error(
            "You cannot manage a blocked user.",
            status.HTTP_403_FORBIDDEN,
        )

    # RECORD KICK

    LiveKickedViewer.objects.get_or_create(
        session=session,
        user=viewer.user,
    )

    # REMOVE VIEWER

    viewer.delete()

    return _success(
        {
            "message": "Viewer kicked from the live.",
            "user_id": viewer_user_id,
        }
    )


# ============================================================
# BLOCK VIEWER
# ============================================================


@transaction.atomic
def block_live_viewer(
    *,
    user,
    session_id,
    viewer_user_id,
):
    """
    Permanently block a viewer from the broadcaster's
    social relationship.

    Only broadcaster can use this function.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER ONLY

    if session.streamer_id != user.id:

        return _error(
            "Only the broadcaster can block viewers.",
            status.HTTP_403_FORBIDDEN,
        )

    # SELF

    if viewer_user_id == user.id:

        return _error(
            "You cannot block yourself.",
            status.HTTP_400_BAD_REQUEST,
        )

    # VIEWER

    viewer = (
        LiveViewer.objects
        .filter(
            session=session,
            user_id=viewer_user_id,
        )
        .first()
    )

    if viewer is None:

        return _error(
            "Viewer is not in this live.",
            status.HTTP_404_NOT_FOUND,
        )

    # BLOCK

    block, created = Block.objects.get_or_create(
        blocker=user,
        blocked_id=viewer_user_id,
    )

    # REMOVE VIEWER

    LiveViewer.objects.filter(
        session=session,
        user_id=viewer_user_id,
    ).delete()

    # REMOVE PERMANENT ADMIN ASSIGNMENT

    BroadcasterLiveAdmin.objects.filter(
        broadcaster=user,
        user_id=viewer_user_id,
    ).delete()

    return _success(
        {
            "message": (
                "Viewer blocked and removed "
                "from the live."
            ),
            "block": block,
            "created": created,
        }
    )


# ============================================================
# ASSIGN LIVE ADMIN
# ============================================================


@transaction.atomic
def assign_live_moderator(
    *,
    user,
    session_id,
    moderator_user_id,
):
    """
    Assign a permanent live admin.

    The assignment survives the current live session and
    automatically applies to future live sessions.

    The user becomes an active admin only when they are
    currently present in LiveViewer.

    Only broadcaster can assign a live admin.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER ONLY

    if session.streamer_id != user.id:

        return _error(
            "Only the broadcaster can assign a live admin.",
            status.HTTP_403_FORBIDDEN,
        )

    # SELF

    if moderator_user_id == user.id:

        return _error(
            "The broadcaster is already the owner of the live.",
            status.HTTP_400_BAD_REQUEST,
        )

    UserModel = user.__class__

    moderator_user = (
        UserModel.objects
        .filter(
            id=moderator_user_id,
            is_active=True,
        )
        .first()
    )

    if moderator_user is None:

        return _error(
            "Live admin user not found.",
            status.HTTP_404_NOT_FOUND,
        )

    # ACCOUNT MODERATION

    if not can_be_live_admin(
        broadcaster=user,
        user=moderator_user,
    ):

        moderation = get_active_user_moderation(
            moderator_user,
        )

        if moderation is not None:

            if moderation.is_banned:

                return _error(
                    "Banned users cannot be assigned as live admin.",
                    status.HTTP_403_FORBIDDEN,
                )

            if moderation.is_suspended:

                return _error(
                    "Suspended users cannot be assigned as live admin.",
                    status.HTTP_403_FORBIDDEN,
                )

            if moderation.is_restricted:

                return _error(
                    "Restricted users cannot be assigned as live admin.",
                    status.HTTP_403_FORBIDDEN,
                )

        if users_blocked_each_other(
            user,
            moderator_user,
        ):

            return _error(
                "Blocked users cannot be assigned as live admin.",
                status.HTTP_403_FORBIDDEN,
            )

        return _error(
            "This user cannot be assigned as live admin.",
            status.HTTP_403_FORBIDDEN,
        )

    # PERSISTENT ASSIGNMENT

    persistent_assignment, assignment_created = (
        BroadcasterLiveAdmin.objects.get_or_create(
            broadcaster=user,
            user=moderator_user,
        )
    )

    # CURRENT ACTIVE STATUS

    is_active = (
        LiveViewer.objects
        .filter(
            session=session,
            user=moderator_user,
        )
        .exists()
    )

    return _success(
        {
            "message": "Live admin assigned successfully.",
            "assignment": persistent_assignment,
            "assignment_created": assignment_created,
            "is_active": is_active,
        }
    )


# ============================================================
# REMOVE LIVE ADMIN
# ============================================================


@transaction.atomic
def remove_live_moderator(
    *,
    user,
    session_id,
    moderator_user_id,
):
    """
    Permanently de-assign a live admin.

    The persistent broadcaster/admin relationship is deleted.

    If the admin is currently in the live, they automatically
    lose admin permissions because the permanent assignment
    no longer exists.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER ONLY

    if session.streamer_id != user.id:

        return _error(
            "Only the broadcaster can remove a live admin.",
            status.HTTP_403_FORBIDDEN,
        )

    # PERSISTENT ASSIGNMENT

    assignment = (
        BroadcasterLiveAdmin.objects
        .filter(
            broadcaster=user,
            user_id=moderator_user_id,
        )
        .first()
    )

    if assignment is None:

        return _error(
            "Live admin assignment not found.",
            status.HTTP_404_NOT_FOUND,
        )

    # REMOVE PERMANENT ASSIGNMENT

    assignment.delete()

    return _success(
        {
            "message": "Live admin de-assigned successfully.",
            "user_id": moderator_user_id,
        }
    )


# ============================================================
# GET LIVE ADMINS
# ============================================================


def get_live_moderators(
    *,
    user,
    session_id,
):
    """
    Return active live admins according to privacy rules.

    Permanent assignment comes from BroadcasterLiveAdmin.

    Current live presence comes from LiveViewer.

    Therefore only users who satisfy both conditions are
    returned as active live admins.

    Broadcaster:
        Returns all permanent admins currently watching
        this live.

    Active live admin:
        Returns only their own active admin assignment.

    Normal viewer:
        Returns an empty list.

    Admin identity is never exposed to normal viewers.
    """

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER

    if is_live_broadcaster(
        session=session,
        user=user,
    ):

        active_viewer_ids = (
            LiveViewer.objects
            .filter(
                session=session,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

        assignments = list(
            BroadcasterLiveAdmin.objects
            .filter(
                broadcaster_id=session.streamer_id,
                user_id__in=active_viewer_ids,
            )
            .select_related(
                "user",
                "broadcaster",
            )
            .order_by(
                "assigned_at",
            )
        )

        visible_admins = []

        for assignment in assignments:

            if not can_be_live_admin(
                broadcaster=session.streamer,
                user=assignment.user,
            ):

                continue

            if users_blocked_each_other(
                user,
                assignment.user,
            ):

                continue

            visible_admins.append(
                assignment,
            )

        return _success(
            visible_admins,
        )

    # ACTIVE LIVE ADMIN

    if is_active_live_admin(
        session=session,
        user=user,
    ):

        assignment = (
            BroadcasterLiveAdmin.objects
            .filter(
                broadcaster_id=session.streamer_id,
                user=user,
            )
            .select_related(
                "user",
                "broadcaster",
            )
            .first()
        )

        if assignment is not None:

            return _success(
                [
                    assignment,
                ]
            )

    # NORMAL VIEWER

    return _success(
        [],
    )


# ============================================================
# MESSAGE VALIDATION
# ============================================================


def validate_live_message(
    message,
):
    """
    Validate, normalize, and moderate a live chat message.

    The profanity/content moderation filter is applied here
    before the message reaches the database.

    This keeps message moderation centralized so both REST
    and WebSocket callers using this service receive the
    same filtering behavior.
    """

    # TYPE

    if not isinstance(
        message,
        str,
    ):

        return _error(
            "Message must be text.",
            status.HTTP_400_BAD_REQUEST,
        )

    # NORMALIZE

    message = message.strip()

    # EMPTY

    if not message:

        return _error(
            "Message cannot be empty.",
            status.HTTP_400_BAD_REQUEST,
        )

    # LENGTH

    if len(message) > 5000:

        return _error(
            "Message cannot exceed 5000 characters.",
            status.HTTP_400_BAD_REQUEST,
        )

    # PROFANITY / CONTENT MODERATION

    moderation_result = moderate_live_message(
        message,
    )

    if not moderation_result.get(
        "allowed",
        False,
    ):

        return _error(
            moderation_result.get(
                "message",
                "This message contains prohibited language.",
            ),
            status.HTTP_400_BAD_REQUEST,
        )

    # FILTERED / NORMALIZED MESSAGE

    filtered_message = moderation_result.get(
        "message",
        message,
    )

    if not isinstance(
        filtered_message,
        str,
    ):

        filtered_message = message

    filtered_message = filtered_message.strip()

    if not filtered_message:

        return _error(
            "Message cannot be empty.",
            status.HTTP_400_BAD_REQUEST,
        )

    return _success(
        filtered_message,
    )


# ============================================================
# SEND LIVE MESSAGE
# ============================================================


def send_live_message(
    *,
    user,
    session_id,
    message,
):
    """
    Create a live chat message.

    Broadcaster can send messages.

    Viewer can send messages only when:

        - they are currently in the live
        - they are not muted
        - live chat is not platform-restricted
        - message passes the live content filter
    """

    # VALIDATE + MODERATE MESSAGE

    validation = validate_live_message(
        message,
    )

    if not validation["success"]:

        return validation

    message_text = validation["data"]

    # ACCOUNT ACCESS

    access_error = get_live_access_block_reason(
        user,
    )

    if access_error:

        return _error(
            access_error,
            status.HTTP_403_FORBIDDEN,
        )

    # SESSION

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BLOCK SAFETY

    if (
        session.streamer_id != user.id
        and users_blocked_each_other(
            user,
            session.streamer,
        )
    ):

        return _error(
            "You cannot send messages in this live.",
            status.HTTP_403_FORBIDDEN,
        )

    # CHAT RESTRICTION

    chat_restricted = is_live_chat_restricted(
        session=session,
    )

    # BROADCASTER

    if session.streamer_id == user.id:

        if chat_restricted:

            return _error(
                "Live chat is currently restricted.",
                status.HTTP_403_FORBIDDEN,
            )

        live_message = LiveMessage.objects.create(
            session=session,
            user=user,
            message=message_text,
        )

        return _success(
            live_message,
        )

    # VIEWER

    viewer = get_live_viewer(
        session=session,
        user=user,
    )

    if viewer is None:

        return _error(
            "You must join the live before sending messages.",
            status.HTTP_403_FORBIDDEN,
        )

    # CHAT RESTRICTION

    if chat_restricted:

        return _error(
            "Live chat is currently restricted.",
            status.HTTP_403_FORBIDDEN,
        )

    # MUTE

    if is_live_viewer_muted(
        viewer=viewer,
    ):

        return _error(
            "You are muted and cannot send messages.",
            status.HTTP_403_FORBIDDEN,
        )

    # CREATE

    live_message = LiveMessage.objects.create(
        session=session,
        user=user,
        message=message_text,
    )

    return _success(
        live_message,
    )


# ============================================================
# GET LIVE MESSAGES
# ============================================================


def get_live_messages(
    *,
    user,
    session_id,
):
    """
    Return messages for a live session.

    Broadcaster and current viewers can read messages.

    Chat restriction does not prevent reading messages.
    """

    access_error = get_live_access_block_reason(
        user,
    )

    if access_error:

        return _error(
            access_error,
            status.HTTP_403_FORBIDDEN,
        )

    # SESSION

    result = get_live_session_for_user(
        session_id=session_id,
        user=user,
    )

    if not result["success"]:

        return result

    session = result["data"]

    # BROADCASTER

    if session.streamer_id == user.id:

        pass

    else:

        # VIEWER

        viewer = get_live_viewer(
            session=session,
            user=user,
        )

        if viewer is None:

            return _error(
                "You must join the live before viewing messages.",
                status.HTTP_403_FORBIDDEN,
            )

    # MESSAGES

    messages = list(
        LiveMessage.objects
        .filter(
            session=session,
        )
        .select_related(
            "user",
        )
        .order_by(
            "created_at",
        )
    )

    return _success(
        messages,
    )