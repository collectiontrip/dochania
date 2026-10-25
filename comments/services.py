from collections.abc import Mapping

from django.db import transaction

from rest_framework.exceptions import PermissionDenied

from moderation.services import (
    ModerationPermissionError,
    validate_user_can_create_content,
)

from .models import Comment


def _validate_content_permission(*, user):
    try:
        validate_user_can_create_content(user=user)
    except ModerationPermissionError as exc:
        raise PermissionDenied(str(exc)) from exc


@transaction.atomic
def create_comment(
    *,
    user,
    validated_data: Mapping[str, object],
) -> Comment:
    _validate_content_permission(user=user)

    return Comment.objects.create(
        user=user,
        **validated_data,
    )


@transaction.atomic
def update_comment(
    *,
    comment: Comment,
    validated_data: Mapping[str, object],
) -> Comment:
    _validate_content_permission(user=comment.user)

    for field, value in validated_data.items():
        setattr(
            comment,
            field,
            value,
        )

    comment.is_edited = True

    update_fields = {
        *validated_data.keys(),
        "is_edited",
        "updated_at",
    }

    comment.save(
        update_fields=list(update_fields),
    )

    return comment


@transaction.atomic
def delete_comment(
    *,
    comment: Comment,
) -> Comment:
    comment.delete()

    return comment
