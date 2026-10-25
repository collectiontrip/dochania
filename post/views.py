
from pathlib import Path

from django.contrib.auth import get_user_model
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import (
    PermissionDenied,
    NotFound,
)
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
)
from rest_framework.views import APIView

from .permissions import (
    CanCreatePost,
    IsOwnerOrAdmin,
)

from .serializers import (
    PostCreateSerializer,
    PostDetailSerializer,
    PostUpdateSerializer,
)

from .models import (
    Post,
    PostMedia,
)

from .services import (
    create_post,
    delete_post,
)

from .selectors import (
    can_view_post,
    has_paid_post_access,
    get_user_posts,
)


# ============================================================
# POST ACCESS CONTROL
# ============================================================

def can_access_post_for_request(*, viewer, post):
    """
    Enforce normal post visibility, block, and lifecycle rules.
    """

    if post.is_deleted or post.is_archived:
        return False

    return can_view_post(
        viewer=viewer,
        post=post,
    )


# ============================================================
# ORIGINAL MEDIA ACCESS CONTROL
# ============================================================

def can_access_original_media(*, viewer, post):
    """
    Authorize original media access.

    Superusers can inspect retained media for moderation.
    Creators can access their own original media.
    Other viewers must pass visibility and block checks.
    Paid posts additionally require purchase authorization.
    """

    if not viewer or not viewer.is_authenticated:
        return False

    # Superuser moderation override.
    if viewer.is_superuser:
        return True

    if post.is_deleted or post.is_archived:
        return False

    # Creator access.
    if post.author_id == viewer.pk:
        return True

    # Visibility and block checks.
    if not can_view_post(
        viewer=viewer,
        post=post,
    ):
        return False

    # Free media requires no separate purchase.
    if post.access_type != Post.ACCESS_PAID:
        return True

    # Paid media requires purchase authorization.
    return bool(
        has_paid_post_access(
            viewer=viewer,
            post=post,
        )
    )


# ============================================================
# POST RESPONSE HELPER
# ============================================================

def serialize_post_detail(*, post, request):
    """
    Serialize a post with request context.
    """

    return PostDetailSerializer(
        post,
        context={
            "request": request,
        },
    ).data


# ============================================================
# PROTECTED ORIGINAL MEDIA ENDPOINT
# ============================================================

class PostOriginalMediaView(APIView):
    """
    Serve original media after authorization.

    URL:
        /post/<post_uuid>/media/<media_uuid>/original/

    Superusers may inspect retained media for moderation.
    Ordinary staff/admin users do not receive this override.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request, post_id, media_id):

        post = get_object_or_404(
            Post.objects.select_related("author"),
            pk=post_id,
        )

        media = get_object_or_404(
            PostMedia.objects.filter(post=post),
            pk=media_id,
        )

        if not can_access_original_media(
            viewer=request.user,
            post=post,
        ):
            raise PermissionDenied(
                "You do not have permission to access this media."
            )

        if not media.file:
            raise NotFound(
                "The original media file was not found."
            )

        try:
            media_file = media.file.open("rb")
        except (OSError, ValueError):
            raise NotFound(
                "The original media file is unavailable."
            )

        filename = Path(media.file.name).name

        response = FileResponse(
            media_file,
            as_attachment=False,
            filename=filename,
        )

        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"

        return response


# ============================================================
# PROTECTED PREVIEW MEDIA ENDPOINT
# ============================================================

class PostPreviewMediaView(APIView):
    """
    Serve blurred previews to viewers allowed to see the post.

    Paid-post purchase is not required for its blurred preview.
    Normal post visibility and block rules still apply.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request, post_id, media_id):

        post = get_object_or_404(
            Post.objects.select_related("author"),
            pk=post_id,
        )

        media = get_object_or_404(
            PostMedia.objects.filter(post=post),
            pk=media_id,
        )

        # Apply normal visibility, blocking, and lifecycle rules.
        if not can_access_post_for_request(
            viewer=request.user,
            post=post,
        ):
            raise PermissionDenied(
                "You do not have permission to access this preview."
            )

        if not media.preview_file:
            raise NotFound(
                "The preview file was not found."
            )

        try:
            preview_file = media.preview_file.open("rb")
        except (OSError, ValueError):
            raise NotFound(
                "The preview file is unavailable."
            )

        response = FileResponse(
            preview_file,
            content_type="image/jpeg",
        )

        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"

        return response


