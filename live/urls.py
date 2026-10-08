from django.urls import path

from .views import (
    # ========================================================
    # LIVE SESSION
    # ========================================================

    StartLiveSessionView,
    EndLiveSessionView,
    LiveSessionListView,
    LiveHeartbeatView,

    # ========================================================
    # LIVE VIEWER
    # ========================================================

    JoinLiveSessionView,
    LeaveLiveSessionView,
    LiveViewerListView,
    MuteLiveViewerView,
    UnmuteLiveViewerView,
    KickLiveViewerView,
    BlockLiveViewerView,

    # ========================================================
    # LIVE MODERATOR
    # ========================================================

    LiveModeratorListView,
    AssignLiveModeratorView,
    RemoveLiveModeratorView,

    # ========================================================
    # LIVE CHAT
    # ========================================================

    SendMessageView,
    LiveMessageView,

    # ========================================================
    # LIVE MODERATION
    # ========================================================

    ApplyLiveModerationActionView,
    EndLiveModerationActionView,
    LiveModerationActionListView,
)


urlpatterns = [

    # ============================================================
    # LIVE SESSION
    # ============================================================

    path(
        "start/",
        StartLiveSessionView.as_view(),
        name="live-start",
    ),

    path(
        "end/<int:session_id>/",
        EndLiveSessionView.as_view(),
        name="live-end",
    ),

    path(
        "streams/",
        LiveSessionListView.as_view(),
        name="live-streams",
    ),

    path(
        "heartbeat/<int:session_id>/",
        LiveHeartbeatView.as_view(),
        name="live-heartbeat",
    ),


    # ============================================================
    # LIVE VIEWER
    # ============================================================

    path(
        "join/<int:session_id>/",
        JoinLiveSessionView.as_view(),
        name="live-join",
    ),

    path(
        "leave/<int:session_id>/",
        LeaveLiveSessionView.as_view(),
        name="live-leave",
    ),

    path(
        "viewers/<int:session_id>/",
        LiveViewerListView.as_view(),
        name="live-viewers",
    ),

    path(
        "viewers/<int:session_id>/<int:user_id>/mute/",
        MuteLiveViewerView.as_view(),
        name="live-viewer-mute",
    ),

    path(
        "viewers/<int:session_id>/<int:user_id>/unmute/",
        UnmuteLiveViewerView.as_view(),
        name="live-viewer-unmute",
    ),

    path(
        "viewers/<int:session_id>/<int:user_id>/kick/",
        KickLiveViewerView.as_view(),
        name="live-viewer-kick",
    ),

    path(
        "viewers/<int:session_id>/<int:user_id>/block/",
        BlockLiveViewerView.as_view(),
        name="live-viewer-block",
    ),


    # ============================================================
    # LIVE MODERATOR
    # ============================================================

    path(
        "moderators/<int:session_id>/",
        LiveModeratorListView.as_view(),
        name="live-moderators",
    ),

    path(
        "moderators/<int:session_id>/assign/",
        AssignLiveModeratorView.as_view(),
        name="live-moderator-assign",
    ),

    path(
        "moderators/<int:session_id>/<int:user_id>/remove/",
        RemoveLiveModeratorView.as_view(),
        name="live-moderator-remove",
    ),


    # ============================================================
    # LIVE CHAT
    # ============================================================

    path(
        "message/send/",
        SendMessageView.as_view(),
        name="live-message-send",
    ),

    path(
        "messages/<int:session_id>/",
        LiveMessageView.as_view(),
        name="live-messages",
    ),


    # ============================================================
    # LIVE MODERATION
    # ============================================================

    path(
        "moderation/<int:session_id>/action/",
        ApplyLiveModerationActionView.as_view(),
        name="live-moderation-action",
    ),

    path(
        "moderation/action/<int:action_id>/end/",
        EndLiveModerationActionView.as_view(),
        name="live-moderation-action-end",
    ),

    path(
        "moderation/<int:session_id>/actions/",
        LiveModerationActionListView.as_view(),
        name="live-moderation-actions",
    ),
]