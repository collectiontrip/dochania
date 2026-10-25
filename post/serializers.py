
from rest_framework import serializers
from rest_framework.reverse import reverse

from core.serializers import UserMiniSerializer

from .models import (
    Post,
    PostMedia,
)


# ============================================================
# POST MEDIA SERIALIZER
# ============================================================

class PostMediaSerializer(serializers.ModelSerializer):

    file = serializers.SerializerMethodField()

    preview_file = serializers.SerializerMethodField()

    class Meta:
        model = PostMedia

        fields = [
            "id",
            "file",
            "preview_file",
            "preview_status",
            "media_type",
            "order",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "file",
            "preview_file",
            "preview_status",
            "media_type",
            "created_at",
        ]

    # --------------------------------------------------------
    # PROTECTED ORIGINAL MEDIA URL
    # --------------------------------------------------------

    def get_file(self, obj):
        """
        Never return the original FileField URL directly.
        Only return the protected endpoint URL when the
        viewer has original-media access.
        """

        post = self.context.get("post")

        if post is None:
            return None

        if not self.context.get("original_access", False):
            return None

        request = self.context.get("request")

        return reverse(
            "post-original-media",
            kwargs={
                "post_id": post.pk,
                "media_id": obj.pk,
            },
            request=request,
        )

    # --------------------------------------------------------
    # PROTECTED PREVIEW MEDIA URL
    # --------------------------------------------------------

    def get_preview_file(self, obj):
        """
        Return a protected preview endpoint URL.
        Never expose the direct preview storage URL.
        """

        post = self.context.get("post")

        if post is None or not obj.preview_file:
            return None

        request = self.context.get("request")

        try:
            return reverse(
                "post-preview-media",
                kwargs={
                    "post_id": post.pk,
                    "media_id": obj.pk,
                },
                request=request,
            )
        except (ValueError, AttributeError):
            return None


# ============================================================
# POST MEDIA UPDATE SERIALIZER
# ============================================================

class PostMediaUpdateSerializer(serializers.Serializer):
    """
    Existing media:
        {"id": "<media-uuid>", "order": 1}

    Delete existing media:
        {"id": "<media-uuid>", "delete": true}

    Add new media:
        {"file": <uploaded-file>, "order": 0}
    """

    id = serializers.UUIDField(
        required=False,
    )

    file = serializers.FileField(
        required=False,
    )

    order = serializers.IntegerField(
        required=False,
        min_value=0,
    )

    delete = serializers.BooleanField(
        required=False,
        default=False,
        write_only=True,
    )

    def validate(self, attrs):

        media_id = attrs.get("id")
        media_file = attrs.get("file")
        should_delete = attrs.get("delete", False)

        # ----------------------------------------------------
        # DELETE EXISTING MEDIA
        # ----------------------------------------------------

        if should_delete:

            if media_id is None:
                raise serializers.ValidationError({
                    "id": (
                        "An existing media ID is required "
                        "for deletion."
                    )
                })

            if media_file is not None:
                raise serializers.ValidationError({
                    "file": (
                        "Cannot delete and replace media "
                        "in the same operation."
                    )
                })

            if "order" in attrs:
                raise serializers.ValidationError({
                    "order": (
                        "Order cannot be updated while "
                        "deleting media."
                    )
                })

            return attrs

        # ----------------------------------------------------
        # ADD NEW MEDIA
        # ----------------------------------------------------

        if media_id is None and media_file is None:
            raise serializers.ValidationError({
                "file": (
                    "A new media item requires a file."
                )
            })

        # ----------------------------------------------------
        # EXISTING MEDIA UPDATE
        # ----------------------------------------------------

        if media_id is not None and media_file is not None:
            raise serializers.ValidationError({
                "file": (
                    "Replacing an existing media file is "
                    "not supported in the same operation. "
                    "Delete the existing item and upload "
                    "a new file separately."
                )
            })

        return attrs


# ============================================================
# POST CREATE SERIALIZER
# ============================================================

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


