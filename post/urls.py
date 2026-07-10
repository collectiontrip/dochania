from django.urls import path
from .views import (
    PostCreateView,
    PostListView,
    UserPostListView,
    PostDetailView,
    PostUpdateView,
    PostDeleteView,
    SelfPostListView
)

urlpatterns = [
    path(
        "create/",
        PostCreateView.as_view(),
        name="post-create",
    ),

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