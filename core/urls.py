from django.urls import path

from .views import (
    get_user_public_key,
    ProfileUpdateView,
    save_public_key,
    SaveDeviceView,
    UserDetailView,
    UserListView,
)


urlpatterns = [

    # ==========================================================
    # USERS
    # ==========================================================

    path(
        "",
        UserListView.as_view(),
        name="user-list",
    ),

    path(
        "<int:id>/",
        UserDetailView.as_view(),
        name="user-detail",
    ),

    # ==========================================================
    # PUBLIC KEY
    # ==========================================================

    path(
        "save-public-key/",
        save_public_key,
        name="save_public_key",
    ),

    path(
        "<int:user_id>/public-key/",
        get_user_public_key,
        name="get_user_public_key",
    ),

    # ==========================================================
    # DEVICE
    # ==========================================================

    path(
        "save-device/",
        SaveDeviceView.as_view(),
        name="save_device",
    ),

    # ==========================================================
    # PROFILE
    # ==========================================================

    path(
        "profile/",
        ProfileUpdateView.as_view(),
        name="profile",
    ),
]