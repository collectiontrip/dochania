from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class CreatorEarning(models.Model):

    SOURCE_SUBSCRIPTION = "subscription"
    SOURCE_PAID_POST = "paid_post"
    SOURCE_TIP = "tip"
    SOURCE_GIFT = "gift"

    SOURCE_CHOICES = [
        (SOURCE_SUBSCRIPTION, "Subscription"),
        (SOURCE_PAID_POST, "Paid Post"),
        (SOURCE_TIP, "Tip"),
        (SOURCE_GIFT, "Gift"),
    ]

    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="earnings",
    )

    source_type = models.CharField(
        max_length=30,
        choices=SOURCE_CHOICES,
    )

    source_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
    )

    gross_coins = models.PositiveBigIntegerField()

    platform_fee_coins = models.PositiveBigIntegerField(
        default=0,
    )

    net_coins = models.PositiveBigIntegerField()

    description = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )

    is_withdrawn = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        db_table = "creator_earnings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["creator"]),
            models.Index(fields=["source_type"]),
            models.Index(fields=["is_withdrawn"]),
        ]

    def __str__(self):
        return f"{self.creator_id} - {self.net_coins}"


class WithdrawalRequest(models.Model):

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_COMPLETED, "Completed"),
    ]

    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="withdrawal_requests",
    )

    requested_coins = models.PositiveBigIntegerField()

    requested_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    requested_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        db_table = "withdrawal_requests"
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["creator"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.creator_id} - {self.status}"


class Payout(models.Model):

    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    withdrawal_request = models.OneToOneField(
        WithdrawalRequest,
        on_delete=models.PROTECT,
        related_name="payout",
    )

    payout_reference = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    failure_reason = models.TextField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        db_table = "payouts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.payout_reference
