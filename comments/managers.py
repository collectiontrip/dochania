from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import (
    BooleanField,
    Count,
    Exists,
    OuterRef,
    Q,
    Value,
)

from likes.models import Like


class CommentQuerySet(models.QuerySet):

    def active(self):
        return self.filter(
            is_deleted=False,
        )

    def top_level(self):
        return self.filter(
            parent__isnull=True,
        )

    def replies(self):
        return self.filter(
            parent__isnull=False,
        )

    def with_related(self):
        return self.select_related(
            "user",
            "content_type",
            "parent",
        )

    def with_counts(self):
        return self.annotate(
            replies_count=Count(
                "replies",
                filter=Q(
                    replies__is_deleted=False,
                ),
                distinct=True,
            ),
            likes_count=Count(
                "likes",
                distinct=True,
            ),
        )

    def with_is_liked(
        self,
        user,
    ):

        if (
            user is None
            or not user.is_authenticated
        ):
            return self.annotate(
                is_liked=Value(
                    False,
                    output_field=BooleanField(),
                )
            )

        comment_content_type = (
            ContentType.objects.get_for_model(
                self.model,
            )
        )

        return self.annotate(
            is_liked=Exists(
                Like.objects.filter(
                    user=user,
                    content_type=comment_content_type,
                    object_id=OuterRef("pk"),
                )
            )
        )

    def for_object(
        self,
        content_type,
        object_id,
        user=None,
    ):
        return (
            self.active()
            .top_level()
            .filter(
                content_type=content_type,
                object_id=object_id,
            )
            .with_related()
            .with_counts()
            .with_is_liked(user)
            .order_by("-created_at")
        )

    def for_detail(
        self,
        user=None,
    ):
        return (
            self.active()
            .with_related()
            .with_counts()
            .with_is_liked(user)
            .order_by("-created_at")
        )

    def for_replies(
        self,
        parent,
        user=None,
    ):
        return (
            self.active()
            .filter(
                parent_id=parent.pk,
            )
            .with_related()
            .with_counts()
            .with_is_liked(user)
            .order_by("created_at")
        )


class CommentManager(models.Manager):

    def get_queryset(self):
        return CommentQuerySet(
            self.model,
            using=self._db,
        )

    def active(self):
        return self.get_queryset().active()

    def top_level(self):
        return self.get_queryset().top_level()

    def replies(self):
        return self.get_queryset().replies()

    def for_object(
        self,
        content_type,
        object_id,
        user=None,
    ):
        return self.get_queryset().for_object(
            content_type,
            object_id,
            user,
        )

    def for_detail(
        self,
        user=None,
    ):
        return self.get_queryset().for_detail(
            user,
        )

    def for_replies(
        self,
        parent,
        user=None,
    ):
        return self.get_queryset().for_replies(
            parent,
            user,
        )