"""
URL configuration for my_school project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import (
    include,
    path,
)

from rest_framework_simplejwt.views import (
    TokenVerifyView,
)

from core.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
)


urlpatterns = [

    # ==========================================================
    # ADMIN
    # ==========================================================

    path(
        "admin/",
        admin.site.urls,
    ),

    # ==========================================================
    # DJOSER
    # ==========================================================

    path(
        "auth/",
        include("djoser.urls"),
    ),

    # ==========================================================
    # CUSTOM JWT LOGIN
    # ==========================================================

    path(
        "auth/jwt/create/",
        CustomTokenObtainPairView.as_view(),
        name="jwt-create",
    ),

    # ==========================================================
    # CUSTOM JWT REFRESH
    # ==========================================================

    path(
        "auth/jwt/refresh/",
        CustomTokenRefreshView.as_view(),
        name="jwt-refresh",
    ),

    # ==========================================================
    # JWT VERIFY
    # ==========================================================

    path(
        "auth/jwt/verify/",
        TokenVerifyView.as_view(),
        name="jwt-verify",
    ),

    # ==========================================================
    # SCHOOL
    # ==========================================================

    path(
        "school/",
        include("school.urls"),
    ),

    # ==========================================================
    # CHAT
    # ==========================================================

    path(
        "chat/",
        include("chat.urls"),
    ),

    # ==========================================================
    # USERS
    # ==========================================================

    path(
        "users/",
        include("core.urls"),
    ),

    # ==========================================================
    # COMMENTS
    # ==========================================================

    path(
        "comments/",
        include("comments.urls"),
    ),

    # ==========================================================
    # LIVE
    # ==========================================================

    path(
        "live/",
        include("live.urls"),
    ),

    # ==========================================================
    # LIKES
    # ==========================================================

    path(
        "likes/",
        include("likes.urls"),
    ),

    # ==========================================================
    # MODERATION
    # ==========================================================

    path(
        "moderation/",
        include("moderation.urls"),
    ),

    # ==========================================================
    # POSTS
    # ==========================================================

    path(
        "post/",
        include("post.urls"),
    ),

    # ==========================================================
    # RELATIONSHIPS
    # ==========================================================

    path(
        "relationships/",
        include("relationships.urls"),
    ),

    # ==========================================================
    # REPORTS
    # ==========================================================

    path(
        "reports/",
        include("reports.urls"),
    ),
]


# ==========================================================
# MEDIA
# ==========================================================

urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT,
)