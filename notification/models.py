import uuid

from django.conf import settings
from django.db import models

from common.models import (
    GenericRelationModel,
    SoftDeleteModel,
    TimeStampedModel,
)


class Notification(
    GenericRelationModel,
    TimeStampedModel,
    SoftDeleteModel,
):

    NOTIFICATION_LIKE = "like"
    NOTIFICATION_COMMENT = "comment"
    NOTIFICATION_REPLY = "reply"
    NOTIFICATION_FOLLOW = "follow"
    NOTIFICATION_MENTION = "mention"
    NOTIFICATION_MESSAGE = "message"
    NOTIFICATION_SYSTEM = "system"

    NOTIFICATION_CHOICES = [
        (NOTIFICATION_LIKE, "Like"),
        (NOTIFICATION_COMMENT, "Comment"),
        (NOTIFICATION_REPLY, "Reply"),
        (NOTIFICATION_FOLLOW, "Follow"),
        (NOTIFICATION_MENTION, "Mention"),
        (NOTIFICATION_MESSAGE, "Message"),
        (NOTIFICATION_SYSTEM, "System"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_notifications",
        null=True,
        blank=True,
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_CHOICES,
        db_index=True,
    )

    is_read = models.BooleanField(
        default=False,
        db_index=True,
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "notifications"

        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

        ordering = (
            "-created_at",
        )

        indexes = [
            models.Index(
                fields=[
                    "recipient",
                    "is_read",
                ],
                name="notification_read_idx",
            ),
            models.Index(
                fields=[
                    "recipient",
                    "-created_at",
                ],
                name="notification_list_idx",
            ),
        ]

    def __str__(self):
        actor = self.actor or "System"

        return (
            f"{actor} "
            f"{self.notification_type} "
            f"for {self.recipient}"
        )