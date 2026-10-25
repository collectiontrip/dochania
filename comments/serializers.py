from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from core.serializers import UserMiniSerializer

from .models import Comment
from .services import (
    create_comment,
    update_comment,
)


class BaseCommentSerializer(
    serializers.ModelSerializer,
):
    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Comment cannot be empty."
            )

        return value


class CommentSerializer(
    serializers.ModelSerializer,
):
    user = UserMiniSerializer(
        read_only=True,
    )

    likes_count = serializers.IntegerField(
        read_only=True,
    )

    replies_count = serializers.IntegerField(
        read_only=True,
    )

    is_liked = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = Comment

        fields = (
            "id",
            "user",
            "parent",
            "content",
            "likes_count",
            "replies_count",
            "is_liked",
            "is_edited",
            "created_at",
            "updated_at",
        )

        read_only_fields = fields


class CommentCreateSerializer(
    BaseCommentSerializer,
):
    ALLOWED_MODELS = (
        "post",
        "comment",
    )

    content_type = serializers.SlugRelatedField(
        slug_field="model",
        queryset=ContentType.objects.all(),
    )

    class Meta:
        model = Comment

        fields = (
            "parent",
            "content_type",
            "object_id",
            "content",
        )

    def validate(self, attrs):
        content_type = attrs["content_type"]
        object_id = attrs["object_id"]
        parent = attrs.get("parent")

        if content_type.model not in self.ALLOWED_MODELS:
            raise serializers.ValidationError({
                "content_type": (
                    "This content type cannot be commented."
                )
            })

        model = content_type.model_class()

        if model is None:
            raise serializers.ValidationError({
                "content_type": "Invalid content type."
            })

        if content_type.model == "post":
            if parent is not None:
                raise serializers.ValidationError({
                    "parent": (
                        "A post comment cannot have a parent comment."
                    )
                })

            if not model.objects.filter(
                id=object_id,
            ).exists():
                raise serializers.ValidationError({
                    "object_id": "Post does not exist."
                })

        elif content_type.model == "comment":
            if parent is None:
                raise serializers.ValidationError({
                    "parent": (
                        "A reply must have a parent comment."
                    )
                })

            if str(parent.id) != str(object_id):
                raise serializers.ValidationError({
                    "object_id": (
                        "Must match the parent comment ID."
                    )
                })

            if parent.is_deleted:
                raise serializers.ValidationError({
                    "parent": (
                        "Cannot reply to a deleted comment."
                    )
                })

            if not Comment.objects.filter(
                id=object_id,
                is_deleted=False,
            ).exists():
                raise serializers.ValidationError({
                    "object_id": (
                        "Parent comment does not exist."
                    )
                })

        return attrs

    def create(self, validated_data):
        return create_comment(
            user=self.context["request"].user,
            validated_data=validated_data,
        )


class CommentUpdateSerializer(
    BaseCommentSerializer,
):
    class Meta:
        model = Comment

        fields = (
            "content",
        )

    def update(self, instance, validated_data):
        return update_comment(
            comment=instance,
            validated_data=validated_data,
        )


class ReplySerializer(
    CommentSerializer,
):
    class Meta(CommentSerializer.Meta):
        fields = CommentSerializer.Meta.fields
