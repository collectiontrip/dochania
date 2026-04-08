import json
import logging
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import LiveSession, LiveMessage, LiveViewer

logger = logging.getLogger(__name__)
User = get_user_model()


class LiveConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = None
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.room_group_name = f"live_{self.session_id}"

        # -------------------------------
        # ✅ Query params parse (SAFE)
        # -------------------------------
        query_string = self.scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if not token:
            await self.close()
            return

        # -------------------------------
        # ✅ JWT validation (SimpleJWT)
        # -------------------------------
        try:
            access_token = AccessToken(token)
            user_id = access_token["user_id"]

            self.user = await database_sync_to_async(User.objects.get)(
                id=user_id
            )

        except TokenError as e:
            logger.error(f"JWT Token error: {e}")
            await self.close()
            return

        except Exception as e:
            logger.error(f"User fetch error: {e}")
            await self.close()
            return

        # -------------------------------
        # ✅ Check live session
        # -------------------------------
        is_valid = await self.check_session(self.session_id)

        if not is_valid:
            await self.close()
            return

        # -------------------------------
        # ✅ Join group
        # -------------------------------
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # -------------------------------
        # ✅ Add viewer
        # -------------------------------
        await self.add_viewer(self.session_id, self.user.id)

        count = await self.get_viewer_count(self.session_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_update",
                "count": count
            }
        )

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        if self.user:
            await self.remove_viewer(self.session_id, self.user.id)

            count = await self.get_viewer_count(self.session_id)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "viewer_update",
                    "count": count
                }
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")

        # -------------------------------
        # 💬 Message
        # -------------------------------
        if action == "message":
            message = data.get("message")

            if not message:
                return

            msg = await self.save_message(
                self.session_id,
                self.user.id,
                message
            )

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "live_message",
                    "message": message,
                    "user": self.user.username,
                    "user_id": self.user.id,
                    "created_at": msg.created_at.isoformat()
                }
            )

        # -------------------------------
        # ❤️ Reaction
        # -------------------------------
        elif action == "reaction":
            reaction = data.get("reaction")

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "live_reaction",
                    "reaction": reaction,
                    "user": self.user.username
                }
            )

        # -------------------------------
        # 🔴 End Stream
        # -------------------------------
        elif action == "end_stream":

            is_owner = await self.is_streamer(
                self.session_id,
                self.user.id
            )

            if not is_owner:
                return

            await self.end_stream(self.session_id)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "stream_ended"
                }
            )

    # ===============================
    # 🔁 SOCKET EVENTS
    # ===============================

    async def live_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": event["message"],
            "user": event["user"],
            "user_id": event["user_id"],
            "created_at": event["created_at"]
        }))

    async def live_reaction(self, event):
        await self.send(text_data=json.dumps({
            "type": "reaction",
            "reaction": event["reaction"],
            "user": event["user"]
        }))

    async def viewer_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "viewer_count",
            "count": event["count"]
        }))

    async def stream_ended(self, event):
        await self.send(text_data=json.dumps({
            "type": "stream_ended"
        }))
        await self.close()

    # ===============================
    # 🧠 DATABASE FUNCTIONS
    # ===============================

    @database_sync_to_async
    def check_session(self, session_id):
        return LiveSession.objects.filter(
            id=session_id,
            is_live=True
        ).exists()

    @database_sync_to_async
    def add_viewer(self, session_id, user_id):
        LiveViewer.objects.get_or_create(
            session_id=session_id,
            user_id=user_id
        )

    @database_sync_to_async
    def remove_viewer(self, session_id, user_id):
        LiveViewer.objects.filter(
            session_id=session_id,
            user_id=user_id
        ).delete()

    @database_sync_to_async
    def get_viewer_count(self, session_id):
        return LiveViewer.objects.filter(
            session_id=session_id
        ).count()

    @database_sync_to_async
    def is_streamer(self, session_id, user_id):
        return LiveSession.objects.filter(
            id=session_id,
            streamer_id=user_id
        ).exists()

    @database_sync_to_async
    def end_stream(self, session_id):
        LiveSession.objects.filter(
            id=session_id
        ).update(is_live=False)

    @database_sync_to_async
    def save_message(self, session_id, user_id, message):
        return LiveMessage.objects.create(
            session_id=session_id,
            user_id=user_id,
            message=message
        )