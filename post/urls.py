
from django.urls import path

from .views import (
    PostCreateView,
    PostListView,
    UserPostListView,
    PostDetailView,
    PostUpdateView,
    PostDeleteView,
    SelfPostListView,
    PostOriginalMediaView,
    PostPreviewMediaView,
)


urlpatterns = [
    # ========================================================
    # CREATE POST
    # ========================================================

    path(
        "create/",
        PostCreateView.as_view(),
        name="post-create",
    ),

    # ========================================================
    # POST LISTS
    # ========================================================

    path(
        "",
        PostListView.as_view(),
        name="post-list",
    ),

    path(
        "my-posts/",
        SelfPostListView.as_view(),
        name="my-posts",
    ),

    path(
        "users/<int:user_id>/posts/",
        UserPostListView.as_view(),
        name="user-post-list",
    ),

    # ========================================================
    # ORIGINAL MEDIA ACCESS
    # ========================================================

    path(
        "<uuid:post_id>/media/<uuid:media_id>/original/",
        PostOriginalMediaView.as_view(),
        name="post-original-media",
    ),

    # ========================================================
    # PROTECTED PREVIEW MEDIA ACCESS
    # ========================================================

    path(
        "<uuid:post_id>/media/<uuid:media_id>/preview/",
        PostPreviewMediaView.as_view(),
        name="post-preview-media",
    ),

    # ========================================================
    # POST DETAILS AND MANAGEMENT
    # ========================================================

    path(
        "<uuid:pk>/",
        PostDetailView.as_view(),
        name="post-detail",
    ),

    path(
        "<uuid:pk>/update/",
        PostUpdateView.as_view(),
        name="post-update",
    ),

    path(
        "<uuid:pk>/delete/",
        PostDeleteView.as_view(),
        name="post-delete",
    ),
]
