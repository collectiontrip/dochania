
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from djoser.serializers import (
    UserCreateSerializer as BaseUserCreateSerializer,
    UserSerializer as BaseUserSerializer,
)

from rest_framework import serializers

from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)

from rest_framework_simplejwt.tokens import RefreshToken

from core.tasks import send_account_locked_email

from relationships.models import (
    Follow,
    Block,
)

from moderation.models import UserModeration

from Subscriptions.models import (
    UserSubscription,
)

from .models import User


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
                    "password": "Password fields didn't match."
                }
            )

        return attrs

    def create(self, validated_data):

        validated_data.pop("re_password")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)

        # Account remains inactive until email activation.
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

    is_subscribed_to_me = serializers.SerializerMethodField()
    am_i_subscribed = serializers.SerializerMethodField()

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

            # ACCOUNT / MODERATION STATUS
            "is_active",
            "is_moderator",
            "is_superuser",

            # ONLINE / ACTIVITY
            "is_online",
            "last_seen",

            # PROFILE
            "bio",
            "profile_picture",
            "is_private",

            # FOLLOW / BLOCK
            "is_following",
            "is_followed_by",
            "is_blocked",
            "blocked_you",

            # SUBSCRIPTION STATUS
            "is_subscribed_to_me",
            "am_i_subscribed",

            # COUNTS
            "followers_count",
            "following_count",

            # COINS
            "coin_balance",
        ]

        read_only_fields = [
            "id",
            "is_active",
            "is_moderator",
            "is_superuser",
            "is_online",
            "last_seen",
            "is_following",
            "is_followed_by",
            "is_blocked",
            "blocked_you",
            "is_subscribed_to_me",
            "am_i_subscribed",
            "followers_count",
            "following_count",
            "coin_balance",
        ]

    # ======================================================
    # AUTHENTICATED REQUEST USER
    # ======================================================

    def _get_request_user(self):

        request = self.context.get("request")

        if request and request.user.is_authenticated:
            return request.user

        return None

    # ======================================================
    # FOLLOWING
    # ======================================================

    def get_is_following(self, obj):

        request_user = self._get_request_user()

        if not request_user:
            return False

        return Follow.objects.filter(
            follower=request_user,
            following=obj,
        ).exists()

    # ======================================================
    # FOLLOWED BY
    # ======================================================

    def get_is_followed_by(self, obj):

        request_user = self._get_request_user()

        if not request_user:
            return False

        return Follow.objects.filter(
            follower=obj,
            following=request_user,
        ).exists()

    # ======================================================
    # BLOCKED
    # ======================================================

    def get_is_blocked(self, obj):

        request_user = self._get_request_user()

        if not request_user:
            return False

        return Block.objects.filter(
            blocker=request_user,
            blocked=obj,
        ).exists()

    # ======================================================
    # BLOCKED YOU
    # ======================================================

    def get_blocked_you(self, obj):

        request_user = self._get_request_user()

        if not request_user:
            return False

        return Block.objects.filter(
            blocker=obj,
            blocked=request_user,
        ).exists()

    # ======================================================
    # ACTIVE SUBSCRIPTION HELPER
    # ======================================================

    def _has_active_subscription(self, subscriber, creator):

        if not subscriber or not creator:
            return False

        if subscriber.pk == creator.pk:
            return False

        now = timezone.now()

        return UserSubscription.objects.filter(
            subscriber=subscriber,
            creator=creator,
            status=UserSubscription.STATUS_ACTIVE,
            start_date__lte=now,
            end_date__gt=now,
        ).exists()

    # ======================================================
    # IS PROFILE USER SUBSCRIBED TO LOGGED-IN USER?
    #
    # obj = profile user
    # request_user = logged-in user
    # ======================================================

    def get_is_subscribed_to_me(self, obj):

        request_user = self._get_request_user()

        if not request_user:
            return False

        if request_user.pk == obj.pk:
            return False

        return self._has_active_subscription(
            subscriber=obj,
            creator=request_user,
        )

    # ======================================================
    # IS LOGGED-IN USER SUBSCRIBED TO PROFILE USER?
    #
    # obj = profile user
    # request_user = logged-in user
    # ======================================================

    def get_am_i_subscribed(self, obj):

        request_user = self._get_request_user()

        if not request_user:
            return False

        if request_user.pk == obj.pk:
            return False

        return self._has_active_subscription(
            subscriber=request_user,
            creator=obj,
        )

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

        request_user = self._get_request_user()

        # Only the owner can see their own wallet balance.
        if not request_user or request_user.pk != obj.pk:
            return None

        try:
            wallet = obj.coin_wallet
        except User.coin_wallet.RelatedObjectDoesNotExist:
            return 0

        return wallet.balance


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

        return f"{obj.first_name} {obj.last_name}".strip()


# ==========================================================
# SHARED MODERATION CHECK
# ==========================================================


