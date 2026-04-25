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

        print(f"\n🔌 CONNECT ATTEMPT → session: {self.session_id}")

        # 🔐 AUTH
        query_string = self.scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if not token:
            print("❌ No token → closing")
            await self.close()
            return

        try:
            access_token = AccessToken(token)
            user_id = access_token["user_id"]
            self.user = await database_sync_to_async(User.objects.get)(id=user_id)

            print(f"✅ Auth success → user: {self.user.id}")

        except TokenError:
            print("❌ Token error → closing")
            await self.close()
            return

        except Exception as e:
            logger.error(f"Auth error: {e}")
            await self.close()
            return

        # 🔴 SESSION CHECK
        is_live = await self.check_session(self.session_id)
        print(f"🧪 SESSION CHECK → is_live: {is_live}")

        if not is_live:
            print("❌ SESSION NOT LIVE → closing socket")
            await self.close()
            return

        # 🔗 JOIN GROUP
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"🟢 CONNECTED → {self.channel_name}")

        # 🎯 CHECK ROLE
        self.is_streamer_flag = await self.is_streamer(self.session_id, self.user.id)

        if not self.is_streamer_flag:
            await self.add_viewer(self.session_id, self.user.id)
            print(f"👀 Viewer added → {self.user.id}")
        else:
            print(f"🎥 Streamer connected → {self.user.id}")

        # 🔥 IMPORTANT: ONLY SEND new_viewer IF NOT STREAMER
        if not self.is_streamer_flag:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "new_viewer",
                    "connection_id": self.connection_id,
                    "user_id": self.user.id
                }
            )

        await self.send_viewer_count()

    async def disconnect(self, close_code):
        print(f"🔌 DISCONNECT → {self.channel_name} code: {close_code}")

        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

            if self.user:
                if not self.is_streamer_flag:
                    await self.remove_viewer(self.session_id, self.user.id)
                    print(f"👀 Viewer removed → {self.user.id}")

                await self.send_viewer_count()

        except Exception as e:
            logger.error(f"Disconnect error: {e}")

    # =========================
    # 📩 RECEIVE
    # =========================
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")

        # 💬 MESSAGE
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

        # 🎥 WEBRTC SIGNALING
        elif action in ["offer", "answer", "ice_candidate"]:
            print(f"📡 {action.upper()} → from {self.channel_name}")

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": f"rtc_{action}",
                    "connection_id": data.get("connection_id"),
                    "sender_channel": self.channel_name,
                    "data": data
                }
            )

        # ❤️ HEARTBEAT
        elif action == "heartbeat":
            return

        # 🔴 END STREAM
        elif action == "end_stream":
            if self.is_streamer_flag:
                print("🛑 STREAM END TRIGGERED")

                await self.end_stream(self.session_id)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "stream_ended"
                    }
                )

    # =========================
    # 🔁 EVENTS
    # =========================

    async def live_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            **event
        }))

    async def new_viewer(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_viewer",
            "connection_id": event["connection_id"],
            "user_id": event["user_id"]
        }))

    async def viewer_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "viewer_count",
            "count": event["count"]
        }))

    # =========================
    # 🔥 RTC EVENTS
    # =========================

    async def rtc_offer(self, event):
        if event.get("connection_id") != self.connection_id:
            return

        print(f"📩 OFFER → to {self.connection_id}")

        await self.send(text_data=json.dumps({
            "type": "offer",
            **event["data"]
        }))

    async def rtc_answer(self, event):
        # ✅ only broadcaster receives
        if self.is_streamer_flag:
            print("📩 ANSWER → broadcaster")

            await self.send(text_data=json.dumps({
                "type": "answer",
                **event["data"]
            }))

    async def rtc_ice_candidate(self, event):
        if event.get("connection_id") == self.connection_id:
            await self.send(text_data=json.dumps({
                "type": "ice_candidate",
                **event["data"]
            }))
        elif self.is_streamer_flag:
            await self.send(text_data=json.dumps({
                "type": "ice_candidate",
                **event["data"]
            }))

    async def stream_ended(self, event):
        print("🔴 STREAM ENDED → closing socket")

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