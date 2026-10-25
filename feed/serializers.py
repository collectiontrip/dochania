from rest_framework import serializers

from post.serializers import PostDetailSerializer

class FeedPostSerializer(PostDetailSerializer):
    """
    Serialize posts displayed in the user's feed.
    """

    class Meta(PostDetailSerializer.Meta):
        fields = PostDetailSerializer.Meta.fields
        read_only_fields = PostDetailSerializer.Meta.fields