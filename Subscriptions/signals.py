from django.apps import apps
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models.wallets import CoinWallet
User = apps.get_model(settings.AUTH_USER_MODEL)


@receiver(post_save, sender=User)
def create_coin_wallet(sender, instance, created, **kwargs):
    if created:
        CoinWallet.objects.create(user=instance)