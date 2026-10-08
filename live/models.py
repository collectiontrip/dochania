
from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL


# ============================================================
# LIVE SESSION
# ============================================================


class LiveSession(models.Model):

    streamer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="live_sessions",
    )

    title = models.CharField(
        max_length=255,
        blank=True,
    )

    is_live = models.BooleanField(
        default=True,
    )

    started_at = models.DateTimeField(
        auto_now_add=True,
    )

    ended_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_heartbeat = models.DateTimeField(
        null=True,
        blank=True,
    )

    # --------------------------------------------------------
    # MODERATOR SHUTDOWN
    # --------------------------------------------------------

    is_shutdown = models.BooleanField(
        default=False,
    )

    shutdown_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    shutdown_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    shutdown_reason = models.CharField(
        max_length=40,
        blank=True,
    )

    def __str__(self):

        return (
            f"{self.streamer} - "
            f"{'LIVE' if self.is_live else 'OFF'}"
        )


# ============================================================
# LIVE MESSAGE
# ============================================================


class LiveMessage(models.Model):

    session = models.ForeignKey(
        LiveSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )

    message = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):

        return (
            f"{self.user}: "
            f"{self.message[:20]}"
        )


# ============================================================
# LIVE VIEWER
# ============================================================


class LiveViewer(models.Model):

    session = models.ForeignKey(
        LiveSession,
        on_delete=models.CASCADE,
        related_name="viewers",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )

    joined_at = models.DateTimeField(
        auto_now_add=True,
    )

    # --------------------------------------------------------
    # CHAT MUTE
    # --------------------------------------------------------

    is_muted = models.BooleanField(
        default=False,
    )

    muted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    mute_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "session",
                    "user",
                ],
                name="unique_live_viewer",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "session",
                    "user",
                ],
            ),
        ]

    def __str__(self):

        return (
            f"{self.user} watching "
            f"{self.session.id}"
        )


# ============================================================
# LIVE KICKED VIEWER
# ============================================================


class LiveKickedViewer(models.Model):

    session = models.ForeignKey(
        LiveSession,
        on_delete=models.CASCADE,
        related_name="kicked_viewers",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="live_kicks",
    )

    kicked_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "session",
                    "user",
                ],
                name="unique_live_kicked_viewer",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "session",
                    "user",
                ],
            ),
            models.Index(
                fields=[
                    "user",
                    "kicked_at",
                ],
            ),
        ]

    def __str__(self):

        return (
            f"{self.user} kicked from "
            f"Live {self.session.id}"
        )


# ============================================================
# BROADCASTER LIVE ADMIN
# ============================================================


class BroadcasterLiveAdmin(models.Model):

    broadcaster = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="live_admins",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="broadcaster_admin_roles",
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "broadcaster",
                    "user",
                ],
                name="unique_broadcaster_live_admin",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "broadcaster",
                    "user",
                ],
            ),
            models.Index(
                fields=[
                    "user",
                ],
            ),
        ]

    def __str__(self):

        return (
            f"{self.user} - "
            f"Live Admin of {self.broadcaster}"
        )


# ============================================================
# LIVE MODERATOR
# ============================================================


class LiveModerator(models.Model):

    # --------------------------------------------------------
    # ROLE TYPES
    # --------------------------------------------------------

    ROLE_BROADCASTER_ADMIN = "broadcaster_admin"

    ROLE_LIVE_MODERATOR = "live_moderator"

    ROLE_CHOICES = [
        (
            ROLE_BROADCASTER_ADMIN,
            "Broadcaster Admin",
        ),
        (
            ROLE_LIVE_MODERATOR,
            "Live Moderator",
        ),
    ]

    # --------------------------------------------------------
    # SESSION
    # --------------------------------------------------------

    session = models.ForeignKey(
        LiveSession,
        on_delete=models.CASCADE,
        related_name="moderators",
    )

    # --------------------------------------------------------
    # USER
    # --------------------------------------------------------

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="live_moderator_roles",
    )

    # --------------------------------------------------------
    # LIVE ROLE
    # --------------------------------------------------------

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default=ROLE_LIVE_MODERATOR,
    )

    # --------------------------------------------------------
    # ASSIGNED BY
    # --------------------------------------------------------

    assigned_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assigned_live_moderators",
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
    )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "session",
                    "user",
                ],
                name="unique_live_moderator",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "session",
                    "user",
                ],
            ),
            models.Index(
                fields=[
                    "session",
                    "is_active",
                ],
            ),
            models.Index(
                fields=[
                    "session",
                    "role",
                    "is_active",
                ],
            ),
        ]

    def __str__(self):

        return (
            f"{self.user} - "
            f"{self.role} - "
            f"Live {self.session.id}"
        )