# ============================================================
# CREATE POST
# ============================================================

class PostCreateView(generics.CreateAPIView):

    serializer_class = PostCreateSerializer

    permission_classes = [
        IsAuthenticated,
        CanCreatePost,
    ]

    parser_classes = (
        MultiPartParser,
        FormParser,
    )

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        post = create_post(
            author=request.user,
            validated_data=serializer.validated_data,
            files=request.FILES.getlist("media_files"),
        )

        return Response(
            serialize_post_detail(
                post=post,
                request=request,
            ),
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# POST QUERY MIXIN
# ============================================================

class PostQueryMixin:
    """
    Shared queryset helpers for post listing endpoints.
    """

    def get_base_queryset(self):

        return (
            Post.objects
            .filter(
                is_deleted=False,
                is_archived=False,
            )
            .select_related("author")
            .prefetch_related("media")
            .order_by(
                "-is_pinned",
                "-created_at",
            )
        )

    def get_visible_posts(self):

        viewer = self.request.user
        queryset = self.get_base_queryset()

        return [
            post
            for post in queryset
            if can_access_post_for_request(
                viewer=viewer,
                post=post,
            )
        ]


# ============================================================
# POST LIST
# ============================================================

class PostListView(
    PostQueryMixin,
    generics.ListAPIView,
):

    serializer_class = PostDetailSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_queryset(self):
        return self.get_visible_posts()


# ============================================================
# CURRENT USER POSTS
# ============================================================

class SelfPostListView(
    PostQueryMixin,
    generics.ListAPIView,
):

    serializer_class = PostDetailSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_queryset(self):

        return (
            Post.objects
            .filter(
                author=self.request.user,
                is_deleted=False,
                is_archived=False,
            )
            .select_related("author")
            .prefetch_related("media")
            .order_by(
                "-is_pinned",
                "-created_at",
            )
        )


# ============================================================
# USER POSTS
# ============================================================

class UserPostListView(generics.ListAPIView):

    serializer_class = PostDetailSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    def get_queryset(self):

        author = get_object_or_404(
            get_user_model(),
            pk=self.kwargs["user_id"],
        )

        posts = get_user_posts(
            viewer=self.request.user,
            author=author,
        )

        return [
            post
            for post in posts
            if can_access_post_for_request(
                viewer=self.request.user,
                post=post,
            )
        ]


# ============================================================
# POST DETAIL
# ============================================================

class PostDetailView(generics.RetrieveAPIView):

    serializer_class = PostDetailSerializer

    permission_classes = [
        IsAuthenticated,
    ]

    queryset = (
        Post.objects
        .filter(
            is_deleted=False,
            is_archived=False,
        )
        .select_related("author")
        .prefetch_related("media")
    )

    def get_object(self):

        post = super().get_object()

        if not can_access_post_for_request(
            viewer=self.request.user,
            post=post,
        ):
            raise PermissionDenied(
                "You do not have permission to view this post."
            )

        return post


# ============================================================
# UPDATE POST
# ============================================================

class PostUpdateView(generics.UpdateAPIView):

    serializer_class = PostUpdateSerializer

    permission_classes = [
        IsAuthenticated,
        CanCreatePost,
        IsOwnerOrAdmin,
    ]

    parser_classes = (
        MultiPartParser,
        FormParser,
    )

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

    def update(self, request, *args, **kwargs):

        partial = kwargs.pop(
            "partial",
            False,
        )

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        post = serializer.save()

        return Response(
            serialize_post_detail(
                post=post,
                request=request,
            ),
            status=status.HTTP_200_OK,
        )


# ============================================================
# DELETE POST
# ============================================================

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

        delete_post(
            post=post,
        )

        return Response(
            {
                "detail": "Post deleted successfully.",
            },
            status=status.HTTP_200_OK,
        )
