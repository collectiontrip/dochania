from dataclasses import dataclass

from django.db.models import Q
from django.utils import timezone

from relationships.models import (
    Block,
    Follow,
    Friendship,
)

from Subscriptions.models import UserSubscription

from .models import Post


@dataclass(frozen=True)
class RelationshipStatus:

    is_owner: bool
    is_blocked: bool
    is_following: bool
    is_friend: bool
    is_subscriber: bool


def _get_relationship_status(
    *,
    viewer,
    author,
):
    """
    Return the relationship status
    between the viewer and author.
    """

    if viewer == author:

        return RelationshipStatus(
            is_owner=True,
            is_blocked=False,
            is_following=False,
            is_friend=False,
            is_subscriber=False,
        )

    now = timezone.now()

    is_blocked = (
        Block.objects.filter(
            Q(
                blocker=viewer,
                blocked=author,
            )
            |
            Q(
                blocker=author,
                blocked=viewer,
            )
        ).exists()
    )

    is_following = (
        Follow.objects.filter(
            follower=viewer,
            following=author,
        ).exists()
    )

    is_friend = (
        Friendship.objects.filter(
            Q(
                user1=viewer,
                user2=author,
            )
            |
            Q(
                user1=author,
                user2=viewer,
            )
        ).exists()
    )

    is_subscriber = (
        UserSubscription.objects.filter(
            subscriber=viewer,
            creator=author,
            status=UserSubscription.STATUS_ACTIVE,
            end_date__gt=now,
        ).exists()
    )

    return RelationshipStatus(
        is_owner=False,
        is_blocked=is_blocked,
        is_following=is_following,
        is_friend=is_friend,
        is_subscriber=is_subscriber,
    )


def _can_view_visibility(
    *,
    post,
    relationship,
):
    """
    Return True if the relationship
    satisfies the post visibility.
    """

    if relationship.is_owner:
        return True

    if relationship.is_blocked:
        return False

    if post.visibility == Post.VISIBILITY_PUBLIC:
        return True

    if post.visibility == Post.VISIBILITY_FOLLOWERS:
        return relationship.is_following

    if post.visibility == Post.VISIBILITY_FRIENDS:
        return relationship.is_friend

    if post.visibility == Post.VISIBILITY_SUBSCRIBERS:
        return relationship.is_subscriber

    if post.visibility == Post.VISIBILITY_PRIVATE:
        return False

    return False


def can_view_post(
    *,
    viewer,
    post,
):
    """
    Return whether the viewer
    can access the given post.
    """

    relationship = _get_relationship_status(
        viewer=viewer,
        author=post.author,
    )

    return _can_view_visibility(
        post=post,
        relationship=relationship,
    )


def get_user_posts(
    *,
    viewer,
    author,
):
    """
    Return all visible posts of
    the given author.
    """

    relationship = _get_relationship_status(
        viewer=viewer,
        author=author,
    )

    queryset = (
        Post.objects.filter(
            author=author,
            is_deleted=False,
            is_archived=False,
        )
        .select_related("author")
        .prefetch_related("media")
        .order_by(
            "-is_pinned",
            "-created_at",
        )
    )

    return [
        post
        for post in queryset
        if _can_view_visibility(
            post=post,
            relationship=relationship,
        )
    ]