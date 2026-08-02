from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
# likes/serializers.py

from core.serializers import UserMiniSerializer

from .models import Like


class LikeSerializer(serializers.ModelSerializer):

    user = UserMiniSerializer(
        read_only=True,
    )

    content_type = serializers.SlugRelatedField(
        slug_field="model",
        read_only=True,
    )

    class Meta:
        model = Like

        fields = [
            "id",
            "user",
            "content_type",
            "object_id",
            "created_at",
        ]

        read_only_fields = fields


class LikeCreateSerializer(serializers.ModelSerializer):

    ALLOWED_MODELS = (
        "post",
        "comment",
    )

    content_type = serializers.SlugRelatedField(
        slug_field="model",
        queryset=ContentType.objects.all(),
    )

    class Meta:
        model = Like

        fields = [
            "content_type",
            "object_id",
        ]

    def validate(self, attrs):

        request = self.context.get("request")

        if request is None:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Request context is required."
                    )
                }
            )

        user = request.user
        content_type = attrs["content_type"]
        object_id = attrs["object_id"]

        if content_type.model not in self.ALLOWED_MODELS:
            raise serializers.ValidationError(
                {
                    "content_type": (
                        "This content type cannot be liked."
                    )
                }
            )

        model = content_type.model_class()

        if model is None:
            raise serializers.ValidationError(
                {
                    "content_type": (
                        "Invalid content type."
                    )
                }
            )

        if not model.objects.filter(
            id=object_id,
        ).exists():
            raise serializers.ValidationError(
                {
                    "object_id": (
                        "Object does not exist."
                    )
                }
            )

        if Like.objects.filter(
            user=user,
            content_type=content_type,
            object_id=object_id,
        ).exists():
            raise serializers.ValidationError(
                {
                    "detail": (
                        "You have already liked this object."
                    )
                }
            )

        return attrs

    def create(self, validated_data):

        request = self.context.get("request")

        return Like.objects.create(
            user=request.user,
            **validated_data,
        )