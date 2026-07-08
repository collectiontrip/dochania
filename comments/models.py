import uuid
from django.conf import settings
from django.db import models

from common.models import (
    GenericRelationModel,
    SoftDeleteModel,
    TimeStampedModel,
)


class Comment(
    GenericRelationModel,
    SoftDeleteModel,
    TimeStampedModel,
):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="replies",
        null=True,
        blank=True,
    )

    content = models.TextField(
        max_length=5000,
    )

    is_edited = models.BooleanField(
        default=False,
    )

    class Meta:
        db_table = "comments"

        verbose_name = "Comment"
        verbose_name_plural = "Comments"

        ordering = (
            "-created_at",
        )

    def __str__(self):
        return (
            f"{self.user} commented on "
            f"{self.content_type.model}"
        ) 

