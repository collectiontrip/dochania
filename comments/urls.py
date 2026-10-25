from django.urls import path

from .views import (
    CommentListCreateView,
    CommentDetailView,
    CommentReplyListView,
)


urlpatterns = [
    path(
        "",
        CommentListCreateView.as_view(),
        name="comment-list-create",
    ),
    path(
        "<uuid:pk>/",
        CommentDetailView.as_view(),
        name="comment-detail",
    ),
    path(
        "<uuid:comment_id>/replies/",
        CommentReplyListView.as_view(),
        name="comment-replies",
    ),
]
