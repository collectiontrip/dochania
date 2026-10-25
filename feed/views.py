from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .selectors import get_feed_posts
from .serializers import FeedPostSerializer
from .pagination import FeedPagination


class FeedView(generics.ListAPIView):
    """
    Return posts visible to the authenticated user.
    """

    serializer_class = FeedPostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        return get_feed_posts(
            viewer=self.request.user,
        )