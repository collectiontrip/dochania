
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class SubscriptionPlan(models.Model):

    BILLING_MONTHLY = "monthly"
    BILLING_QUARTERLY = "quarterly"
    BILLING_YEARLY = "yearly"

    BILLING_CHOICES = [
        (BILLING_MONTHLY, "Monthly"),
        (BILLING_QUARTERLY, "Quarterly"),
        (BILLING_YEARLY, "Yearly"),
    ]

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_plans",
    )

    name = models.CharField(
        max_length=100,
    )

    description = models.TextField(
        blank=True,
    )

    price_coins = models.PositiveBigIntegerField(
        validators=[MinValueValidator(1)],
    )

    billing_period = models.CharField(
        max_length=20,
        choices=BILLING_CHOICES,
    )

    duration_days = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
    )

    tier_level = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text=(
            "Plan tier: 1 is the lowest tier; "
            "higher numbers represent higher tiers."
        ),
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "subscription_plans"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["creator"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["creator", "tier_level"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.creator.username})"


class UserSubscription(models.Model):

    STATUS_ACTIVE = "active"
    STATUS_EXPIRED = "expired"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    subscriber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriber_relationships",
    )

    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )

    start_date = models.DateTimeField()

    end_date = models.DateTimeField()

    auto_renew = models.BooleanField(
        default=False,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "user_subscriptions"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["subscriber"]),
            models.Index(fields=["creator"]),
            models.Index(fields=["status"]),
            models.Index(fields=["end_date"]),
        ]

    def __str__(self):
        return (
            f"{self.subscriber_id} -> "
            f"{self.creator_id} ({self.status})"
        )
