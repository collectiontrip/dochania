from rest_framework import serializers

from core.serializers import UserMiniSerializer

from .models import (
    LiveSession,
    LiveMessage,
    LiveViewer,
    BroadcasterLiveAdmin,
    LiveModerator,
    LiveModerationAction,
)


# ============================================================
# LIVE SESSION SERIALIZER
# ============================================================


class LiveSessionSerializer(
    serializers.ModelSerializer,
):

    streamer_name = serializers.CharField(
        source="streamer.username",
        read_only=True,
    )

    streamer_info = UserMiniSerializer(
        source="streamer",
        read_only=True,
    )

    viewers_count = serializers.SerializerMethodField()

    moderators_count = serializers.SerializerMethodField()

    class Meta:

        model = LiveSession

        fields = [
            "id",

            # ------------------------------------------------
            # STREAMER
            # ------------------------------------------------

            "streamer",
            "streamer_name",
            "streamer_info",

            "title",
            "is_live",
            "started_at",
            "ended_at",
            "last_heartbeat",

            # ------------------------------------------------
            # MODERATOR SHUTDOWN
            # ------------------------------------------------

            "is_shutdown",
            "shutdown_at",
            "shutdown_expires_at",
            "shutdown_reason",

            # ------------------------------------------------
            # COUNTS
            # ------------------------------------------------

            "viewers_count",
            "moderators_count",
        ]

        read_only_fields = [
            "streamer",
            "streamer_name",
            "streamer_info",
            "started_at",
            "ended_at",
            "last_heartbeat",
            "is_shutdown",
            "shutdown_at",
            "shutdown_expires_at",
            "shutdown_reason",
            "viewers_count",
            "moderators_count",
        ]

    # VIEWER COUNT

    def get_viewers_count(
        self,
        obj,
    ):

        return obj.viewers.count()

    # ACTIVE ADMIN COUNT

    def get_moderators_count(
        self,
        obj,
    ):
        """
        Count only permanent admins who are currently
        present in this live.
        """

        active_viewer_ids = (
            LiveViewer.objects
            .filter(
                session=obj,
            )
            .values_list(
                "user_id",
                flat=True,
            )
        )

        return (
            BroadcasterLiveAdmin.objects
            .filter(
                broadcaster_id=obj.streamer_id,
                user_id__in=active_viewer_ids,
            )
            .count()
        )


# ============================================================
# LIVE MESSAGE SERIALIZER
# ============================================================


class LiveMessageSerializer(
    serializers.ModelSerializer,
):

    user_name = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    user_info = UserMiniSerializer(
        source="user",
        read_only=True,
    )

    class Meta:

        model = LiveMessage

        fields = [
            "id",
            "session",

            # ------------------------------------------------
            # USER
            # ------------------------------------------------

            "user",
            "user_name",
            "user_info",

            "message",
            "created_at",
        ]

        read_only_fields = [
            "user",
            "user_name",
            "user_info",
            "created_at",
        ]


# ============================================================
# LIVE VIEWER SERIALIZER
# ============================================================


class LiveViewerSerializer(
    serializers.ModelSerializer,
):

    user_name = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    user_info = UserMiniSerializer(
        source="user",
        read_only=True,
    )

    class Meta:

        model = LiveViewer

        fields = [
            "id",
            "session",

            # ------------------------------------------------
            # USER
            # ------------------------------------------------

            "user",
            "user_name",
            "user_info",

            "joined_at",

            # ------------------------------------------------
            # CHAT MUTE
            # ------------------------------------------------

            "is_muted",
            "muted_at",
            "mute_expires_at",
        ]

        read_only_fields = [
            "user",
            "user_name",
            "user_info",
            "joined_at",
            "is_muted",
            "muted_at",
            "mute_expires_at",
        ]


# ============================================================
# BROADCASTER LIVE ADMIN SERIALIZER
# ============================================================


class BroadcasterLiveAdminSerializer(
    serializers.ModelSerializer,
):

    user_name = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    user_info = UserMiniSerializer(
        source="user",
        read_only=True,
    )

    broadcaster_name = serializers.CharField(
        source="broadcaster.username",
        read_only=True,
    )

    broadcaster_info = UserMiniSerializer(
        source="broadcaster",
        read_only=True,
    )

    class Meta:

        model = BroadcasterLiveAdmin

        fields = [
            "id",

            # ------------------------------------------------
            # BROADCASTER
            # ------------------------------------------------

            "broadcaster",
            "broadcaster_name",
            "broadcaster_info",

            # ------------------------------------------------
            # ADMIN USER
            # ------------------------------------------------

            "user",
            "user_name",
            "user_info",

            # ------------------------------------------------
            # ASSIGNMENT
            # ------------------------------------------------

            "assigned_at",
        ]

        read_only_fields = [
            "broadcaster",
            "broadcaster_name",
            "broadcaster_info",
            "user",
            "user_name",
            "user_info",
            "assigned_at",
        ]


# ============================================================
# LIVE MODERATOR SERIALIZER
# ============================================================


class LiveModeratorSerializer(
    serializers.ModelSerializer,
):

    user_name = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    user_info = UserMiniSerializer(
        source="user",
        read_only=True,
    )

    assigned_by_name = serializers.CharField(
        source="assigned_by.username",
        read_only=True,
    )

    assigned_by_info = UserMiniSerializer(
        source="assigned_by",
        read_only=True,
    )

    class Meta:

        model = LiveModerator

        fields = [
            "id",
            "session",

            # ------------------------------------------------
            # MODERATOR USER
            # ------------------------------------------------

            "user",
            "user_name",
            "user_info",

            # ------------------------------------------------
            # ROLE
            # ------------------------------------------------

            "role",

            # ------------------------------------------------
            # ASSIGNMENT
            # ------------------------------------------------

            "assigned_by",
            "assigned_by_name",
            "assigned_by_info",
            "assigned_at",

            # ------------------------------------------------
            # STATUS
            # ------------------------------------------------

            "is_active",
        ]

        read_only_fields = [
            "assigned_by",
            "assigned_by_name",
            "assigned_by_info",
            "assigned_at",
            "is_active",
        ]


# ============================================================
# LIVE MODERATION ACTION SERIALIZER
# ============================================================


class LiveModerationActionSerializer(
    serializers.ModelSerializer,
):

    moderator_name = serializers.CharField(
        source="moderator.username",
        read_only=True,
    )

    moderator_info = UserMiniSerializer(
        source="moderator",
        read_only=True,
    )

    class Meta:

        model = LiveModerationAction

        fields = [
            "id",
            "session",

            # ------------------------------------------------
            # MODERATOR
            # ------------------------------------------------

            "moderator",
            "moderator_name",
            "moderator_info",

            "action",
            "reason",
            "note",
            "is_active",
            "started_at",
            "expires_at",
            "ended_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "moderator",
            "moderator_name",
            "moderator_info",
            "started_at",
            "created_at",
            "updated_at",
        ]