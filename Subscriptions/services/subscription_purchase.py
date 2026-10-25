from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from Subscriptions.models import (
    CoinWallet,
    CoinTransaction,
    CreatorEarning,
    SubscriptionPlan,
    UserSubscription,
)


User = get_user_model()


@transaction.atomic
def purchase_subscription(*, subscriber, plan_id):
    # --------------------------------------------------
    # 1. Validate plan and creator
    # --------------------------------------------------

    plan_creator_id = (
        SubscriptionPlan.objects
        .filter(
            pk=plan_id,
            is_active=True,
        )
        .values_list("creator_id", flat=True)
        .first()
    )

    if plan_creator_id is None:
        raise ValidationError(
            "Subscription plan not found or inactive."
        )

    if plan_creator_id == subscriber.pk:
        raise ValidationError(
            "You cannot subscribe to yourself."
        )

    # --------------------------------------------------
    # 2. Lock creator and plan
    # --------------------------------------------------

    creator = (
        User.objects
        .select_for_update()
        .filter(pk=plan_creator_id)
        .first()
    )

    if creator is None:
        raise ValidationError("Creator not found.")

    plan = (
        SubscriptionPlan.objects
        .select_for_update()
        .filter(
            pk=plan_id,
            creator=creator,
            is_active=True,
        )
        .first()
    )

    if plan is None:
        raise ValidationError(
            "Subscription plan not found or inactive."
        )

    if plan.price_coins <= 0:
        raise ValidationError(
            "Subscription price must be greater than zero."
        )

    if plan.duration_days <= 0:
        raise ValidationError(
            "Subscription duration must be greater than zero."
        )

    # --------------------------------------------------
    # 3. Expire old subscriptions
    # --------------------------------------------------

    now = timezone.now()

    UserSubscription.objects.filter(
        subscriber=subscriber,
        creator=creator,
        status=UserSubscription.STATUS_ACTIVE,
        end_date__lte=now,
    ).update(
        status=UserSubscription.STATUS_EXPIRED,
    )

    # --------------------------------------------------
    # 4. Find current active subscription
    # --------------------------------------------------

    active_subscription = (
        UserSubscription.objects
        .select_for_update()
        .filter(
            subscriber=subscriber,
            creator=creator,
            status=UserSubscription.STATUS_ACTIVE,
            end_date__gt=now,
        )
        .order_by("-end_date")
        .first()
    )

    purchase_type = "new"
    remaining_value = 0

    if active_subscription:
        current_plan = active_subscription.plan

        if current_plan_id := active_subscription.plan_id:
            if current_plan_id == plan.pk:
                purchase_type = "renewal"

            elif plan.tier_level > current_plan.tier_level:
                purchase_type = "upgrade"

                remaining_seconds = max(
                    0,
                    int(
                        (
                            active_subscription.end_date - now
                        ).total_seconds()
                    ),
                )

                original_duration_seconds = (
                    current_plan.duration_days * 24 * 60 * 60
                )

                if original_duration_seconds <= 0:
                    raise ValidationError(
                        "The current subscription duration is invalid."
                    )

                remaining_value = (
                    current_plan.price_coins
                    * remaining_seconds
                ) // original_duration_seconds

            elif plan.tier_level < current_plan.tier_level:
                raise ValidationError(
                    "You already have a higher-tier subscription. "
                    "You cannot downgrade through this purchase."
                )

            else:
                raise ValidationError(
                    "You already have an active subscription at "
                    "this tier. Choose the same plan to renew or "
                    "a higher tier to upgrade."
                )

    # --------------------------------------------------
    # 5. Lock subscriber wallet
    # --------------------------------------------------

    try:
        wallet = (
            CoinWallet.objects
            .select_for_update()
            .get(
                user=subscriber,
                is_active=True,
            )
        )
    except CoinWallet.DoesNotExist:
        raise ValidationError(
            "Your active coin wallet was not found."
        )

    # --------------------------------------------------
    # 6. Calculate final charge
    # --------------------------------------------------

    price = plan.price_coins

    applied_credit = min(
        remaining_value,
        price,
    )

    amount_to_charge = price - applied_credit

    if wallet.balance < amount_to_charge:
        raise ValidationError(
            "Insufficient coins in your wallet."
        )

    balance_before = wallet.balance
    balance_after = balance_before - amount_to_charge

    # --------------------------------------------------
    # 7. Create or update subscription
    # --------------------------------------------------

    if purchase_type == "renewal":
        subscription = active_subscription

        subscription.end_date += timedelta(
            days=plan.duration_days,
        )
        subscription.auto_renew = False

        subscription.save(
            update_fields=[
                "end_date",
                "auto_renew",
                "updated_at",
            ]
        )

        was_extended = True

    elif purchase_type == "upgrade":
        subscription = active_subscription

        subscription.plan = plan
        subscription.start_date = now
        subscription.end_date = (
            now + timedelta(days=plan.duration_days)
        )
        subscription.auto_renew = False
        subscription.status = UserSubscription.STATUS_ACTIVE
        subscription.cancelled_at = None

        subscription.save(
            update_fields=[
                "plan",
                "start_date",
                "end_date",
                "auto_renew",
                "status",
                "cancelled_at",
                "updated_at",
            ]
        )

        was_extended = False

    else:
        subscription = UserSubscription.objects.create(
            subscriber=subscriber,
            creator=creator,
            plan=plan,
            start_date=now,
            end_date=now + timedelta(days=plan.duration_days),
            auto_renew=False,
            status=UserSubscription.STATUS_ACTIVE,
        )

        was_extended = False

    # --------------------------------------------------
    # 8. Debit wallet and create transaction record
    # --------------------------------------------------

    if amount_to_charge > 0:
        wallet.balance = balance_after

        CoinTransaction.objects.create(
            wallet=wallet,
            transaction_type=CoinTransaction.TYPE_DEBIT,
            source=CoinTransaction.SOURCE_SUBSCRIPTION,
            source_id=None,
            amount=amount_to_charge,
            balance_before=balance_before,
            balance_after=balance_after,
            description=(
                f"Subscription {purchase_type}: "
                f"plan price {price} coins; "
                f"credit applied {applied_credit} coins; "
                f"charged {amount_to_charge} coins."
            ),
        )

        # --------------------------------------------------
        # 9. Record creator earning
        # --------------------------------------------------

        CreatorEarning.objects.create(
            creator=creator,
            source_type=CreatorEarning.SOURCE_SUBSCRIPTION,
            source_id=None,
            gross_coins=amount_to_charge,
            platform_fee_coins=0,
            net_coins=amount_to_charge,
            description=(
                f"Subscription {purchase_type}. "
                f"Plan price: {price} coins. "
                f"Unused subscription value adjusted: "
                f"{applied_credit} coins. "
                f"Actual coins charged and earned: "
                f"{amount_to_charge} coins."
            ),
        )

    # Save wallet only if a debit actually occurred.
    if amount_to_charge > 0:
        wallet.save(
            update_fields=["balance"]
        )

    return subscription, was_extended
