from pathlib import Path
from django.utils import timezone
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
)
from rest_framework.exceptions import ValidationError
from relationships.models import Block

from .permissions import IsOwnerOrAdmin
from .serializers import (
    PostCreateSerializer,
    PostDetailSerializer,
    PostUpdateSerializer,
)

from .models import (
    Post,
    PostMedia,
)


class PostCreateView(generics.CreateAPIView):

    serializer_class = PostCreateSerializer
    permission_classes = [IsAuthenticated]

    parser_classes = (
        MultiPartParser,
        FormParser,
    )

    IMAGE_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
    }

    VIDEO_EXTENSIONS = {
        ".mp4",
        ".mov",
        ".avi",
        ".mkv",
        ".webm",
    }

    @transaction.atomic
    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        files = request.FILES.getlist(
            "media_files"
        )

        content = (
            serializer.validated_data
            .get("content", "")
            .strip()
        )

        if not content and not files:
            raise ValidationError(
                {
                    "content": [
                        "Post must contain text or at least one media file."
                    ]
                }
            )

        # Validate all files before creating anything.
        validated_files = []

        for order, file in enumerate(files):

            extension = Path(
                file.name
            ).suffix.lower()

            if extension in self.IMAGE_EXTENSIONS:
                media_type = PostMedia.MEDIA_IMAGE

            elif extension in self.VIDEO_EXTENSIONS:
                media_type = PostMedia.MEDIA_VIDEO

            else:
                raise ValidationError(
                    {
                        "media_files": [
                            f"{file.name} is not a supported file type."
                        ]
                    }
                )

            validated_files.append(
                (
                    order,
                    file,
                    media_type,
                )
            )

        post = serializer.save(
            author=request.user,
            content=content,
        )

        for order, file, media_type in validated_files:

            PostMedia.objects.create(
                post=post,
                file=file,
                media_type=media_type,
                order=order,
            )

        return Response(
            PostDetailSerializer(
                post,
                context={
                    "request": request
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


class PostQueryMixin:

    def get_visible_posts(self):

        blocked_users = (
            Block.objects
            .filter(
                blocker=self.request.user
            )
            .values_list(
                "blocked_id",
                flat=True,
            )
        )

        blocked_by_users = (
            Block.objects
            .filter(
                blocked=self.request.user
            )
            .values_list(
                "blocker_id",
                flat=True,
            )
        )

        return (
            Post.objects
            .filter(
                is_deleted=False,
                is_archived=False,
            )
            .exclude(
                author_id__in=blocked_users,
            )
            .exclude(
                author_id__in=blocked_by_users,
            )
            .select_related("author")
            .prefetch_related("media")
        )


class PostListView(
    PostQueryMixin,
    generics.ListAPIView,
):

    serializer_class = PostDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return (
            self.get_visible_posts()
            .order_by(
                "-is_pinned",
                "-created_at",
            )
        )


class SelfPostListView(
    PostQueryMixin,
    generics.ListAPIView,
):

    serializer_class = PostDetailSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):

        return (
            self.get.visible.posts()
            .filter(author=self.request.user)
            .order_by(
                "-ispinned",
                "-created_at",
            )
        )


class PostDetailView(
    PostQueryMixin,
    generics.RetrieveAPIView,
):

    serializer_class = PostDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return self.get_visible_posts()


class PostUpdateView(generics.UpdateAPIView):

    serializer_class = PostUpdateSerializer

    permission_classes = [
        IsAuthenticated,
        IsOwnerOrAdmin,
    ]

    def get_queryset(self):

        return (
            Post.objects
            .filter(
                is_deleted=False,
                is_archived=False,
            )
            .select_related("author")
            .prefetch_related("media")
        )


class PostDeleteView(generics.DestroyAPIView):

    permission_classes = [
        IsAuthenticated,
        IsOwnerOrAdmin,
    ]

    def get_queryset(self):

        return (
            Post.objects
            .filter(
                is_deleted=False,
                is_archived=False,
            )
        )

    def destroy(self, request, *args, **kwargs):

        post = self.get_object()

        post.is_deleted = True
        post.deleted_at = timezone.now()

        post.save(
            update_fields=[
                "is_deleted",
                "deleted_at",
            ]
        )

        return Response(
            {
                "detail": "Post deleted successfully."
            },
            status=status.HTTP_200_OK,
        )