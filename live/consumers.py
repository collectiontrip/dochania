import json
import logging
import uuid
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
        self.connection_id = str(uuid.uuid4())

        # 🔐 AUTH
        query_string = self.scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if not token:
            await self.close()
            return

        try:
            access_token = AccessToken(token)
            user_id = access_token["user_id"]
            self.user = await database_sync_to_async(User.objects.get)(id=user_id)

        except TokenError:
            await self.close()
            return
        except Exception as e:
            logger.error(f"Auth error: {e}")
            await self.close()
            return

        # 🔴 SESSION CHECK
        if not await self.check_session(self.session_id):
            await self.close()
            return

        # 🔗 JOIN GROUP
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # 🔥 REFRESH SAFE JOIN
        await self.remove_viewer(self.session_id, self.user.id)
        await self.add_viewer(self.session_id, self.user.id)

        # 🔥 SEND STREAMER INFO (NEW 🔥)
        streamer = await self.get_streamer(self.session_id)
        await self.send(text_data=json.dumps({
            "type": "streamer_info",
            "streamer": streamer
        }))

        # 📦 SNAPSHOT
        await self.broadcast_viewer_snapshot()

        # 🔥 FORCE STREAM RECONNECT
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "force_offer",
                "connection_id": self.connection_id,
                "user_id": self.user.id,
                "username": self.user.username
            }
        )

        await self.send_viewer_count()

    # =========================
    # ❌ DISCONNECT
    # =========================
    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

            if self.user:
                await self.remove_viewer(self.session_id, self.user.id)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "viewer_left",
                        "user_id": self.user.id,
                        "username": self.user.username
                    }
                )

                await self.broadcast_viewer_snapshot()
                await self.send_viewer_count()

        except Exception as e:
            logger.error(f"Disconnect error: {e}")

    # =========================
    # 📩 RECEIVE
    # =========================
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")

        # 💬 CHAT
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

        # 🎥 WEBRTC
        elif action in ["offer", "answer", "ice_candidate"]:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": f"rtc_{action}",
                    "connection_id": data.get("connection_id"),
                    "sender_channel": self.channel_name,
                    "data": data
                }
            )

        # 🔴 END STREAM
        elif action == "end_stream":
            if await self.is_streamer(self.session_id, self.user.id):
                await self.end_stream(self.session_id)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "stream_ended"}
                )

    # =========================
    # 🔁 EVENTS
    # =========================

    async def live_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            **event
        }))

    async def viewer_left(self, event):
        await self.send(text_data=json.dumps({
            "type": "viewer_left",
            "user_id": event["user_id"],
            "username": event.get("username")
        }))

    async def viewer_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "viewer_count",
            "count": event["count"]
        }))

    async def force_offer(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_viewer",
            "connection_id": event["connection_id"],
            "user_id": event["user_id"],
            "username": event["username"]
        }))

    # =========================
    # 📦 SNAPSHOT SYSTEM (UPDATED 🔥)
    # =========================

    async def broadcast_viewer_snapshot(self):
        viewers = await self.get_all_viewers(self.session_id)
        streamer = await self.get_streamer(self.session_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_snapshot",
                "viewers": viewers,
                "streamer": streamer
            }
        )

    async def viewer_snapshot(self, event):
        await self.send(text_data=json.dumps({
            "type": "initial_viewers",
            "viewers": event["viewers"],
            "streamer": event.get("streamer")
        }))

    # =========================
    # 🔥 RTC ROUTING
    # =========================

    async def rtc_offer(self, event):
        if event.get("sender_channel") == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            "type": "offer",
            **event["data"]
        }))

    async def rtc_answer(self, event):
        if event.get("sender_channel") == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            "type": "answer",
            **event["data"]
        }))

    async def rtc_ice_candidate(self, event):
        if event.get("sender_channel") == self.channel_name:
            return

        await self.send(text_data=json.dumps({
            "type": "ice_candidate",
            **event["data"]
        }))

    async def stream_ended(self, event):
        await self.send(text_data=json.dumps({
            "type": "stream_ended"
        }))
        await self.close()

    # =========================
    # 🧠 HELPERS
    # =========================

    async def send_viewer_count(self):
        count = await self.get_viewer_count(self.session_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_update",
                "count": count
            }
        )

    @database_sync_to_async
    def check_session(self, session_id):
        return LiveSession.objects.filter(
            id=session_id,
            is_live=True
        ).exists()

    @database_sync_to_async
    def add_viewer(self, session_id, user_id):
        LiveViewer.objects.update_or_create(
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
    def get_all_viewers(self, session_id):
        viewers = LiveViewer.objects.filter(
            session_id=session_id
        ).select_related("user")

        return [
            {
                "user_id": v.user.id,
                "username": v.user.username
            }
            for v in viewers
        ]

    # 🔥 NEW HELPER
    @database_sync_to_async
    def get_streamer(self, session_id):
        session = LiveSession.objects.select_related("streamer").filter(id=session_id).first()

        if not session:
            return None

        return {
            "user_id": session.streamer.id,
            "username": session.streamer.username
        }

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