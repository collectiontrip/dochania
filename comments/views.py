from django_filters.rest_framework import (
    DjangoFilterBackend,
)

from rest_framework import generics
from rest_framework.permissions import (
    IsAuthenticatedOrReadOnly,
)

from .models import Comment

from .filters import CommentFilter

from .pagination import CommentPagination

from .permissions import (
    IsCommentOwnerOrReadOnly,
)

from .selectors import (
    get_comment,
    get_comments,
    get_replies,
)

from .serializers import (
    CommentCreateSerializer,
    CommentSerializer,
    CommentUpdateSerializer,
    ReplySerializer,
)

from .services import delete_comment

from .utils import get_content_type



class CommentListCreateView(
    generics.ListCreateAPIView,
):

    pagination_class = CommentPagination

    filter_backends = [
        DjangoFilterBackend,
    ]

    filterset_class = CommentFilter

    permission_classes = [
        IsAuthenticatedOrReadOnly,
    ]


    def get_queryset(self):

        content_type = self.request.query_params.get(
            "content_type",
        )

        object_id = self.request.query_params.get(
            "object_id",
        )


        if not content_type or not object_id:
            return Comment.objects.none()


        return get_comments(
            content_type=get_content_type(
                content_type,
            ),
            object_id=object_id,
            user=self.request.user,
        )


    def get_serializer_class(self):

        if self.request.method == "POST":
            return CommentCreateSerializer

        return CommentSerializer




class CommentDetailView(
    generics.RetrieveUpdateDestroyAPIView,
):

    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsCommentOwnerOrReadOnly,
    ]


    def get_queryset(self):

        return Comment.objects.filter(
            is_deleted=False,
        )


    def get_object(self):

        return super().get_object()


    def get_serializer_class(self):

        if self.request.method in (
            "PUT",
            "PATCH",
        ):
            return CommentUpdateSerializer

        return CommentSerializer


    def perform_destroy(
        self,
        instance,
    ):

        delete_comment(
            comment=instance,
        )




class CommentReplyListView(
    generics.ListAPIView,
):

    serializer_class = ReplySerializer

    pagination_class = CommentPagination


    permission_classes = [
        IsAuthenticatedOrReadOnly,
    ]


    def get_queryset(self):

        parent = get_comment(
            comment_id=self.kwargs["comment_id"],
            user=self.request.user,
        )


        return get_replies(
            parent=parent,
            user=self.request.user,
        )