# ============================================================
# POST DETAIL SERIALIZER
# ============================================================

class PostDetailSerializer(serializers.ModelSerializer):

    author = UserMiniSerializer(
        read_only=True,
    )

    media = serializers.SerializerMethodField()

    is_unlocked = serializers.SerializerMethodField()

    like_count = serializers.ReadOnlyField(
        source="likes_count",
    )

    comment_count = serializers.ReadOnlyField(
        source="comments_count",
    )

    class Meta:
        model = Post

        fields = [
            "id",
            "author",
            "content",
            "visibility",
            "access_type",
            "coins",
            "is_unlocked",
            "allow_comments",
            "hide_like_count",
            "like_count",
            "comment_count",
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
            "is_unlocked",
            "like_count",
            "comment_count",
            "is_edited",
            "edited_at",
            "is_deleted",
            "is_archived",
            "is_pinned",
            "created_at",
            "updated_at",
            "media",
        ]

    # --------------------------------------------------------
    # CHECK PAID POST ACCESS
    # --------------------------------------------------------

    def get_is_unlocked(self, obj):
        """
        Free posts are unlocked.
        Paid posts require ownership, superuser access,
        or valid paid-post authorization.
        """

        if obj.access_type != Post.ACCESS_PAID:
            return True

        request = self.context.get("request")

        if request is None:
            return False

        viewer = getattr(
            request,
            "user",
            None,
        )

        if viewer is None or not viewer.is_authenticated:
            return False

        # Superuser moderation access.
        if viewer.is_superuser:
            return True

        # Creator can access their own post.
        if obj.author_id == viewer.pk:
            return True

        # Purchase/access authorization.
        from .selectors import has_paid_post_access

        return bool(
            has_paid_post_access(
                viewer=viewer,
                post=obj,
            )
        )

    # --------------------------------------------------------
    # SERIALIZE MEDIA WITH ACCESS CONTROL
    # --------------------------------------------------------

    def get_media(self, obj):
        """
        Authorized viewers receive protected original URLs.
        Other viewers receive protected preview URLs only.
        """

        request = self.context.get("request")

        original_access = self.get_is_unlocked(obj)

        media_queryset = obj.media.all().order_by(
            "order",
            "created_at",
        )

        serializer = PostMediaSerializer(
            media_queryset,
            many=True,
            context={
                **self.context,
                "request": request,
                "post": obj,
                "original_access": original_access,
            },
        )

        return serializer.data

    # --------------------------------------------------------
    # HIDE LOCKED PAID CONTENT
    # --------------------------------------------------------

    def to_representation(self, instance):
        """
        Hide paid post text when the viewer is not authorized.
        Preserve media metadata for preview rendering.
        """

        data = super().to_representation(instance)

        if instance.access_type != Post.ACCESS_PAID:
            return data

        if data.get("is_unlocked", False):
            return data

        data["content"] = ""

        return data


# ============================================================
# POST UPDATE SERIALIZER
# ============================================================

class PostUpdateSerializer(serializers.ModelSerializer):
    """
    Updates post fields and delegates media operations
    to the post service.
    """

    media = PostMediaUpdateSerializer(
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

    # --------------------------------------------------------
    # VALIDATE MEDIA OPERATIONS
    # --------------------------------------------------------

    def validate_media(self, value):
        """
        Prevent multiple operations against the same existing
        media item in a single request.
        """

        seen_ids = set()

        for operation in value:

            media_id = operation.get("id")

            if media_id is None:
                continue

            if media_id in seen_ids:
                raise serializers.ValidationError(
                    "Each existing media ID can appear only once."
                )

            seen_ids.add(media_id)

        return value

    # --------------------------------------------------------
    # UPDATE POST
    # --------------------------------------------------------

    def update(
        self,
        instance,
        validated_data,
    ):
        """
        Keep post updates and media changes inside the
        service layer.
        """

        from .services import update_post

        return update_post(
            post=instance,
            validated_data=validated_data,
        )
