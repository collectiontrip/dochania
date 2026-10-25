
from rest_framework import serializers

from Subscriptions.models import UserSubscription


class UserSubscriptionSerializer(serializers.ModelSerializer):

    subscriber_username = serializers.CharField(
        source="subscriber.username",
        read_only=True,
    )

    creator_username = serializers.CharField(
        source="creator.username",
        read_only=True,
    )

    plan_name = serializers.CharField(
        source="plan.name",
        read_only=True,
    )

    plan_price_coins = serializers.IntegerField(
        source="plan.price_coins",
        read_only=True,
    )

    plan_tier_level = serializers.IntegerField(
        source="plan.tier_level",
        read_only=True,
    )

    class Meta:
        model = UserSubscription

        fields = [
            "id",
            "subscriber",
            "subscriber_username",
            "creator",
            "creator_username",
            "plan",
            "plan_name",
            "plan_price_coins",
            "plan_tier_level",
            "start_date",
            "end_date",
            "auto_renew",
            "status",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "subscriber",
            "subscriber_username",
            "creator",
            "creator_username",
            "plan",
            "plan_name",
            "plan_price_coins",
            "plan_tier_level",
            "start_date",
            "end_date",
            "auto_renew",
            "status",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]
