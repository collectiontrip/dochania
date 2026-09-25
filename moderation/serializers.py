from django.utils import timezone

from rest_framework import serializers

from reports.constants import (
    REPORT_ACTION_ACCOUNT_BANNED,
    REPORT_ACTION_ACCOUNT_RESTRICTED,
    REPORT_ACTION_ACCOUNT_SUSPENDED,
    REPORT_ACTION_CONTENT_REMOVED,
    REPORT_ACTION_NONE,
    REPORT_ACTION_WARNING,
)

from reports.serializers import (
    ReportSerializer,
)

from .models import (
    ModerationActionLog,
    ModerationCase,
    UserModeration,
)


# ============================================================
# Moderator User Serializer
# ============================================================


class ModeratorUserSerializer(
    serializers.Serializer,
):

    id = serializers.IntegerField(
        read_only=True,
    )

    username = serializers.CharField(
        read_only=True,
    )


# ============================================================
# Moderation Action Log Serializer
# ============================================================


class ModerationActionLogSerializer(
    serializers.ModelSerializer,
):

    moderator = ModeratorUserSerializer(
        read_only=True,
        allow_null=True,
    )

    class Meta:

        model = ModerationActionLog

        fields = [
            "id",
            "moderation_case",
            "moderator",
            "old_decision",
            "new_decision",
            "action_taken",
            "action_reason",
            "restriction_expires_at",
            "suspension_expires_at",
            "is_permanent",
            "note",
            "created_at",
        ]

        read_only_fields = fields


# ============================================================
# Moderation Case Serializer
# ============================================================


class UserModerationCaseSerializer(
    serializers.ModelSerializer,
):

    report = ReportSerializer(
        read_only=True,
    )

    assigned_to = ModeratorUserSerializer(
        read_only=True,
        allow_null=True,
    )

    action_logs = ModerationActionLogSerializer(
        many=True,
        read_only=True,
    )

    class Meta:

        model = ModerationCase

        fields = [
            "id",
            "report",
            "assigned_to",
            "priority",
            "decision",
            "moderator_note",
            "started_at",
            "resolved_at",
            "created_at",
            "updated_at",
            "action_logs",
        ]

        read_only_fields = [
            "id",
            "report",
            "assigned_to",
            "priority",
            "decision",
            "moderator_note",
            "started_at",
            "resolved_at",
            "created_at",
            "updated_at",
            "action_logs",
        ]


# ============================================================
# User Moderation Serializer
# ============================================================


class UserModerationSerializer(
    serializers.ModelSerializer,
):

    user = ModeratorUserSerializer(
        read_only=True,
    )

    class Meta:

        model = UserModeration

        fields = [
            "id",
            "user",
            "is_restricted",
            "restriction_expires_at",
            "is_suspended",
            "suspension_expires_at",
            "is_banned",
            "banned_at",
            "ban_reason",
            "updated_at",
        ]

        read_only_fields = fields


# ============================================================
# Moderation Resolve Serializer
# ============================================================


class ModerationResolveSerializer(
    serializers.Serializer,
):

    action_taken = serializers.ChoiceField(
        choices=[
            REPORT_ACTION_NONE,
            REPORT_ACTION_WARNING,
            REPORT_ACTION_CONTENT_REMOVED,
            REPORT_ACTION_ACCOUNT_RESTRICTED,
            REPORT_ACTION_ACCOUNT_SUSPENDED,
            REPORT_ACTION_ACCOUNT_BANNED,
        ],
        default=REPORT_ACTION_NONE,
    )

    action_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10000,
    )

    restriction_expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    suspension_expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )

    is_permanent = serializers.BooleanField(
        required=False,
        default=False,
    )

    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10000,
    )

    # ========================================================
    # Field Validation
    # ========================================================

    def validate_action_reason(
        self,
        value,
    ):

        return value.strip()

    def validate_note(
        self,
        value,
    ):

        return value.strip()

    # ========================================================
    # Object Validation
    # ========================================================

    def validate(
        self,
        attrs,
    ):

        now = timezone.now()

        action = attrs.get(
            "action_taken",
            REPORT_ACTION_NONE,
        )

        restriction_expires_at = attrs.get(
            "restriction_expires_at",
        )

        suspension_expires_at = attrs.get(
            "suspension_expires_at",
        )

        is_permanent = attrs.get(
            "is_permanent",
            False,
        )

        # ====================================================
        # Restriction Expiry
        # ====================================================

        if action == REPORT_ACTION_ACCOUNT_RESTRICTED:

            if restriction_expires_at is None:

                raise serializers.ValidationError({
                    "restriction_expires_at": (
                        "Restriction expiry is required "
                        "for an account restriction."
                    )
                })

            if restriction_expires_at <= now:

                raise serializers.ValidationError({
                    "restriction_expires_at": (
                        "Restriction expiry must be "
                        "in the future."
                    )
                })

        elif restriction_expires_at is not None:

            raise serializers.ValidationError({
                "restriction_expires_at": (
                    "Restriction expiry can only be "
                    "provided for an account "
                    "restriction action."
                )
            })

        # ====================================================
        # Suspension Expiry
        # ====================================================

        if action == REPORT_ACTION_ACCOUNT_SUSPENDED:

            if suspension_expires_at is None:

                raise serializers.ValidationError({
                    "suspension_expires_at": (
                        "Suspension expiry is required "
                        "for an account suspension."
                    )
                })

            if suspension_expires_at <= now:

                raise serializers.ValidationError({
                    "suspension_expires_at": (
                        "Suspension expiry must be "
                        "in the future."
                    )
                })

        elif suspension_expires_at is not None:

            raise serializers.ValidationError({
                "suspension_expires_at": (
                    "Suspension expiry can only be "
                    "provided for an account "
                    "suspension action."
                )
            })

        # ====================================================
        # Permanent Action
        #
        # Permanent is supported only for account ban.
        # ====================================================

        if is_permanent:

            if action != REPORT_ACTION_ACCOUNT_BANNED:

                raise serializers.ValidationError({
                    "is_permanent": (
                        "Permanent action is only "
                        "valid for an account ban."
                    )
                })

        # ====================================================
        # Permanent Ban
        #
        # Every account ban must be permanent.
        # ====================================================

        if action == REPORT_ACTION_ACCOUNT_BANNED:

            if not is_permanent:

                raise serializers.ValidationError({
                    "is_permanent": (
                        "Account ban must be permanent."
                    )
                })

        # ====================================================
        # Permanent + Expiry Protection
        # ====================================================

        if is_permanent:

            if restriction_expires_at is not None:

                raise serializers.ValidationError({
                    "restriction_expires_at": (
                        "A permanent action cannot "
                        "have a restriction expiry."
                    )
                })

            if suspension_expires_at is not None:

                raise serializers.ValidationError({
                    "suspension_expires_at": (
                        "A permanent action cannot "
                        "have a suspension expiry."
                    )
                })

        # ====================================================
        # Reject / Resolve Consistency
        #
        # This serializer is used only by the resolve
        # endpoint, so a valid action is expected here.
        # ====================================================

        return attrs


# ============================================================
# Moderation Reject Serializer
# ============================================================


class ModerationRejectSerializer(
    serializers.Serializer,
):

    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10000,
    )

    def validate_note(
        self,
        value,
    ):

        return value.strip()