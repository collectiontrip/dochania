import uuid

from django.conf import settings
from django.db import models

from common.models import (
    TimeStampedModel,
    GenericRelationModel,
)

from .constants import *


class Report(
    GenericRelationModel,
    TimeStampedModel,
):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports",
    )

    reason = models.CharField(
        max_length=50,
        choices=REPORT_REASON_CHOICES,
    )

    description = models.TextField(
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices= REPORT_STATUS_CHOICES,
        default=REPORT_STATUS_PENDING,
        db_index=True,
    )

    action_taken = models.CharField(
        max_length=30,
        choices=REPORT_ACTION_CHOICES,
        default=REPORT_ACTION_NONE,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_reports",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    
    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "reporter",
                    "content_type",
                    "object_id",

                ],
                name="unique_report_per_user",
            ),
        ]

        indexes = [
            
            models.Index(
                fields=["reason"],
                name="report_reason_idx",
            ),
            models.Index(
                fields=["created_at"],
                name="report_created_idx",
            ),
        ]

    def __str__(self):
        return f"Report by {self.reporter} ({self.reason})"


class ReportEvidence(
    TimeStampedModel,
):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="evidence",

    )

    file = models.FileField(
        upload_to="reports/evidence/",
    )

    evidence_type = models.CharField(
        max_length=20,
        choices=EVIDENCE_TYPE_CHOICES,
        default=EVIDENCE_TYPE_IMAGE,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.evidence_type} - "
            f"{self.report_id}"
        )


class ReportAction(
    TimeStampedModel,
):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="actions",
    )

    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_actions",
    )

    old_status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS_CHOICES,
        blank=True,
        null=True
    )

    new_status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS_CHOICES,
    )

    action_taken = models.CharField(
        max_length=30,
        choices=REPORT_ACTION_CHOICES,
        default=REPORT_ACTION_NONE,
    )

    note = models.TextField(
        blank=True
    )

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["action_taken"],
                name="report_action_idx",
            ),

            models.Index(
                fields=["new_status"],
                name="report_new_status_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.action_taken} - "
            f"{self.report_id}"
        )

