
from django.core.exceptions import ValidationError
from django.db import transaction

from Subscriptions.models import (
    CoinWallet,
    CoinTransaction,
    CreatorEarning,
    ContentPurchase,
)

from post.models import Post
from post.selectors import can_view_post


@transaction.atomic
def purchase_paid_post(*, buyer, post_id):
    # ========================================================
    # VALIDATE BUYER
    # ========================================================

    if not buyer or not buyer.is_authenticated:
        raise ValidationError(
            "You must be logged in to purchase a post."
        )

    # ========================================================
    # LOCK AND FETCH POST
    # ========================================================

    post = (
        Post.objects
        .select_for_update()
        .filter(
            pk=post_id,
            is_deleted=False,
            is_archived=False,
        )
        .first()
    )

    if post is None:
        raise ValidationError("Post not found.")

    if post.access_type != Post.ACCESS_PAID:
        raise ValidationError(
            "This post is not paid."
        )

    if not post.coins or post.coins <= 0:
        raise ValidationError(
            "This post has an invalid coin price."
        )

    if post.author_id == buyer.pk:
        raise ValidationError(
            "You cannot purchase your own post."
        )

    # Respect visibility, relationship and blocking rules.
    if not can_view_post(
        viewer=buyer,
        post=post,
    ):
        raise ValidationError(
            "You do not have permission to access this post."
        )

    # ========================================================
    # CHECK EXISTING PURCHASE
    # ========================================================

    existing_purchase = ContentPurchase.objects.filter(
        buyer=buyer,
        post=post,
    ).first()

    if existing_purchase:
        return existing_purchase, False

    # ========================================================
    # LOCK BUYER WALLET
    # ========================================================

    try:
        wallet = (
            CoinWallet.objects
            .select_for_update()
            .get(
                user=buyer,
                is_active=True,
            )
        )
    except CoinWallet.DoesNotExist:
        raise ValidationError(
            "Your active coin wallet was not found."
        )

    # Recheck after acquiring the wallet lock.
    existing_purchase = ContentPurchase.objects.filter(
        buyer=buyer,
        post=post,
    ).first()

    if existing_purchase:
        return existing_purchase, False

    # ========================================================
    # VALIDATE BALANCE
    # ========================================================

    price = post.coins

    if wallet.balance < price:
        raise ValidationError(
            "Insufficient coins in your wallet."
        )

    balance_before = wallet.balance

    # ========================================================
    # CREATE PURCHASE RECORD
    # ========================================================

    purchase = ContentPurchase.objects.create(
        buyer=buyer,
        post=post,
        creator=post.author,
        coins_paid=price,
    )

    # ========================================================
    # DEDUCT BUYER COINS
    # ========================================================

    wallet.balance -= price

    wallet.save(
        update_fields=["balance"]
    )

    # ========================================================
    # RECORD DEBIT TRANSACTION
    # ========================================================

    CoinTransaction.objects.create(
        wallet=wallet,
        transaction_type=CoinTransaction.TYPE_DEBIT,
        source=CoinTransaction.SOURCE_CONTENT_PURCHASE,
        source_id=purchase.pk,
        amount=price,
        balance_before=balance_before,
        balance_after=wallet.balance,
        description=(
            f"Paid post unlock: post ID {post.pk}; "
            f"purchase ID {purchase.pk}; "
            f"creator ID {post.author_id}; "
            f"charged {price} coins."
        ),
    )

    # ========================================================
    # RECORD CREATOR EARNING
    # ========================================================

    CreatorEarning.objects.create(
        creator=post.author,
        source_type=CreatorEarning.SOURCE_PAID_POST,
        source_id=purchase.pk,
        gross_coins=price,
        platform_fee_coins=0,
        net_coins=price,
        description=(
            f"Paid post unlock: post ID {post.pk}; "
            f"purchase ID {purchase.pk}. "
            f"Gross earning: {price} coins. "
            f"Platform fee: 0 coins. "
            f"Net earning: {price} coins."
        ),
    )

    return purchase, True
