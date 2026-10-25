
from rest_framework import serializers

from Subscriptions.models import CoinWallet, CoinTransaction


class CoinWalletSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = CoinWallet

        fields = [
            "id",
            "user",
            "username",
            "balance",
            "is_active",
        ]

        read_only_fields = [
            "id",
            "user",
            "username",
            "balance",
            "is_active",
        ]


class CoinTransactionSerializer(serializers.ModelSerializer):

    class Meta:
        model = CoinTransaction

        fields = [
            "id",
            "transaction_type",
            "source",
            "source_id",
            "amount",
            "balance_before",
            "balance_after",
            "description",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "transaction_type",
            "source",
            "source_id",
            "amount",
            "balance_before",
            "balance_after",
            "description",
            "created_at",
        ]
