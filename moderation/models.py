
import uuid

from django.conf import settings
from django.db import models

from reports.constants import (
    REPORT_ACTION_CHOICES,
    REPORT_ACTION_NONE,
)
from reports.models import Report

from .constants import MODERATION_DECISION_CHOICES


class ModerationCase(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    report = models.OneToOneField(
        Report,
        on_delete=models.CASCADE,
        related_name="moderation_case",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_moderation_cases",
    )

    decision = models.CharField(
        max_length=20,
        choices=MODERATION_DECISION_CHOICES,
        null=True,
        blank=True,
    )

    moderator_note = models.TextField(
        blank=True,
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Moderation Case - {self.report_id}"


class ModerationActionLog(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    moderation_case = models.ForeignKey(
        ModerationCase,
        on_delete=models.CASCADE,
        related_name="action_logs",
    )

    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderation_action_logs",
    )

    old_decision = models.CharField(
        max_length=20,
        choices=MODERATION_DECISION_CHOICES,
        null=True,
        blank=True,
    )

    new_decision = models.CharField(
        max_length=20,
        choices=MODERATION_DECISION_CHOICES,
        null=True,
        blank=True,
    )

    action_taken = models.CharField(
        max_length=50,
        choices=REPORT_ACTION_CHOICES,
        default=REPORT_ACTION_NONE,
    )

    action_reason = models.TextField(
        blank=True,
    )

    restriction_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    suspension_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_permanent = models.BooleanField(
        default=False,
    )

    note = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Moderation Action - "
            f"{self.moderation_case_id}"
        )


class UserModeration(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="moderation",
    )

    is_restricted = models.BooleanField(
        default=False,
    )

    restriction_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_suspended = models.BooleanField(
        default=False,
    )

    suspension_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    is_banned = models.BooleanField(
        default=False,
    )

    banned_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    ban_reason = models.TextField(
        blank=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "User Moderation"
        verbose_name_plural = "User Moderations"

    def __str__(self):
        return f"Moderation - {self.user}"

