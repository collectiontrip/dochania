from django.utils import timezone

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from moderation.models import UserModeration


# ==========================================================
# CUSTOM JWT AUTHENTICATION
# ==========================================================

class CustomJWTAuthentication(
    JWTAuthentication
):
    """
    Centralized JWT authentication for account moderation.

    Blocks API access for:
    - Permanently banned users
    - Currently suspended users

    Expired suspensions are automatically cleared.

    Restricted users are still allowed to authenticate.

    UserModeration records are NOT created automatically here.
    Missing moderation records simply mean the user has no
    moderation restriction.
    """

    def get_user(
        self,
        validated_token,
    ):

        # ======================================================
        # GET AUTHENTICATED USER
        # ======================================================

        user = super().get_user(
            validated_token
        )

        # ======================================================
        # GET MODERATION STATUS
        # ======================================================

        moderation = (
            UserModeration.objects
            .filter(
                user=user,
            )
            .first()
        )

        # ------------------------------------------------------
        # No moderation record
        # ------------------------------------------------------

        if moderation is None:
            return user

        now = timezone.now()

        # ======================================================
        # NORMALIZE EXPIRED SUSPENSION
        # ======================================================

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

        # ======================================================
        # PERMANENT BAN
        # ======================================================

        if moderation.is_banned:

            raise AuthenticationFailed(
                detail=(
                    "Your account has been "
                    "permanently banned."
                ),
                code="account_banned",
            )

        # ======================================================
        # ACTIVE SUSPENSION
        # ======================================================

        if moderation.is_suspended:

            # --------------------------------------------------
            # Suspension with expiry
            # --------------------------------------------------

            if moderation.suspension_expires_at:

                raise AuthenticationFailed(
                    detail=(
                        "Your account is currently "
                        "suspended until "
                        f"{moderation.suspension_expires_at.isoformat()}."
                    ),
                    code="account_suspended",
                )

            # --------------------------------------------------
            # Indefinite suspension
            # --------------------------------------------------

            raise AuthenticationFailed(
                detail=(
                    "Your account is currently suspended."
                ),
                code="account_suspended",
            )

        # ======================================================
        # RESTRICTED USERS
        # ======================================================
        #
        # Restricted users are intentionally allowed through
        # authentication. Feature/action level restrictions
        # should be enforced separately.
        # ======================================================

        return user