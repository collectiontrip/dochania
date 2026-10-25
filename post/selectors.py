
from dataclasses import dataclass

from django.db.models import Q
from django.utils import timezone

from relationships.models import (
    Block,
    Follow,
    Friendship,
)

from Subscriptions.models import (
    UserSubscription,
    ContentPurchase,
)

from .models import Post


# ============================================================
# RELATIONSHIP STATUS
# ============================================================

@dataclass(frozen=True)
class RelationshipStatus:
    is_owner: bool
    is_blocked: bool
    is_following: bool
    is_friend: bool
    is_subscriber: bool


# ============================================================
# GET RELATIONSHIP STATUS
# ============================================================

def _get_relationship_status(
    *,
    viewer,
    author,
):
    """
    Determine the relationship between a viewer and author.

    The post owner is handled separately because they do not
    need to follow, befriend, or subscribe to themselves.
    """

    if not getattr(viewer, "is_authenticated", False):
        return RelationshipStatus(
            is_owner=False,
            is_blocked=False,
            is_following=False,
            is_friend=False,
            is_subscriber=False,
        )

    if viewer.pk == author.pk:
        return RelationshipStatus(
            is_owner=True,
            is_blocked=False,
            is_following=False,
            is_friend=False,
            is_subscriber=False,
        )

    now = timezone.now()

    is_blocked = Block.objects.filter(
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

    is_following = Follow.objects.filter(
        follower=viewer,
        following=author,
    ).exists()

    is_friend = Friendship.objects.filter(
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

    is_subscriber = UserSubscription.objects.filter(
        subscriber=viewer,
        creator=author,
        status=UserSubscription.STATUS_ACTIVE,
        end_date__gt=now,
    ).exists()

    return RelationshipStatus(
        is_owner=False,
        is_blocked=is_blocked,
        is_following=is_following,
        is_friend=is_friend,
        is_subscriber=is_subscriber,
    )


# ============================================================
# CHECK POST VISIBILITY
# ============================================================

def _can_view_visibility(
    *,
    post,
    relationship,
):
    """
    Check whether the viewer satisfies the post's visibility.

    This checks relationship-based visibility only.
    It does not grant access to paid content.

    Blocking takes precedence over visibility permissions.
    The author can always view their own post.
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


# ============================================================
# CAN VIEW POST
# ============================================================

def can_view_post(
    *,
    viewer,
    post,
):
    """
    Check whether an authenticated viewer can access a post
    according to its visibility, blocking, and post status.

    IMPORTANT:
    A True result does not mean a paid post is unlocked.
    Use has_paid_post_access() to check full-content access.
    """

    if not getattr(viewer, "is_authenticated", False):
        return False

    if post.is_deleted or post.is_archived:
        return False

    relationship = _get_relationship_status(
        viewer=viewer,
        author=post.author,
    )

    return _can_view_visibility(
        post=post,
        relationship=relationship,
    )


# ============================================================
# CHECK PAID POST ACCESS
# ============================================================

def has_paid_post_access(
    *,
    viewer,
    post,
):
    """
    Check whether a viewer can access the complete post.

    Rules:
    - Authentication is required.
    - Deleted and archived posts are inaccessible.
    - Visibility and blocking rules must pass.
    - The author can access their own content.
    - Free posts do not require a purchase.
    - Paid posts require a ContentPurchase record.

    This function never purchases content or deducts coins.
    """

    if not getattr(viewer, "is_authenticated", False):
        return False

    if post.is_deleted or post.is_archived:
        return False

    # Visibility and blocking rules apply to all posts.
    if not can_view_post(
        viewer=viewer,
        post=post,
    ):
        return False

    # The author can access their own content.
    if post.author_id == viewer.pk:
        return True

    # Free content does not require a purchase.
    if post.access_type != Post.ACCESS_PAID:
        return True

    # Paid content requires an existing purchase.
    return ContentPurchase.objects.filter(
        buyer=viewer,
        post=post,
    ).exists()


# ============================================================
# GET USER POSTS
# ============================================================

def get_user_posts(
    *,
    viewer,
    author,
):
    """
    Return posts the viewer is allowed to discover.

    A paid post may appear in this result without being
    unlocked. The serializer must redact the original content
    and original media unless has_paid_post_access() is True.

    This function does not authorize direct media-file access.
    """

    if not getattr(viewer, "is_authenticated", False):
        return []

    relationship = _get_relationship_status(
        viewer=viewer,
        author=author,
    )

    # Blocked users cannot discover each other's posts.
    # The owner is handled separately by relationship status.
    if relationship.is_blocked:
        return []

    queryset = (
        Post.objects
        .filter(
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
