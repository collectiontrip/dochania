from collections.abc import Mapping

from django.db import transaction

from .models import Comment


@transaction.atomic
def create_comment(
    *,
    user,
    validated_data: Mapping[str, object],
) -> Comment:

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