from django.urls import path
from .views import save_public_key, get_user_public_key

urlpatterns = [
    path("save-public-key/", save_public_key, name="save_public_key"),
    path("<int:user_id>/public-key/", get_user_public_key, name="get_user_public_key"),
]