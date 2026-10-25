
"""
URL configuration for my_school project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponseNotFound
from django.urls import (
    include,
    path,
    re_path,
)

from rest_framework_simplejwt.views import (
    TokenVerifyView,
)

from core.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
)


# ============================================================
# BLOCK DIRECT ACCESS TO POST MEDIA
# ============================================================

def block_direct_post_media(request, path=""):
    """
    Prevent direct access to original post media and previews.

    Post media must be served through the appropriate
    protected endpoint.
    """

    return HttpResponseNotFound(
        "Media not found.",
        content_type="text/plain",
    )


urlpatterns = [

    # ADMIN
    path(
        "admin/",
        admin.site.urls,
    ),

    # DJOSER
    path(
        "auth/",
        include("djoser.urls"),
    ),

    # CUSTOM JWT LOGIN
    path(
        "auth/jwt/create/",
        CustomTokenObtainPairView.as_view(),
        name="jwt-create",
    ),

    # CUSTOM JWT REFRESH
    path(
        "auth/jwt/refresh/",
        CustomTokenRefreshView.as_view(),
        name="jwt-refresh",
    ),

    # JWT VERIFY
    path(
        "auth/jwt/verify/",
        TokenVerifyView.as_view(),
        name="jwt-verify",
    ),

    # SCHOOL
    path(
        "school/",
        include("school.urls"),
    ),

    # CHAT
    path(
        "chat/",
        include("chat.urls"),
    ),

    # USERS
    path(
        "users/",
        include("core.urls"),
    ),

    # COMMENTS
    path(
        "comments/",
        include("comments.urls"),
    ),

    # FEED
    path(
        "feed/",
        include("feed.urls"),
    ),

    # LIVE
    path(
        "live/",
        include("live.urls"),
    ),

    # LIKES
    path(
        "likes/",
        include("likes.urls"),
    ),

    # MODERATION
    path(
        "moderation/",
        include("moderation.urls"),
    ),

    # POSTS
    path(
        "post/",
        include("post.urls"),
    ),

    # RELATIONSHIPS
    path(
        "relationships/",
        include("relationships.urls"),
    ),

    # REPORTS
    path(
        "reports/",
        include("reports.urls"),
    ),

    # SUBSCRIPTIONS
    path(
        "subscriptions/",
        include("Subscriptions.urls"),
    ),
]


# ============================================================
# MEDIA ROUTES - DEVELOPMENT ONLY
# ============================================================

if settings.DEBUG and settings.MEDIA_URL:

    media_prefix = settings.MEDIA_URL.lstrip("/")

    # Block direct access to originals and blurred previews
    # before Django's general development media route.
    urlpatterns += [
        re_path(
            rf"^{media_prefix}(?:posts|post_previews)/(?P<path>.*)$",
            block_direct_post_media,
            name="block-direct-post-media",
        ),
    ]

    # Keep other development media URLs available.
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
