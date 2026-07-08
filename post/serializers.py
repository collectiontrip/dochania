from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Post, PostMedia



class PostMediaSerializer(serializers.ModelSerializer):

    class Meta:
        model = PostMedia
        fields = [
            "id",
            "file",
            "media_type",
            "order",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]


class PostCreateSerializer(serializers.ModelSerializer):

    

    class Meta:
        model = Post
        fields = [
            "content",
            "visibility",
            "access_type",
            "coins",
            "allow_comments",
            "hide_like_count",
            
        ]

   


class PostDetailSerializer(serializers.ModelSerializer):

    author_username = serializers.CharField(
        source="author.username",
        read_only=True
    )

    media = PostMediaSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "author_username",
            "content",
            "visibility",
            "access_type",
            "coins",
            "allow_comments",
            "hide_like_count",
            "is_edited",
            "edited_at",
            "is_deleted",
            "is_archived",
            "is_pinned",
            "created_at",
            "updated_at",
            "media",
        ]

        read_only_fields = [
            "id",
            "author",
            "author_username",
            "is_edited",
            "edited_at",
            "is_deleted",
            "is_archived",
            "is_pinned",
            "created_at",
            "updated_at",
            "media",
        ]


class PostUpdateSerializer(serializers.ModelSerializer):

    media = PostMediaSerializer(
        many=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Post
        fields = [
            "content",
            "visibility",
            "access_type",
            "coins",
            "allow_comments",
            "hide_like_count",
            "media",
        ]

    @transaction.atomic
    def update(self, instance, validated_data):

        media_data = validated_data.pop(
            "media",
            None
        )

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value
            )

        instance.is_edited = True
        instance.edited_at = timezone.now()
        instance.save()

        if media_data is not None:

            instance.media.all().delete()

            for media_item in media_data:
                PostMedia.objects.create(
                    post=instance,
                    **media_item
                )

        return instance