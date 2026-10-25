
from rest_framework import serializers

from Subscriptions.models import ContentPurchase


class ContentPurchaseSerializer(serializers.ModelSerializer):

    buyer_username = serializers.CharField(
        source="buyer.username",
        read_only=True,
    )

    creator_username = serializers.CharField(
        source="creator.username",
        read_only=True,
    )

    post_id = serializers.IntegerField(
        source="post.id",
        read_only=True,
    )

    class Meta:
        model = ContentPurchase

        fields = [
            "id",
            "buyer",
            "buyer_username",
            "post",
            "post_id",
            "creator",
            "creator_username",
            "coins_paid",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "buyer",
            "buyer_username",
            "post",
            "post_id",
            "creator",
            "creator_username",
            "coins_paid",
            "created_at",
        ]
