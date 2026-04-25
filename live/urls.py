from django.urls import path
from .views import (
    StartLiveSessionView,
    EndLiveSessionView,
    LiveSessionListView,
    JoinLiveSessionView,
    LeaveLiveSessionView,
    SendMessageView,
    LiveMessageView,
    LiveHeartbeatView,   # ✅ ADD THIS
)

urlpatterns = [
    # 🎥 LIVE CONTROL
    path("start/", StartLiveSessionView.as_view()),
    path("end/<int:session_id>/", EndLiveSessionView.as_view()),

    # 📡 LIVE LIST
    path("streams/", LiveSessionListView.as_view()),

    # 👥 VIEWERS
    path("join/<int:session_id>/", JoinLiveSessionView.as_view()),
    path("leave/<int:session_id>/", LeaveLiveSessionView.as_view()),

    # 💬 CHAT
    path("message/send/", SendMessageView.as_view()),
    path("messages/<int:session_id>/", LiveMessageView.as_view()),

    # ❤️ HEARTBEAT (IMPORTANT FIX 🔥)
    path("heartbeat/<int:session_id>/", LiveHeartbeatView.as_view()),
]