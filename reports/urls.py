from django.urls import include
from django.urls import path

from rest_framework.routers import DefaultRouter

from .views import ReportViewSet


app_name = "reports"


router = DefaultRouter()

router.register(
    r"",
    ReportViewSet,
    basename="report",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]