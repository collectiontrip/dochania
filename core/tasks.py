from celery import shared_task

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


@shared_task
def send_account_locked_email(
    user_email,
    username,
    locked_until,
):
    # ==========================================================
    # Email Subject
    # ==========================================================

    subject = (
        "Security Alert - Your Dochania Account Has Been Locked"
    )

    # ==========================================================
    # Template Context
    # ==========================================================

    context = {
        "username": username,
        "locked_until": locked_until,
    }

    # ==========================================================
    # HTML Email
    # ==========================================================

    html_content = render_to_string(
        "emails/account_locked.html",
        context,
    )

    # ==========================================================
    # Plain Text Email
    # ==========================================================

    text_content = (
        f"Hello {username},\n\n"
        "Your Dochania account has been temporarily locked "
        "for 72 hours because of multiple failed login attempts.\n\n"
        f"Your account will remain locked until: "
        f"{locked_until}\n\n"
        "If this was not you, we recommend changing your password "
        "after your account is unlocked.\n\n"
        "Regards,\n"
        "Dochania Security Team"
    )

    # ==========================================================
    # Create Email
    # ==========================================================

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user_email],
    )

    # ==========================================================
    # Attach HTML Version
    # ==========================================================

    email.attach_alternative(
        html_content,
        "text/html",
    )

    # ==========================================================
    # Send Email
    # ==========================================================

    email.send(
        fail_silently=False,
    )