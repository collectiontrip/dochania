from django.urls import path
from .views import (
    StartLiveSessionView,
    EndLiveSessionView,
    LiveSessionListView,
    JoinLiveSessionView,
    LeaveLiveSessionView,
    SendMessageView,
    LiveMessageView

)



urlpatterns = [
    path("start/", StartLiveSessionView.as_view()),
    path("end/<int:session_id>/", EndLiveSessionView.as_view()),
    path("streams/", LiveSessionListView.as_view()),

    path("join/<int:session_id>/", JoinLiveSessionView.as_view()),
    path("leave/<int:session_id>/", LeaveLiveSessionView.as_view()),

    path("message/send/", SendMessageView.as_view()),
    path("messages/<int:session_id>/", LiveMessageView.as_view()),
]