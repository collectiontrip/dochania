import uuid

from django.conf import settings
from django.db import models


class ContentPurchase(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="content_purchases",
    )

    post = models.ForeignKey(
        "post.Post",
        on_delete=models.PROTECT,
        related_name="purchases",
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="content_sales",
    )

    coins_paid = models.PositiveBigIntegerField()

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        db_table = "content_purchases"

        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["buyer", "post"],
                name="unique_buyer_content_purchase",
            ),
        ]

        indexes = [
            models.Index(fields=["buyer", "created_at"]),
            models.Index(fields=["creator", "created_at"]),
        ]

    def __str__(self):
        return (
            f"{self.buyer_id} unlocked "
            f"{self.post_id} for {self.coins_paid} coins"
        )
