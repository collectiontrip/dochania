from django.urls import path

from .views import (
    FollowCreateView,
    FollowingListView,
    FollowerListView,
    UserFollowingListView,
    UserFollowerListView,
    UnfollowView,

    FriendRequestCreateView,
    ReceivedFriendRequestListView,
    SentFriendRequestListView,
    FriendRequestDetailView,
    FriendRequestUpdateView,
    FriendRequestCancelView,

    FriendshipListView,
    FriendshipDetailView,
    UnfriendView,

    BlockCreateView,
    BlockListView,
    BlockDetailView,
    UnblockView,
)

urlpatterns = [

    # Follow
    path(
        "follow/",
        FollowCreateView.as_view(),
        name="follow-create"
    ),
    path(
        "following/",
        FollowingListView.as_view(),
        name="following-list"
    ),
    path(
        "followers/",
        FollowerListView.as_view(),
        name="follower-list"
    ),
    path(
        "users/<int:user_id>/following/",
        UserFollowingListView.as_view(),
        name="user-following-list"
    ),

    path(
        "users/<int:user_id>/followers/",
        UserFollowerListView.as_view(),
        name="user-follower-list"
    ),

    path(
        "unfollow/<int:user_id>/",
        UnfollowView.as_view(),
        name="unfollow"
    ),

    # Friend Requests
    path(
        "friend-requests/",
        FriendRequestCreateView.as_view(),
        name="friend-request-create"
    ),
    path(
        "friend-requests/received/",
        ReceivedFriendRequestListView.as_view(),
        name="received-friend-request-list"
    ),
    path(
        "friend-requests/sent/",
        SentFriendRequestListView.as_view(),
        name="sent-friend-request-list"
    ),
    path(
        "friend-requests/<int:pk>/",
        FriendRequestDetailView.as_view(),
        name="friend-request-detail"
    ),
    path(
        "friend-requests/<int:pk>/update/",
        FriendRequestUpdateView.as_view(),
        name="friend-request-update"
    ),
    path(
        "friend-requests/<int:pk>/cancel/",
        FriendRequestCancelView.as_view(),
        name="friend-request-cancel"
    ),

    # Friendships
    path(
        "friends/",
        FriendshipListView.as_view(),
        name="friendship-list"
    ),
    path(
        "friends/<int:pk>/",
        FriendshipDetailView.as_view(),
        name="friendship-detail"
    ),
    path(
        "friends/remove/<int:user_id>/",
        UnfriendView.as_view(),
        name="unfriend"
    ),

    # Blocks
    path(
        "blocks/",
        BlockCreateView.as_view(),
        name="block-create"
    ),
    path(
        "blocks/list/",
        BlockListView.as_view(),
        name="block-list"
    ),
    path(
        "blocks/<int:pk>/",
        BlockDetailView.as_view(),
        name="block-detail"
    ),
    path(
        "blocks/unblock/<int:user_id>/",
        UnblockView.as_view(),
        name="unblock"
    ),
]