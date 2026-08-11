from djoser.serializers import (
    UserCreateSerializer as BaseUserCreateSerializer,
    UserSerializer as BaseUserSerializer,
)

from rest_framework import serializers

from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
)

from core.tasks import send_account_locked_email

from django.contrib.auth import get_user_model
from django.utils import timezone

from datetime import timedelta

from .models import User
from relationships.models import Follow, Block


# ==========================================================
# USER CREATE SERIALIZER
# ==========================================================


class UserCreateSerializer(BaseUserCreateSerializer):

    password = serializers.CharField(
        write_only=True,
        required=True,
    )

    re_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    class Meta(BaseUserCreateSerializer.Meta):

        model = User

        fields = [
            "id",
            "username",
            "email",
            "password",
            "re_password",
            "first_name",
            "last_name",
        ]

    def validate(self, attrs):

        if attrs["password"] != attrs["re_password"]:

            raise serializers.ValidationError(
                {
                    "password": (
                        "Password fields didn't match."
                    )
                }
            )

        return attrs

    def create(self, validated_data):

        validated_data.pop("re_password")

        password = validated_data.pop("password")

        user = User(**validated_data)

        user.set_password(password)

        # Account remains inactive until email activation
        user.is_active = False

        user.save()

        return user


# ==========================================================
# USER SERIALIZER
# ==========================================================


class UserSerializer(BaseUserSerializer):

    is_following = serializers.SerializerMethodField()
    is_followed_by = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    blocked_you = serializers.SerializerMethodField()

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    coin_balance = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):

        model = User

        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_online",
            "last_seen",
            "bio",
            "profile_picture",
            "is_private",
            "is_following",
            "is_followed_by",
            "is_blocked",
            "blocked_you",
            "followers_count",
            "following_count",
            "coin_balance",
        ]

    # ======================================================
    # FOLLOWING
    # ======================================================

    def get_is_following(self, obj):

        request = self.context.get("request")

        if (
            not request
            or not request.user.is_authenticated
        ):
            return False

        return Follow.objects.filter(
            follower=request.user,
            following=obj,
        ).exists()

    # ======================================================
    # FOLLOWED BY
    # ======================================================

    def get_is_followed_by(self, obj):

        request = self.context.get("request")

        if (
            not request
            or not request.user.is_authenticated
        ):
            return False

        return Follow.objects.filter(
            follower=obj,
            following=request.user,
        ).exists()

    # ======================================================
    # BLOCKED
    # ======================================================

    def get_is_blocked(self, obj):

        request = self.context.get("request")

        if (
            not request
            or not request.user.is_authenticated
        ):
            return False

        return Block.objects.filter(
            blocker=request.user,
            blocked=obj,
        ).exists()

    # ======================================================
    # BLOCKED YOU
    # ======================================================

    def get_blocked_you(self, obj):

        request = self.context.get("request")

        if (
            not request
            or not request.user.is_authenticated
        ):
            return False

        return Block.objects.filter(
            blocker=obj,
            blocked=request.user,
        ).exists()

    # ======================================================
    # FOLLOWERS COUNT
    # ======================================================

    def get_followers_count(self, obj):

        return Follow.objects.filter(
            following=obj,
        ).count()

    # ======================================================
    # FOLLOWING COUNT
    # ======================================================

    def get_following_count(self, obj):

        return Follow.objects.filter(
            follower=obj,
        ).count()

    # ======================================================
    # COIN BALANCE
    # ======================================================

    def get_coin_balance(self, obj):

        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and request.user == obj
        ):
            return obj.coin_wallet.balance

        return None


# ==========================================================
# PROFILE UPDATE SERIALIZER
# ==========================================================


class ProfileUpdateSerializer(serializers.ModelSerializer):

    class Meta:

        model = User

        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "bio",
            "profile_picture",
            "is_private",
        ]


# ==========================================================
# USER MINI SERIALIZER
# ==========================================================


class UserMiniSerializer(serializers.ModelSerializer):

    full_name = serializers.SerializerMethodField()

    class Meta:

        model = User

        fields = [
            "id",
            "username",
            "full_name",
            "profile_picture",
            "is_verified",
            "is_online",
        ]

        read_only_fields = fields

    def get_full_name(self, obj):

        return (
            f"{obj.first_name} {obj.last_name}"
        ).strip()


