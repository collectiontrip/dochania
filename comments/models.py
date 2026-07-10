import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from django.core.exceptions import ValidationError
from django.db import models

from common.models import (
    GenericRelationModel,
    SoftDeleteModel,
    TimeStampedModel,
)

from .managers import CommentManager


class Comment(
    GenericRelationModel,
    SoftDeleteModel,
    TimeStampedModel,
):

    objects = CommentManager()

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

    likes = GenericRelation(
        "likes.Like",
        related_query_name="comment",
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

        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["parent"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["parent", "created_at"]),
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.content_type.model} - "
            f"{self.id}"
        )

    def clean(self):

        self.content = self.content.strip()

        if not self.content:
            raise ValidationError(
                {
                    "content": (
                        "Comment cannot be empty."
                    )
                }
            )

    def save(
        self,
        *args,
        **kwargs,
    ):

        self.full_clean()

        super().save(
            *args,
            **kwargs,
        )