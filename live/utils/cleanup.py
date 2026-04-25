from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from live.models import LiveSession


def cleanup_dead_streams():
    """
    Close streams jaha heartbeat 5 min se nahi aayi
    ya kabhi aayi hi nahi (null case)
    """

    timeout = timezone.now() - timedelta(minutes=5)

    dead_sessions = LiveSession.objects.filter(
        Q(is_live=True) & (
            Q(last_heartbeat__lt=timeout) |
            Q(last_heartbeat__isnull=True)
        )
    )

    count = dead_sessions.update(
        is_live=False,
        ended_at=timezone.now()
    )

    if count > 0:
        print(f"🧹 Cleaned {count} dead streams")