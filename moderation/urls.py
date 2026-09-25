from django.urls import (
    include,
    path,
)

from rest_framework.routers import DefaultRouter

from .views import (
    ModerationActionLogViewSet,
    ModerationCaseViewSet,
    UserModerationViewSet,
)


router = DefaultRouter()


# ==========================================================
# MODERATION CASES
# ==========================================================

router.register(
    "cases",
    ModerationCaseViewSet,
    basename="moderation-case",
)


# ==========================================================
# MODERATION ACTION LOGS
# ==========================================================

router.register(
    "action-logs",
    ModerationActionLogViewSet,
    basename="moderation-action-log",
)


# ==========================================================
# USER MODERATION
# ==========================================================

router.register(
    "users",
    UserModerationViewSet,
    basename="user-moderation",
)


urlpatterns = [

    # ======================================================
    # ROUTER URLS
    # ======================================================

    path(
        "",
        include(router.urls),
    ),
]