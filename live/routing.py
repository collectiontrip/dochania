from django.urls import re_path
from .consumers import LiveConsumer

websocket_urlpatterns = [
    re_path(r'ws/live/(?P<session_id>\d+)/$', LiveConsumer.as_asgi()),
]