from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL

class LiveSession(models.Model):
    streamer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="live_sessions")
    title = models.CharField(max_length=255, blank=True)
    is_live = models.BooleanField(default=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True)


    def __str__(self):
        return f"{self.streamer} - {'LIVE' if self.is_live else 'OFF'}"


class LiveMessage(models.Model):
    session = models.ForeignKey(LiveSession, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}: {self.message[:20]}"


class LiveViewer(models.Model):
    session = models.ForeignKey(LiveSession, on_delete=models.CASCADE, related_name="viewers")
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("session", "user")
        indexes = [
            models.Index(fields=["session", "user"]),
        ]

    def __str__(self):
        return f"{self.user} watching {self.session.id}"
