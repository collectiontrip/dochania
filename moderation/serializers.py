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

from .constants import (
    MODERATION_DECISION_CHOICES,
)

from .models import (
    ModerationActionLog,
    ModerationCase,
    UserModeration,
)


# ============================================================
# Moderator User Serializer
# ============================================================


class ModeratorUserSerializer(serializers.Serializer):

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
            "started_at",
            "resolved_at",
            "created_at",
            "updated_at",
            "action_logs",
        ]

    def validate_decision(self, value):

        if value is None:
            return value

        if not isinstance(value, str):
            raise serializers.ValidationError(
                "Invalid decision value."
            )

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Decision cannot be empty."
            )

        valid_decisions = {
            choice[0]
            for choice in MODERATION_DECISION_CHOICES
        }

        if value not in valid_decisions:
            raise serializers.ValidationError(
                "Invalid moderation decision."
            )

        return value

    def validate_moderator_note(self, value):

        if value is None:
            return ""

        if len(value) > 10000:
            raise serializers.ValidationError(
                "Moderator note cannot exceed "
                "10000 characters."
            )

        return value


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

    def validate(self, attrs):

        now = timezone.now()

        is_restricted = attrs.get(
            "is_restricted",
            getattr(
                self.instance,
                "is_restricted",
                False,
            ),
        )

        restriction_expires_at = attrs.get(
            "restriction_expires_at",
            getattr(
                self.instance,
                "restriction_expires_at",
                None,
            ),
        )

        is_suspended = attrs.get(
            "is_suspended",
            getattr(
                self.instance,
                "is_suspended",
                False,
            ),
        )

        suspension_expires_at = attrs.get(
            "suspension_expires_at",
            getattr(
                self.instance,
                "suspension_expires_at",
                None,
            ),
        )

        is_banned = attrs.get(
            "is_banned",
            getattr(
                self.instance,
                "is_banned",
                False,
            ),
        )

        ban_reason = attrs.get(
            "ban_reason",
            getattr(
                self.instance,
                "ban_reason",
                "",
            ),
        )

        # ----------------------------------------------------
        # Restriction Validation
        # ----------------------------------------------------

        if (
            is_restricted
            and restriction_expires_at is not None
            and restriction_expires_at <= now
        ):
            raise serializers.ValidationError({
                "restriction_expires_at": (
                    "Restriction expiry must be "
                    "in the future."
                )
            })

        # ----------------------------------------------------
        # Suspension Validation
        # ----------------------------------------------------

        if (
            is_suspended
            and suspension_expires_at is not None
            and suspension_expires_at <= now
        ):
            raise serializers.ValidationError({
                "suspension_expires_at": (
                    "Suspension expiry must be "
                    "in the future."
                )
            })

        # ----------------------------------------------------
        # Ban Validation
        # ----------------------------------------------------

        if is_banned:

            if (
                not ban_reason
                or not ban_reason.strip()
            ):
                raise serializers.ValidationError({
                    "ban_reason": (
                        "Ban reason is required "
                        "when the user is banned."
                    )
                })

            if len(ban_reason) > 10000:
                raise serializers.ValidationError({
                    "ban_reason": (
                        "Ban reason cannot exceed "
                        "10000 characters."
                    )
                })

        return attrs


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

    def validate_action_reason(self, value):

        return value.strip()

    def validate_note(self, value):

        return value.strip()

    def validate(self, attrs):

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

        # ----------------------------------------------------
        # Restriction Expiry
        # ----------------------------------------------------

        if restriction_expires_at is not None:

            if action != REPORT_ACTION_ACCOUNT_RESTRICTED:
                raise serializers.ValidationError({
                    "restriction_expires_at": (
                        "Restriction expiry can only "
                        "be provided for an account "
                        "restriction action."
                    )
                })

            if restriction_expires_at <= now:
                raise serializers.ValidationError({
                    "restriction_expires_at": (
                        "Restriction expiry must be "
                        "in the future."
                    )
                })

        # ----------------------------------------------------
        # Suspension Expiry
        # ----------------------------------------------------

        if suspension_expires_at is not None:

            if action != REPORT_ACTION_ACCOUNT_SUSPENDED:
                raise serializers.ValidationError({
                    "suspension_expires_at": (
                        "Suspension expiry can only "
                        "be provided for an account "
                        "suspension action."
                    )
                })

            if suspension_expires_at <= now:
                raise serializers.ValidationError({
                    "suspension_expires_at": (
                        "Suspension expiry must be "
                        "in the future."
                    )
                })

        # ----------------------------------------------------
        # Permanent Action
        # ----------------------------------------------------

        if is_permanent:

            if action not in {
                REPORT_ACTION_ACCOUNT_BANNED,
                REPORT_ACTION_ACCOUNT_SUSPENDED,
                REPORT_ACTION_ACCOUNT_RESTRICTED,
            }:
                raise serializers.ValidationError({
                    "is_permanent": (
                        "Permanent action is only valid "
                        "for account restriction, "
                        "suspension, or ban."
                    )
                })

        # ----------------------------------------------------
        # Permanent + Expiry Conflict
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Restriction Action
        # ----------------------------------------------------

        if action == REPORT_ACTION_ACCOUNT_RESTRICTED:

            if (
                restriction_expires_at is None
                and not is_permanent
            ):
                raise serializers.ValidationError({
                    "restriction_expires_at": (
                        "Restriction expiry is required "
                        "unless the restriction is permanent."
                    )
                })

        # ----------------------------------------------------
        # Suspension Action
        # ----------------------------------------------------

        if action == REPORT_ACTION_ACCOUNT_SUSPENDED:

            if (
                suspension_expires_at is None
                and not is_permanent
            ):
                raise serializers.ValidationError({
                    "suspension_expires_at": (
                        "Suspension expiry is required "
                        "unless the suspension is permanent."
                    )
                })

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

    def validate_note(self, value):

        return value.strip()