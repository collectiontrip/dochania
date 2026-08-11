"""
Django settings for my_school project.
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ==========================================================
# SECURITY
# ==========================================================

SECRET_KEY = os.getenv("SECRET_KEY")

DEBUG = os.getenv("DEBUG", "False") == "True"

ALLOWED_HOSTS = os.getenv(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost",
).split(",")


# ==========================================================
# APPLICATIONS
# ==========================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "channels",
    "django.contrib.sites",

    "rest_framework",
    "django_filters",
    "djoser",

    "common",
    "core",
    "post",
    "comments",
    "likes",
    "relationships",
    "reports",
    "notification",
    "chat",
    "live.apps.LiveConfig",
    "Subscriptions",
    "school",
]

SITE_ID = 1


# ==========================================================
# MIDDLEWARE
# ==========================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ==========================================================
# URLS
# ==========================================================

ROOT_URLCONF = "my_school.urls"


# ==========================================================
# TEMPLATES
# ==========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ==========================================================
# WSGI / ASGI
# ==========================================================

WSGI_APPLICATION = "my_school.wsgi.application"

ASGI_APPLICATION = "my_school.asgi.application"


# ==========================================================
# DATABASE
# ==========================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "mysql"),
        "PORT": os.getenv("DB_PORT", "3306"),
    }
}


# ==========================================================
# PASSWORD VALIDATION
# ==========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ==========================================================
# INTERNATIONALIZATION
# ==========================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# ==========================================================
# STATIC / MEDIA
# ==========================================================

STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "core.User"


# ==========================================================
# DJANGO REST FRAMEWORK
# ==========================================================

REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),

    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
}


# ==========================================================
# FRONTEND
# ==========================================================

FRONTEND_URL = os.getenv("FRONTEND_URL")


# ==========================================================
# DJOSER
# ==========================================================

DJOSER = {

    "SERIALIZERS": {
        "user_create": "core.serializers.UserCreateSerializer",
        "user": "core.serializers.UserSerializer",
        "current_user": "core.serializers.UserSerializer",

        "token_create": ( 
            "core.serializers.CustomTokenObtainPairSerializer" 
        ),
    },


    "PERMISSIONS": {
        "user_list": [
            "rest_framework.permissions.IsAuthenticated"
        ],

        "user": [
            "rest_framework.permissions.IsAuthenticated"
        ],

        "current_user": [
            "rest_framework.permissions.IsAuthenticated"
        ],
    },


    "HIDE_USERS": False,


    "PASSWORD_RESET_CONFIRM_URL":
        "password/reset/confirm/{uid}/{token}",


    "ACTIVATION_URL":
        "activate/{uid}/{token}",


    "SEND_ACTIVATION_EMAIL": True,

    "SEND_CONFIRMATION_EMAIL": True,

    "PASSWORD_CHANGED_EMAIL_CONFIRMATION": True,
}


# ==========================================================
# JWT
# ==========================================================

SIMPLE_JWT = {

    "AUTH_HEADER_TYPES": (
        "JWT",
    ),


    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(
            os.getenv(
                "ACCESS_TOKEN_LIFETIME",
                5
            )
        )
    ),


    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(
            os.getenv(
                "REFRESH_TOKEN_LIFETIME",
                17
            )
        )
    ),


    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": True,
}


# ==========================================================
# CORS
# ==========================================================

CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True


CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# ==========================================================
# CHANNELS
# ==========================================================

CHANNEL_LAYERS = {

    "default": {

        "BACKEND":
            "channels_redis.core.RedisChannelLayer",


        "CONFIG": {

            "hosts": [
                (
                    os.getenv(
                        "REDIS_HOST",
                        "redis"
                    ),

                    int(
                        os.getenv(
                            "REDIS_PORT",
                            6379
                        )
                    ),
                )
            ],
        },
    },
}


# ==========================================================
# CELERY
# ==========================================================

CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    "redis://redis:6379/0"
)


CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    "redis://redis:6379/0"
)


CELERY_ACCEPT_CONTENT = [
    "json"
]


CELERY_TASK_SERIALIZER = "json"


CELERY_RESULT_SERIALIZER = "json"


CELERY_TIMEZONE = TIME_ZONE


# ==========================================================
# EMAIL
# ==========================================================

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)


EMAIL_HOST = os.getenv(
    "EMAIL_HOST"
)


EMAIL_PORT = int(
    os.getenv(
        "EMAIL_PORT",
        587
    )
)


EMAIL_USE_TLS = os.getenv(
    "EMAIL_USE_TLS",
    "True"
) == "True"


EMAIL_USE_SSL = os.getenv(
    "EMAIL_USE_SSL",
    "False"
) == "True"


EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER"
)


EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD"
)


DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "noreply@localhost",
)


SERVER_EMAIL = DEFAULT_FROM_EMAIL