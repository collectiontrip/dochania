from rest_framework import serializers
from .models import LiveSession, LiveMessage, LiveViewer


class LiveSessionSerializer(serializers.ModelSerializer):
    streamer_name = serializers.CharField(source="streamer.username", read_only=True)
    viewers_count = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = [
            "id",
            "streamer",
            "streamer_name",
            "title",
            "is_live",
            "started_at",
            "ended_at",
            "viewers_count",
        ]

        read_only_fields = ["streamer", "started_at", "ended_at"]

    def get_viewers_count(self, obj):
        return obj.viewers.count()


class LiveMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = LiveMessage
        fields = [
            "id",
            "session",
            "user",
            "user_name",
            "message",
            "created_at",
        ]
        read_only_fields = ["user", "created_at"]


class LiveViewerSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = LiveViewer
        fields = [
            "id",
            "session",
            "user",
            "user_name",
            "joined_at",
        ]

        read_only_fields = ["user", "joined_at"]