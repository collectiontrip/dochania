
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from Subscriptions.models import (
    CoinWallet,
    CoinTransaction,
    SubscriptionPlan,
    UserSubscription,
    ContentPurchase,
    CreatorEarning,
)

from Subscriptions.serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    ContentPurchaseSerializer,
    CoinWalletSerializer,
    CoinTransactionSerializer,
    CreatorEarningSerializer,
)

from Subscriptions.services import (
    purchase_subscription,
    purchase_paid_post,
)


# ============================================================
# SUBSCRIPTION PLAN LIST / CREATE
# ============================================================

class SubscriptionPlanListCreateView(generics.ListCreateAPIView):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = SubscriptionPlan.objects.select_related(
            "creator",
        )

        creator_id = self.request.query_params.get("creator_id")

        queryset = queryset.filter(is_active=True)

        if creator_id:
            queryset = queryset.filter(
                creator_id=creator_id,
            )

        return queryset.order_by(
            "tier_level",
            "price_coins",
        )

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


# ============================================================
# SUBSCRIPTION PLAN DETAIL / UPDATE
# ============================================================

class SubscriptionPlanDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = [
        "get",
        "put",
        "patch",
        "head",
        "options",
    ]

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(
            creator=self.request.user,
        )


# ============================================================
# PURCHASE / RENEW / UPGRADE SUBSCRIPTION
# ============================================================

class SubscriptionPurchaseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, plan_id):
        try:
            subscription, was_extended = purchase_subscription(
                subscriber=request.user,
                plan_id=plan_id,
            )

        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)

        message = (
            "Subscription renewed successfully."
            if was_extended
            else "Subscription activated or upgraded successfully."
        )

        return Response(
            {
                "message": message,
                "was_extended": was_extended,
                "subscription": UserSubscriptionSerializer(
                    subscription,
                ).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# MY SUBSCRIPTIONS
# ============================================================

class MySubscriptionsView(generics.ListAPIView):
    serializer_class = UserSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        now = timezone.now()

        UserSubscription.objects.filter(
            subscriber=self.request.user,
            status=UserSubscription.STATUS_ACTIVE,
            end_date__lte=now,
        ).update(
            status=UserSubscription.STATUS_EXPIRED,
        )

        return (
            UserSubscription.objects
            .filter(
                subscriber=self.request.user,
            )
            .select_related(
                "subscriber",
                "creator",
                "plan",
            )
            .order_by("-created_at")
        )


# ============================================================
# CREATOR ACTIVE SUBSCRIBERS
# ============================================================

class CreatorSubscribersView(generics.ListAPIView):
    serializer_class = UserSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        now = timezone.now()

        UserSubscription.objects.filter(
            creator=self.request.user,
            status=UserSubscription.STATUS_ACTIVE,
            end_date__lte=now,
        ).update(
            status=UserSubscription.STATUS_EXPIRED,
        )

        return (
            UserSubscription.objects
            .filter(
                creator=self.request.user,
                status=UserSubscription.STATUS_ACTIVE,
                end_date__gt=now,
            )
            .select_related(
                "subscriber",
                "creator",
                "plan",
            )
            .order_by("-created_at")
        )


# ============================================================
# PURCHASE PAID POST
# ============================================================

class PaidPostPurchaseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            purchase, created = purchase_paid_post(
                buyer=request.user,
                post_id=post_id,
            )

        except DjangoValidationError as exc:
            raise ValidationError(exc.messages)

        return Response(
            {
                "message": (
                    "Paid post unlocked successfully."
                    if created
                    else "You have already unlocked this post."
                ),
                "created": created,
                "purchase": ContentPurchaseSerializer(
                    purchase,
                ).data,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


# ============================================================
# MY CONTENT PURCHASES
# ============================================================

class MyContentPurchasesView(generics.ListAPIView):
    serializer_class = ContentPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            ContentPurchase.objects
            .filter(
                buyer=self.request.user,
            )
            .select_related(
                "buyer",
                "creator",
                "post",
            )
            .order_by("-created_at")
        )


# ============================================================
# COIN WALLET
# ============================================================

class CoinWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            wallet = CoinWallet.objects.get(
                user=request.user,
            )

        except CoinWallet.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Your coin wallet was not found. "
                        "Please contact support."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not wallet.is_active:
            return Response(
                {
                    "detail": "Your coin wallet is inactive."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            CoinWalletSerializer(wallet).data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# COIN TRANSACTION HISTORY
# ============================================================

class CoinTransactionHistoryView(generics.ListAPIView):
    serializer_class = CoinTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            CoinTransaction.objects
            .filter(
                wallet__user=self.request.user,
            )
            .select_related("wallet")
            .order_by("-created_at")
        )


# ============================================================
# CREATOR EARNINGS
# ============================================================

class CreatorEarningsView(generics.ListAPIView):
    serializer_class = CreatorEarningSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            CreatorEarning.objects
            .filter(
                creator=self.request.user,
            )
            .order_by("-created_at")
        )


# ============================================================
# CREATOR EARNINGS SUMMARY
# ============================================================

class CreatorEarningsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        earnings = CreatorEarning.objects.filter(
            creator=request.user,
        )

        totals = earnings.aggregate(
            total_gross_coins=Sum("gross_coins"),
            total_platform_fee_coins=Sum(
                "platform_fee_coins",
            ),
            total_net_coins=Sum("net_coins"),
        )

        withdrawn_totals = earnings.filter(
            is_withdrawn=True,
        ).aggregate(
            withdrawn_gross_coins=Sum("gross_coins"),
            withdrawn_net_coins=Sum("net_coins"),
        )

        unwithdrawn_totals = earnings.filter(
            is_withdrawn=False,
        ).aggregate(
            unwithdrawn_gross_coins=Sum("gross_coins"),
            unwithdrawn_net_coins=Sum("net_coins"),
        )

        source_choices = (
            CreatorEarning._meta
            .get_field("source_type")
            .choices
        )

        source_breakdown = []

        for source_type, source_label in source_choices:
            source_totals = earnings.filter(
                source_type=source_type,
            ).aggregate(
                gross_coins=Sum("gross_coins"),
                platform_fee_coins=Sum(
                    "platform_fee_coins",
                ),
                net_coins=Sum("net_coins"),
            )

            source_breakdown.append(
                {
                    "source_type": source_type,
                    "source_label": source_label,
                    "gross_coins": (
                        source_totals["gross_coins"] or 0
                    ),
                    "platform_fee_coins": (
                        source_totals["platform_fee_coins"] or 0
                    ),
                    "net_coins": (
                        source_totals["net_coins"] or 0
                    ),
                }
            )

        return Response(
            {
                "total_gross_coins": (
                    totals["total_gross_coins"] or 0
                ),
                "total_platform_fee_coins": (
                    totals["total_platform_fee_coins"] or 0
                ),
                "total_net_coins": (
                    totals["total_net_coins"] or 0
                ),
                "withdrawn_gross_coins": (
                    withdrawn_totals[
                        "withdrawn_gross_coins"
                    ] or 0
                ),
                "withdrawn_net_coins": (
                    withdrawn_totals[
                        "withdrawn_net_coins"
                    ] or 0
                ),
                "unwithdrawn_gross_coins": (
                    unwithdrawn_totals[
                        "unwithdrawn_gross_coins"
                    ] or 0
                ),
                "unwithdrawn_net_coins": (
                    unwithdrawn_totals[
                        "unwithdrawn_net_coins"
                    ] or 0
                ),
                "source_breakdown": source_breakdown,
            },
            status=status.HTTP_200_OK,
        )