# ==========================================================
# CUSTOM JWT LOGIN SERIALIZER
# ==========================================================


class CustomTokenObtainPairSerializer(
    TokenObtainPairSerializer
):

    # Maximum failed password attempts
    MAX_FAILED_ATTEMPTS = 3

    # Account lock duration
    LOCK_DURATION_HOURS = 72

    def validate(self, attrs):

        username = attrs.get("username")
        password = attrs.get("password")

        User = get_user_model()

        now = timezone.now()

        # ==================================================
        # Find User
        # ==================================================

        user = (
            User.objects
            .filter(username=username)
            .first()
        )

        # ==================================================
        # Unknown Username
        # ==================================================

        if user is None:

            raise serializers.ValidationError(
                {
                    "detail": (
                        "Invalid username or password."
                    )
                }
            )

        # ==================================================
        # Check Existing Lock
        # ==================================================

        if (
            user.locked_until
            and user.locked_until > now
        ):

            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your account is temporarily "
                        "locked. Please try again later."
                    ),
                    "locked": True,
                    "locked_until": user.locked_until,
                }
            )

        # ==================================================
        # Clear Expired Lock
        # ==================================================

        if (
            user.locked_until
            and user.locked_until <= now
        ):

            user.failed_login_attempts = 0
            user.locked_until = None
            user.last_failed_login_at = None

            user.save(
                update_fields=[
                    "failed_login_attempts",
                    "locked_until",
                    "last_failed_login_at",
                ]
            )

        # ==================================================
        # Check Account Activation
        #
        # Inactive accounts do NOT consume failed
        # password attempts.
        # ==================================================

        if not user.is_active:

            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your account is inactive. "
                        "Please activate your account first."
                    ),
                    "account_inactive": True,
                    "can_resend_activation": True,
                }
            )

        # ==================================================
        # Check Password
        # ==================================================

        if not user.check_password(password):

            user.failed_login_attempts += 1
            user.last_failed_login_at = now

            update_fields = [
                "failed_login_attempts",
                "last_failed_login_at",
            ]

            # ==================================================
            # THIRD FAILED ATTEMPT
            #
            # Lock account for 72 hours
            # ==================================================

            if (
                user.failed_login_attempts
                >= self.MAX_FAILED_ATTEMPTS
            ):

                user.locked_until = (
                    now
                    + timedelta(
                        hours=self.LOCK_DURATION_HOURS
                    )
                )

                update_fields.append(
                    "locked_until"
                )

                user.save(
                    update_fields=update_fields
                )

                # ==================================================
                # SEND ACCOUNT LOCKED EMAIL
                #
                # Send the arguments expected by the Celery task:
                #
                # user_email
                # username
                # locked_until
                # ==================================================

                try:

                    send_account_locked_email.delay(
                        user.email,
                        user.username,
                        user.locked_until,
                    )

                except Exception as email_error:

                    # Email failure must NOT prevent
                    # account from being locked.

                    print(
                        "❌ Failed to queue account "
                        f"locked email: {email_error}"
                    )

                # ==================================================
                # Return Locked Response
                # ==================================================

                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Too many failed login attempts. "
                            "Your account has been locked "
                            "for 72 hours."
                        ),
                        "locked": True,
                        "locked_until": (
                            user.locked_until
                        ),
                    }
                )

            # ==================================================
            # Save Failed Attempt
            # ==================================================

            user.save(
                update_fields=update_fields
            )

            # ==================================================
            # Remaining Attempts
            # ==================================================

            remaining_attempts = (
                self.MAX_FAILED_ATTEMPTS
                - user.failed_login_attempts
            )

            raise serializers.ValidationError(
                {
                    "detail": (
                        "Invalid username or password."
                    ),
                    "remaining_attempts": (
                        remaining_attempts
                    ),
                }
            )

        # ==================================================
        # SUCCESSFUL LOGIN
        #
        # Reset failed login information.
        # ==================================================

        if (
            user.failed_login_attempts != 0
            or user.locked_until is not None
            or user.last_failed_login_at is not None
        ):

            user.failed_login_attempts = 0
            user.locked_until = None
            user.last_failed_login_at = None

            user.save(
                update_fields=[
                    "failed_login_attempts",
                    "locked_until",
                    "last_failed_login_at",
                ]
            )

        # ==================================================
        # Generate Normal JWT Response
        # ==================================================

        return super().validate(attrs)