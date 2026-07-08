import uuid

from django.conf import settings
from django.db import models

from common.models import (
    GenericRelationModel,
    TimeStampedModel,
)


class Like(
    GenericRelationModel,
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
        related_name="likes",
    )

    class Meta:
        db_table = "likes"

        verbose_name = "Like"
        verbose_name_plural = "Likes"

        ordering = (
            "-created_at",
        )

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "content_type",
                    "object_id",
                ],
                name="unique_user_like",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user} liked "
            f"{self.content_type.model} "
            f"{self.object_id}"
        )