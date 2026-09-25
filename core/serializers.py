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

from rest_framework_simplejwt.tokens import (
    RefreshToken,
)

from core.tasks import send_account_locked_email

from relationships.models import (
    Follow,
    Block,
)

from moderation.models import (
    UserModeration,
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

            # ------------------------------------------------
            # ACCOUNT / MODERATION STATUS
            # ------------------------------------------------

            "is_active",
            "is_moderator",
            "is_superuser",

            # ------------------------------------------------
            # ONLINE / ACTIVITY
            # ------------------------------------------------

            "is_online",
            "last_seen",

            # ------------------------------------------------
            # PROFILE
            # ------------------------------------------------

            "bio",
            "profile_picture",
            "is_private",

            # ------------------------------------------------
            # RELATIONSHIPS
            # ------------------------------------------------

            "is_following",
            "is_followed_by",
            "is_blocked",
            "blocked_you",

            # ------------------------------------------------
            # COUNTS
            # ------------------------------------------------

            "followers_count",
            "following_count",

            # ------------------------------------------------
            # COINS
            # ------------------------------------------------

            "coin_balance",
        ]

        read_only_fields = [
            "is_active",
            "is_moderator",
            "is_superuser",
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

        UserModel = get_user_model()

        now = timezone.now()

        # ==================================================
        # FIND USER
        # ==================================================

        user = (
            UserModel.objects
            .filter(username=username)
            .first()
        )

        # ==================================================
        # UNKNOWN USERNAME
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
        # CHECK EXISTING LOGIN LOCK
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
        # CLEAR EXPIRED LOGIN LOCK
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
        # CHECK ACCOUNT ACTIVATION
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
        # CHECK MODERATION STATUS
        #
        # Restriction does NOT prevent login.
        #
        # Suspension and permanent ban DO prevent login.
        # ==================================================

        moderation = (
            UserModeration.objects
            .filter(
                user=user,
            )
            .first()
        )

        if moderation:

            # ------------------------------------------------
            # NORMALIZE EXPIRED SUSPENSION
            # ------------------------------------------------

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

            # ------------------------------------------------
            # PERMANENT BAN
            # ------------------------------------------------

            if moderation.is_banned:

                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Your account has been "
                            "permanently banned."
                        ),
                        "account_banned": True,
                    }
                )

            # ------------------------------------------------
            # ACTIVE SUSPENSION
            # ------------------------------------------------

            if moderation.is_suspended:

                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Your account is currently "
                            "suspended."
                        ),
                        "account_suspended": True,
                        "suspension_expires_at": (
                            moderation.suspension_expires_at
                        ),
                    }
                )

        # ==================================================
        # CHECK PASSWORD
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
            # Lock account for 72 hours.
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
                # RETURN LOCKED RESPONSE
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
            # SAVE FAILED ATTEMPT
            # ==================================================

            user.save(
                update_fields=update_fields
            )

            # ==================================================
            # REMAINING ATTEMPTS
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
        # GENERATE NORMAL JWT RESPONSE
        # ==================================================

        return super().validate(attrs)


# ==========================================================
# CUSTOM JWT REFRESH SERIALIZER
# ==========================================================


class CustomTokenRefreshSerializer(
    TokenRefreshSerializer
):

    def validate(self, attrs):

        # ==================================================
        # VALIDATE REFRESH TOKEN FIRST
        #
        # IMPORTANT:
        # Do NOT call super().validate() yet.
        #
        # Token rotation/blacklisting may happen inside
        # the parent serializer. We must check account
        # moderation status BEFORE allowing rotation.
        # ==================================================

        refresh_token = RefreshToken(
            attrs["refresh"]
        )

        # ==================================================
        # GET USER ID FROM REFRESH TOKEN
        # ==================================================

        user_id = refresh_token.get("user_id")

        if not user_id:

            raise serializers.ValidationError(
                {
                    "detail": (
                        "Invalid refresh token."
                    )
                }
            )

        # ==================================================
        # FIND USER
        # ==================================================

        UserModel = get_user_model()

        user = (
            UserModel.objects
            .filter(
                id=user_id,
            )
            .first()
        )

        if user is None:

            raise serializers.ValidationError(
                {
                    "detail": (
                        "User account no longer exists."
                    )
                }
            )

        # ==================================================
        # CHECK ACCOUNT STATUS
        # ==================================================

        if not user.is_active:

            raise serializers.ValidationError(
                {
                    "detail": (
                        "Your account is inactive."
                    ),
                    "account_inactive": True,
                }
            )

        now = timezone.now()

        # ==================================================
        # CHECK MODERATION STATUS
        # ==================================================

        moderation = (
            UserModeration.objects
            .filter(
                user=user,
            )
            .first()
        )

        if moderation:

            # ------------------------------------------------
            # NORMALIZE EXPIRED SUSPENSION
            # ------------------------------------------------

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

            # ------------------------------------------------
            # PERMANENT BAN
            # ------------------------------------------------

            if moderation.is_banned:

                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Your account has been "
                            "permanently banned."
                        ),
                        "account_banned": True,
                    }
                )

            # ------------------------------------------------
            # ACTIVE SUSPENSION
            # ------------------------------------------------

            if moderation.is_suspended:

                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Your account is currently "
                            "suspended."
                        ),
                        "account_suspended": True,
                        "suspension_expires_at": (
                            moderation.suspension_expires_at
                        ),
                    }
                )

        # ==================================================
        # GENERATE / ROTATE NEW TOKEN
        #
        # Moderation checks have passed, so token rotation
        # can safely happen now.
        # ==================================================

        return super().validate(attrs)