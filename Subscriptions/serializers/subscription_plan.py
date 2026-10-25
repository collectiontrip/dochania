
from rest_framework import serializers

from Subscriptions.models import SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):

    creator_username = serializers.CharField(
        source="creator.username",
        read_only=True,
    )

    class Meta:
        model = SubscriptionPlan

        fields = [
            "id",
            "creator",
            "creator_username",
            "name",
            "description",
            "price_coins",
            "billing_period",
            "duration_days",
            "tier_level",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "creator",
            "creator_username",
            "created_at",
            "updated_at",
        ]

    def validate_price_coins(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Plan price must be greater than zero."
            )

        return value

    def validate_duration_days(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Plan duration must be greater than zero."
            )

        return value

    def validate_tier_level(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Plan tier must be at least 1."
            )

        return value

    def validate(self, attrs):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            if self.instance is not None:
                if self.instance.creator_id != request.user.pk:
                    raise serializers.ValidationError(
                        "You can only update your own subscription plans."
                    )

        return attrs