# ============================================================
# LIVE MODERATION ACTION
# ============================================================


class LiveModerationAction(models.Model):

    # --------------------------------------------------------
    # ACTION TYPES
    # --------------------------------------------------------

    ACTION_WARNING = "warning"

    ACTION_CHAT_RESTRICTED = "chat_restricted"

    ACTION_TEMPORARY_SHUTDOWN = "temporary_shutdown"

    ACTION_PERMANENT_TERMINATION = "permanent_termination"

    ACTION_CHOICES = [
        (
            ACTION_WARNING,
            "Warning",
        ),
        (
            ACTION_CHAT_RESTRICTED,
            "Chat Restricted",
        ),
        (
            ACTION_TEMPORARY_SHUTDOWN,
            "Temporary Shutdown",
        ),
        (
            ACTION_PERMANENT_TERMINATION,
            "Permanent Termination",
        ),
    ]

    # --------------------------------------------------------
    # MODERATION / SHUTDOWN REASONS
    # --------------------------------------------------------

    REASON_HARASSMENT = "harassment"

    REASON_HATE_SPEECH = "hate_speech"

    REASON_SEXUAL_CONTENT = "sexual_content"

    REASON_MINOR_SAFETY = "minor_safety"

    REASON_GRAPHIC_VIOLENCE = "graphic_violence"

    REASON_ILLEGAL_ACTIVITY = "illegal_activity"

    REASON_REPEATED_VIOLATIONS = "repeated_violations"

    REASON_BAN_EVASION = "ban_evasion"

    REASON_SCAM_FRAUD = "scam_fraud"

    REASON_PLATFORM_ABUSE = "platform_abuse"

    REASON_OTHER = "other"

    REASON_CHOICES = [
        (
            REASON_HARASSMENT,
            "Harassment",
        ),
        (
            REASON_HATE_SPEECH,
            "Hate Speech",
        ),
        (
            REASON_SEXUAL_CONTENT,
            "Sexual Content",
        ),
        (
            REASON_MINOR_SAFETY,
            "Minor Safety",
        ),
        (
            REASON_GRAPHIC_VIOLENCE,
            "Graphic Violence",
        ),
        (
            REASON_ILLEGAL_ACTIVITY,
            "Illegal Activity",
        ),
        (
            REASON_REPEATED_VIOLATIONS,
            "Repeated Violations",
        ),
        (
            REASON_BAN_EVASION,
            "Ban Evasion",
        ),
        (
            REASON_SCAM_FRAUD,
            "Scam / Fraud",
        ),
        (
            REASON_PLATFORM_ABUSE,
            "Platform Abuse",
        ),
        (
            REASON_OTHER,
            "Other",
        ),
    ]

    # --------------------------------------------------------
    # SESSION
    # --------------------------------------------------------

    session = models.ForeignKey(
        LiveSession,
        on_delete=models.CASCADE,
        related_name="moderation_actions",
    )

    # --------------------------------------------------------
    # DOCHANIA MODERATOR
    # --------------------------------------------------------

    moderator = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="live_moderation_actions",
    )

    # --------------------------------------------------------
    # ACTION
    # --------------------------------------------------------

    action = models.CharField(
        max_length=40,
        choices=ACTION_CHOICES,
    )

    # --------------------------------------------------------
    # REASON
    # --------------------------------------------------------

    reason = models.CharField(
        max_length=40,
        choices=REASON_CHOICES,
    )

    # --------------------------------------------------------
    # MODERATOR NOTE
    # --------------------------------------------------------

    note = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # ACTION STATUS
    # --------------------------------------------------------

    is_active = models.BooleanField(
        default=True,
    )

    # --------------------------------------------------------
    # TIME
    # --------------------------------------------------------

    started_at = models.DateTimeField(
        auto_now_add=True,
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    ended_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # --------------------------------------------------------
    # AUDIT TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:

        ordering = [
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "session",
                    "action",
                ],
            ),
            models.Index(
                fields=[
                    "session",
                    "is_active",
                ],
            ),
            models.Index(
                fields=[
                    "moderator",
                    "created_at",
                ],
            ),
            models.Index(
                fields=[
                    "expires_at",
                ],
            ),
        ]

    def __str__(self):

        return (
            f"{self.moderator} - "
            f"{self.action} - "
            f"Live {self.session.id}"
        )
