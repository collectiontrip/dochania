from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import User


class Command(BaseCommand):
    help = "Delete unverified users older than 5 days"

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(days=5)

        users = User.objects.filter(
            is_active=False,
            date_joined__lt=cutoff
        )

        count = users.count()
        users.delete()

        self.stdout.write(self.style.SUCCESS(f"{count} users deleted"))