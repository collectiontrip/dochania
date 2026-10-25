
from rest_framework import serializers

from Subscriptions.models import CreatorEarning


class CreatorEarningSerializer(serializers.ModelSerializer):

    creator_username = serializers.CharField(
        source="creator.username",
        read_only=True,
    )

    class Meta:
        model = CreatorEarning

        fields = [
            "id",
            "creator",
            "creator_username",
            "source_type",
            "source_id",
            "gross_coins",
            "platform_fee_coins",
            "net_coins",
            "description",
            "is_withdrawn",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "creator",
            "creator_username",
            "source_type",
            "source_id",
            "gross_coins",
            "platform_fee_coins",
            "net_coins",
            "description",
            "is_withdrawn",
            "created_at",
        ]
