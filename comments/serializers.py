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

    def validate_content(
        self,
        value,
    ):

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

    class Meta:

        model = Comment

        fields = (
            "parent",
            "content_type",
            "object_id",
            "content",
        )

    def create(
        self,
        validated_data,
    ):

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

    def update(
        self,
        instance,
        validated_data,
    ):

        return update_comment(
            comment=instance,
            validated_data=validated_data,
        )


class ReplySerializer(
    CommentSerializer,
):

    class Meta(
        CommentSerializer.Meta,
    ):

        fields = CommentSerializer.Meta.fields