from django.dispatch import receiver 
from django.conf import settings
from django.core.mail import send_mail
from djoser.signals import user_registered


@receiver(user_registered)
def send_welcome_email(sender, user, request, **kwargs):
    send_mail(
        subject="Welcome to Dochania!",
        message=f"Hi {user.username}, \n\nWelcome to Dochania! We are excited to have you on board.",
        from_email='noreply@dochania.co.in',
        recipient_list=[user.email],
        fail_silently=False,
    )