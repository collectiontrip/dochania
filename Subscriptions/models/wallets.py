import uuid 

from django.conf import settings
from django.db import models


class CoinWallet(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coin_wallet"
    )

    balance = models.PositiveBigIntegerField(
        default=0
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    
    class Meta:
        db_table = "coin_wallets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} Coin Wallet"


class CoinTransaction(models.Model):

    TYPE_CREDIT = "credit"
    TYPE_DEBIT = "debit"

    TYPE_CHOICES = [
        (TYPE_CREDIT, "Credit"),
        (TYPE_DEBIT, "Debit"),
    ]

    SOURCE_COIN_PURCHASE = "coin_purchase"
    SOURCE_SUBSCRIPTION = "subscription"
    SOURCE_CONTENT_PURCHASE = "content_purchase"
    SOURCE_REFUND = "refund"
    SOURCE_ADMIN = "admin"


    SOURCE_CHOICES = [
        (SOURCE_COIN_PURCHASE, "Coin Purchase"),
        (SOURCE_SUBSCRIPTION, "Subscription"),
        (SOURCE_CONTENT_PURCHASE, "Content Purchase"),
        (SOURCE_REFUND, "Refund"),
        (SOURCE_ADMIN, "Admin"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    wallet = models.ForeignKey(
        CoinWallet,
        on_delete=models.CASCADE,
        related_name="transactions"
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        db_index=True
    )

    source = models.CharField(
        max_length=30,
        choices=SOURCE_CHOICES,
        db_index=True
    )

    source_id = models.UUIDField(
        null=True,
        blank=True
    )

    amount = models.PositiveBigIntegerField()

    balance_before = models.PositiveBigIntegerField()
    
    balance_after = models.PositiveBigIntegerField()

    description = models.CharField(
        max_length=255,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:
        db_table = "coin_transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return(
            f"{self.transaction_type} - "
            f"{self.amount} coins"
        )