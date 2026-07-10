from django.urls import path

from .views import (
    LikeDeleteView,
    LikeListCreateView,
)

app_name = "likes"

urlpatterns = [
    path(
        "",
        LikeListCreateView.as_view(),
        name="list-create",
    ),
    path(
        "<str:content_type>/<uuid:object_id>/",
        LikeDeleteView.as_view(),
        name="delete",
    ),
]