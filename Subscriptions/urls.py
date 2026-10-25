
from django.urls import path

from Subscriptions.views import (
    SubscriptionPlanListCreateView,
    SubscriptionPlanDetailView,
    SubscriptionPurchaseView,
    MySubscriptionsView,
    CreatorSubscribersView,
    PaidPostPurchaseView,
    MyContentPurchasesView,
    CoinWalletView,
    CoinTransactionHistoryView,
    CreatorEarningsView,
    CreatorEarningsSummaryView,
)

app_name = "subscriptions"

urlpatterns = [
    # Subscription Plans
    path(
        "plans/",
        SubscriptionPlanListCreateView.as_view(),
        name="plan-list-create",
    ),
    path(
        "plans/<int:pk>/",
        SubscriptionPlanDetailView.as_view(),
        name="plan-detail",
    ),

    # Subscription Purchase
    path(
        "purchase/<int:plan_id>/",
        SubscriptionPurchaseView.as_view(),
        name="purchase",
    ),
    path(
        "my-subscriptions/",
        MySubscriptionsView.as_view(),
        name="my-subscriptions",
    ),
    path(
        "creator-subscribers/",
        CreatorSubscribersView.as_view(),
        name="creator-subscribers",
    ),

    # Paid Content
    path(
        "posts/<uuid:post_id>/purchase/",
        PaidPostPurchaseView.as_view(),
        name="paid-post-purchase",
    ),
    path(
        "my-content-purchases/",
        MyContentPurchasesView.as_view(),
        name="my-content-purchases",
    ),

    # Coin Wallet
    path(
        "wallet/",
        CoinWalletView.as_view(),
        name="wallet",
    ),
    path(
        "wallet/transactions/",
        CoinTransactionHistoryView.as_view(),
        name="wallet-transactions",
    ),

    # Creator Earnings
    path(
        "creator-earnings/",
        CreatorEarningsView.as_view(),
        name="creator-earnings",
    ),
    path(
        "creator-earnings/summary/",
        CreatorEarningsSummaryView.as_view(),
        name="creator-earnings-summary",
    ),
]
