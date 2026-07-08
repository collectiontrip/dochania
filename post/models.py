import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


User = settings.AUTH_USER_MODEL


class Post(models.Model):

    VISIBILITY_PUBLIC = "public"
    VISIBILITY_FOLLOWERS = "followers"
    VISIBILITY_FRIENDS = "friends"
    VISIBILITY_SUBSCRIBERS = "subscribers"
    VISIBILITY_PRIVATE = "private"

    VISIBILITY_CHOICES = [
        (VISIBILITY_PUBLIC, "Public"),
        (VISIBILITY_FOLLOWERS, "Followers"),
        (VISIBILITY_FRIENDS, "Friends"),
        (VISIBILITY_SUBSCRIBERS, "Subscribers"),
        (VISIBILITY_PRIVATE, "Private"),
    ]

    ACCESS_FREE = "free"
    ACCESS_PAID = "paid"

    ACCESS_CHOICES = [
        (ACCESS_FREE, "Free"),
        (ACCESS_PAID, "Paid"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="posts",
    )

    content = models.TextField(
        blank=True,
    )

    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PUBLIC,
        db_index=True,
    )

    access_type = models.CharField(
        max_length=10,
        choices=ACCESS_CHOICES,
        default=ACCESS_FREE,
        db_index=True,
    )

    coins = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Coins required to unlock this post.",
    )

    allow_comments = models.BooleanField(
        default=True,
        db_index=True,
    )

    hide_like_count = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_edited = models.BooleanField(
        default=False,
    )

    edited_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
    )

    deleted_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    is_archived = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_pinned = models.BooleanField(
        default=False,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:

        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["author"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["visibility"]),
            models.Index(fields=["access_type"]),
        ]

    def __str__(self):
        return f"{self.author.username}'s Post"

    def clean(self):

        if self.access_type == self.ACCESS_PAID:

            if not self.coins:
                raise ValidationError(
                    {
                        "coins": "Coins are required for paid posts."
                    }
                )

        else:
            self.coins = None

    def save(self, *args, **kwargs):

        self.full_clean()

        super().save(*args, **kwargs)


class PostMedia(models.Model):

    MEDIA_IMAGE = "image"
    MEDIA_VIDEO = "video"

    MEDIA_CHOICES = [
        (MEDIA_IMAGE, "Image"),
        (MEDIA_VIDEO, "Video"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="media",
    )

    file = models.FileField(
        upload_to="posts/",
    )

    media_type = models.CharField(
        max_length=10,
        choices=MEDIA_CHOICES,
        db_index=True,
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:

        ordering = [
            "order",
            "created_at",
        ]

        indexes = [
            models.Index(fields=["post"]),
            models.Index(fields=["media_type"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["post", "order"],
                name="unique_post_media_order",
            )
        ]

    def __str__(self):

        return f"{self.media_type} ({self.order}) - {self.post.id}"

    def clean(self):

        if not self.file:
            return

        extension = Path(
            self.file.name
        ).suffix.lower()

        image_extensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
        ]

        video_extensions = [
            ".mp4",
            ".mov",
            ".avi",
            ".mkv",
            ".webm",
        ]

        if (
            self.media_type == self.MEDIA_IMAGE
            and extension not in image_extensions
        ):
            raise ValidationError(
                {
                    "file": "Invalid image file."
                }
            )

        if (
            self.media_type == self.MEDIA_VIDEO
            and extension not in video_extensions
        ):
            raise ValidationError(
                {
                    "file": "Invalid video file."
                }
            )

    def save(self, *args, **kwargs):

        self.full_clean()

        super().save(*args, **kwargs)