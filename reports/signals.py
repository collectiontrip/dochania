from django.db.models.signals import post_save
from django.dispatch import receiver

from moderation.models import ModerationCase

from .models import Report


@receiver(
    post_save,
    sender=Report,
)
def create_moderation_case(
    sender,
    instance,
    created,
    **kwargs,
):

    if not created:
        return

    ModerationCase.objects.create(
        report=instance,
    )