def check_user_moderation(user, now=None):

    if now is None:
        now = timezone.now()

    moderation = (
        UserModeration.objects
        .filter(user=user)
        .first()
    )

    if not moderation:
        return

    # Normalize an expired suspension.
    if (
        moderation.is_suspended
        and moderation.suspension_expires_at
        and moderation.suspension_expires_at <= now
    ):

        moderation.is_suspended = False
        moderation.suspension_expires_at = None

        moderation.save(
            update_fields=[
                "is_suspended",
                "suspension_expires_at",
                "updated_at",
            ]
        )

    if moderation.is_banned:
        raise serializers.ValidationError(
            {
                "detail": (
                    "Your account has been permanently banned."
                ),
                "account_banned": True,
            }
        )

    if moderation.is_suspended:
        raise serializers.ValidationError(
            {
                "detail": "Your account is currently suspended.",
                "account_suspended": True,
                "suspension_expires_at": (
                    moderation.suspension_expires_at
                ),
            }
        )


# ==========================================================
# CUSTOM JWT LOGIN SERIALIZER
# ==========================================================


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    MAX_FAILED_ATTEMPTS = 3
    LOCK_DURATION_HOURS = 72

    def validate(self, attrs):

        username = attrs.get("username")
        password = attrs.get("password")

        UserModel = get_user_model()
        now = timezone.now()

        user = (
            UserModel.objects
            .filter(username=username)
            .first()
        )

        if user is None:
            raise serializers.ValidationError(
                {
                    "detail": "Invalid username or password."
                }
            )

        # CHECK EXISTING LOGIN LOCK
        if user.locked_until and user.locked_until > now:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your account is temporarily locked. "
                        "Please try again later."
                    ),
                    "locked": True,
                    "locked_until": user.locked_until,
                }
            )

        # CLEAR EXPIRED LOGIN LOCK
        if user.locked_until and user.locked_until <= now:

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

        # CHECK ACCOUNT ACTIVATION
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

        # CHECK MODERATION STATUS
        check_user_moderation(user, now)

        # CHECK PASSWORD
        if not user.check_password(password):

            user.failed_login_attempts += 1
            user.last_failed_login_at = now

            update_fields = [
                "failed_login_attempts",
                "last_failed_login_at",
            ]

            # THIRD FAILED ATTEMPT: LOCK FOR 72 HOURS
            if (
                user.failed_login_attempts
                >= self.MAX_FAILED_ATTEMPTS
            ):

                user.locked_until = (
                    now + timedelta(
                        hours=self.LOCK_DURATION_HOURS
                    )
                )

                update_fields.append("locked_until")

                user.save(update_fields=update_fields)

                # Email failure must not prevent account locking.
                try:
                    send_account_locked_email.delay(
                        user.email,
                        user.username,
                        user.locked_until,
                    )
                except Exception:
                    pass

                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Too many failed login attempts. "
                            "Your account has been locked for 72 hours."
                        ),
                        "locked": True,
                        "locked_until": user.locked_until,
                    }
                )

            user.save(update_fields=update_fields)

            remaining_attempts = (
                self.MAX_FAILED_ATTEMPTS
                - user.failed_login_attempts
            )

            raise serializers.ValidationError(
                {
                    "detail": "Invalid username or password.",
                    "remaining_attempts": remaining_attempts,
                }
            )

        # SUCCESSFUL LOGIN: RESET FAILED ATTEMPTS
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

        # Generate normal JWT response.
        return super().validate(attrs)


# ==========================================================
# CUSTOM JWT REFRESH SERIALIZER
# ==========================================================


class CustomTokenRefreshSerializer(TokenRefreshSerializer):

    def validate(self, attrs):

        # VALIDATE REFRESH TOKEN BEFORE ROTATION
        try:
            refresh_token = RefreshToken(attrs["refresh"])
        except Exception:
            raise serializers.ValidationError(
                {
                    "detail": "Invalid or expired refresh token."
                }
            )

        user_id = refresh_token.get("user_id")

        if not user_id:
            raise serializers.ValidationError(
                {
                    "detail": "Invalid refresh token."
                }
            )

        UserModel = get_user_model()

        user = (
            UserModel.objects
            .filter(pk=user_id)
            .first()
        )

        if user is None:
            raise serializers.ValidationError(
                {
                    "detail": "User account no longer exists."
                }
            )

        # CHECK ACCOUNT STATUS
        if not user.is_active:
            raise serializers.ValidationError(
                {
                    "detail": "Your account is inactive.",
                    "account_inactive": True,
                }
            )

        now = timezone.now()

        # CHECK LOGIN LOCK
        if user.locked_until and user.locked_until > now:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your account is temporarily locked. "
                        "Please try again later."
                    ),
                    "locked": True,
                    "locked_until": user.locked_until,
                }
            )

        # CHECK MODERATION STATUS
        check_user_moderation(user, now)

        # Rotate token only after all account checks.
        return super().validate(attrs)
