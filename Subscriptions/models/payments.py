from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class PaymentMethod(models.Model):

    METHOD_CARD = "card"
    METHOD_UPI = "upi"
    METHOD_BANK = "bank"

    METHOD_CHOICES = [
        (METHOD_CARD, "Card"),
        (METHOD_UPI, "UPI"),
        (METHOD_BANK, "Bank"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payment_methods"
    )

    method_type = models.CharField(
        max_length=20,
        choices=METHOD_CHOICES
    )

    upi_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    account_holder_name = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    bank_account_number = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    ifsc_code = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    card_brand = models.CharField(
        max_length=30,
        blank=True,
        null=True
    )

    card_last4 = models.CharField(
        max_length=4,
        blank=True,
        null=True
    )

    gateway_payment_method_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    is_default = models.BooleanField(
        default=False
    )

    is_verified = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "payment_methods"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["method_type"]),
            models.Index(fields=["is_default"]),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.method_type}"


class PaymentTransaction(models.Model):

    TYPE_RECHARGE = "recharge"
    TYPE_REFUND = "refund"
    TYPE_PAYOUT = "payout"

    TYPE_CHOICES = [
        (TYPE_RECHARGE, "Recharge"),
        (TYPE_REFUND, "Refund"),
        (TYPE_PAYOUT, "Payout"),
    ]

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

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payment_transactions"
    )

    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name="transactions",
        blank=True,
        null=True
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    gateway = models.CharField(
        max_length=100
    )

    gateway_transaction_id = models.CharField(
        max_length=255,
        unique=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )

    failure_reason = models.TextField(
        blank=True,
        null=True
    )

    processed_at = models.DateTimeField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        db_table = "payment_transactions"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["transaction_type"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.gateway_transaction_id