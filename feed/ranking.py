import math 

from django.utils import timezone

from relationships.models import Follow, Friendship
from post.models import Post 


FRESHNESS_MAX_SCORE = 40
FRESHNESS_DECAY_HOURS = 48

FOLLOWING_BONUS = 12
FRIEND_BONUS = 20

NEW_CREATOR_MAX_BONUS = 15
NEW_CREATOR_PERIOD_DAYS = 30
NEW_CREATOR_POST_MAX_AGE_DAYS = 7


def calculate_post_score(
        *,
        post,
        viewer,
        followed_user_ids,
        friend_user_ids,
        now,
):
    """Calculate the score of an eligible feed post."""

    score = 0.0
    created_at = post.created_at

    if created_at is not None:
        post_age_hours = max(
            0.0,
            (now - created_at).total_second() / 3600,
        )

        score += (
            FRESHNESS_MAX_SCORE
            * math.exp(
                -post_age_hours / FRESHNESS_DECAY_HOURS
            )
        )

    author_id = post.author_id

    if author_id == viewer.pk:
        return score 

    if author_id in followed_user_ids:
        score += FOLLOWING_BONUS

    if author_id in friend_user_ids:
        score += FRIEND_BONUS

    author_joined_at = getattr(
        post.author,
        "date_joined",
        None,
    )

    if (
        author_joined_at is None 
        or created_at is None
        or post.visibility != Post.VISIBILITY_PUBLIC
    ):
        return score 

    creator_age_days = max(
        0.0,
        (now - author_joined_at).total_second() / 86400,
    )

    post_age_days = max(
        0.0,
        (now - created_at).total_seconds() / 86400,
    )

    if (
        creator_age_days >= NEW_CREATOR_PERIOD_DAYS
        or post_age_days >= NEW_CREATOR_POST_MAX_AGE_DAYS
    ):
        return score

    creator_factor = (
        1 - creator_age_days / NEW_CREATOR_PERIOD_DAYS
    )

    post_factor = (
        1 - post_age_days / NEW_CREATOR_POST_MAX_AGE_DAYS
    )

    score += (
        NEW_CREATOR_MAX_BONUS
        * creator_factor
        * post_factor 
    )

    return score 

def rank_feed_posts(*, posts, viewer, now=None):
    """
    Rank posts after access and visibilit checks have passed.
    """

    if not posts:
        return []

    now = now or timezone.now()

    followed_user_ids = set(
        Follow.objects.filter(
            follower=viewer,
        ).values_list(
            "following_id",
            flat=True,
        )
    )

    friend_user_ids = set(
        Friendshi
    )