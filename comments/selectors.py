from uuid import UUID

from django.contrib.contenttypes.models import (
    ContentType,
)
from django.db.models import QuerySet
from django.shortcuts import (
    get_object_or_404,
)

from .models import Comment


def get_comments(
    *,
    content_type: ContentType,
    object_id: UUID,
    user=None,
) -> QuerySet[Comment]:

    return Comment.objects.for_object(
        content_type=content_type,
        object_id=object_id,
        user=user,
    )


def get_comment(
    *,
    comment_id: UUID,
    user=None,
) -> Comment:

    return get_object_or_404(
        Comment.objects.for_detail(
            user=user,
        ),
        pk=comment_id,
    )


def get_replies(
    *,
    parent: Comment,
    user=None,
) -> QuerySet[Comment]:

    return Comment.objects.for_replies(
        parent=parent,
        user=user,
    )