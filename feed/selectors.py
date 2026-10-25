from django.db.models import Q

from relationships.models import Block
from post.models import Post
from post.selectors import can_view_post

from .ranking import rank_feed_posts


def get_feed_posts(*, viewer):
    """
    Return visible feed posts ranked by relevance.
    """

    blocked_user_ids = Block.objects.filter(
        blocker=viewer,
    ).values_list(
        "blocked_id",
        flat=True,
    )

    blocked_by_user_ids = Block.objects.filter(
        blocked=viewer,
    ).values_list(
        "blocker_id",
        flat=True,
    )

    queryset = (
        Post.objects.filter(
            is_deleted=False,
            is_archived=False,
        )
        .exclude(
            Q(author_id__in=blocked_user_ids)
            | Q(author_id__in=blocked_by_user_ids)
        )
        .select_related("author")
        .prefetch_related("media")
        .order_by("-created_at")
    )

    visible_posts = [
        post
        for post in queryset
        if can_view_post(
            viewer=viewer,
            post=post,
        )
    ]

    return rank_feed_posts(
        posts=visible_posts,
        viewer=viewer,
    )