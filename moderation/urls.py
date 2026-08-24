
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

router.register(
    "cases",
    ModerationCaseViewSet,
    basename="moderation-case",
)

router.register(
    "action-logs",
    ModerationActionLogViewSet,
    basename="moderation-action-log",
)

router.register(
    "users",
    UserModerationViewSet,
    basename="user-moderation",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]