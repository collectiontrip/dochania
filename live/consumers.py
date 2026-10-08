import json
import logging
import uuid

from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import (
    LiveSession,
    LiveViewer,
    LiveKickedViewer,
)

from .service import (
    get_live_access_block_reason,
    get_live_start_block_reason,
    get_live_session_for_user,
    can_manage_live,
    join_live_session,
    end_live_session,
    update_live_heartbeat,
    send_live_message,
    mute_live_viewer,
    unmute_live_viewer,
    kick_live_viewer,
    block_live_viewer,
    assign_live_moderator,
    remove_live_moderator,
)


logger = logging.getLogger(__name__)

User = get_user_model()


# ============================================================
# LIVE CONSUMER
# ============================================================


class LiveConsumer(
    AsyncJsonWebsocketConsumer,
):

    # ========================================================
    # CONNECT
    # ========================================================

    async def connect(
        self,
    ):

        self.user = None
        self.is_streamer_flag = False
        self.was_kicked = False
        self.left_live_manually = False

        self.session_id = self.scope[
            "url_route"
        ][
            "kwargs"
        ][
            "session_id"
        ]

        self.room_group_name = (
            f"live_{self.session_id}"
        )

        self.connection_id = str(
            uuid.uuid4()
        )

        try:

            query_string = (
                self.scope[
                    "query_string"
                ]
                .decode()
            )

            query_params = parse_qs(
                query_string
            )

            token = query_params.get(
                "token",
                [None],
            )[0]

            if not token:

                await self.close()
                return

            try:

                access_token = AccessToken(
                    token
                )

                user_id = access_token[
                    "user_id"
                ]

            except (
                TokenError,
                KeyError,
            ):

                await self.close()
                return

            self.user = await self.get_user(
                user_id
            )

            if not self.user:

                await self.close()
                return

            # =================================================
            # ACCOUNT ACCESS CHECK
            # =================================================

            access_block_reason = (
                await self.get_access_block_reason(
                    self.user
                )
            )

            if access_block_reason:

                await self.send_json(
                    {
                        "type": "access_denied",
                        "message": access_block_reason,
                    }
                )

                await self.close()
                return

            # =================================================
            # SESSION ACCESS CHECK
            # =================================================

            session_result = (
                await self.get_session_for_user(
                    self.session_id,
                    self.user,
                )
            )

            if not session_result.get(
                "success",
                False,
            ):

                await self.send_json(
                    {
                        "type": "live_unavailable",
                        "message": self.get_service_error_message(
                            session_result,
                            "This live session is no longer available.",
                        ),
                    }
                )

                await self.close()
                return

            session = session_result.get(
                "data"
            )

            if session is None:

                await self.send_json(
                    {
                        "type": "live_unavailable",
                        "message": (
                            "This live session is no longer available."
                        ),
                    }
                )

                await self.close()
                return

            self.is_streamer_flag = (
                session.streamer_id
                == self.user.id
            )

            # =================================================
            # KICK CHECK
            # =================================================

            if not self.is_streamer_flag:

                kicked = (
                    await self.is_viewer_kicked(
                        self.session_id,
                        self.user.id,
                    )
                )

                if kicked:

                    await self.send_json(
                        {
                            "type": "kicked",
                            "message": (
                                "You were removed from this live."
                            ),
                        }
                    )

                    await self.close()
                    return

            # =================================================
            # STREAMER ACCESS CHECK
            # =================================================

            if self.is_streamer_flag:

                start_block_reason = (
                    await self.get_start_block_reason(
                        self.user
                    )
                )

                if start_block_reason:

                    await self.send_json(
                        {
                            "type": "access_denied",
                            "message": start_block_reason,
                        }
                    )

                    await self.close()
                    return

            # =================================================
            # JOIN GROUP
            # =================================================

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name,
            )

            await self.accept()

            # =================================================
            # REGISTER VIEWER
            # =================================================

            if not self.is_streamer_flag:

                join_result = await self.join_live(
                    self.session_id,
                    self.user.id,
                )

                if not join_result.get(
                    "success",
                    False,
                ):

                    await self.send_json(
                        {
                            "type": "live_unavailable",
                            "message": self.get_service_error_message(
                                join_result,
                                "Unable to join this live.",
                            ),
                        }
                    )

                    await self.channel_layer.group_discard(
                        self.room_group_name,
                        self.channel_name,
                    )

                    await self.close()
                    return

                created = (
                    join_result
                    .get("data", {})
                    .get("created", False)
                )

                # =================================================
                # NEW VIEWER NOTIFICATION
                # =================================================

                if created:

                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "viewer_joined",
                            "user_id": self.user.id,
                            "user_name": (
                                self.user.username
                            ),
                        },
                    )

                # =================================================
                # WEBRTC VIEWER EVENT
                # =================================================

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "new_viewer",
                        "connection_id": (
                            self.connection_id
                        ),
                        "user_id": self.user.id,
                    },
                )

            # =================================================
            # VIEWER COUNT
            # =================================================

            await self.send_viewer_count()

            # =================================================
            # CONNECTED EVENT
            # =================================================

            await self.send_json(
                {
                    "type": "live_connected",
                    "session_id": (
                        self.session_id
                    ),
                    "connection_id": (
                        self.connection_id
                    ),
                    "is_streamer": (
                        self.is_streamer_flag
                    ),
                }
            )

        except Exception as exc:

            logger.exception(
                "Live WebSocket connect error: %s",
                exc,
            )

            await self.close()

    # ========================================================
    # DISCONNECT
    # ========================================================

    async def disconnect(
        self,
        close_code,
    ):

        try:

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

        except Exception:

            pass

        if (
            self.user
            and not self.is_streamer_flag
        ):

            await self.remove_viewer(
                self.session_id,
                self.user.id,
            )

            if (
                not self.was_kicked
                and not self.left_live_manually
            ):

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "viewer_left",
                        "user_id": self.user.id,
                    },
                )

                await self.send_viewer_count()

    # ========================================================
    # RECEIVE
    # ========================================================

    async def receive(
        self,
        text_data=None,
        bytes_data=None,
    ):

        if not text_data:
            return

        try:

            data = json.loads(
                text_data
            )

        except json.JSONDecodeError:

            return

        message_type = data.get(
            "type"
        )

        # =====================================================
        # CHAT MESSAGE
        # =====================================================

        if message_type == "message":

            await self.handle_message(
                data
            )

        # =====================================================
        # WEBRTC OFFER
        # =====================================================

        elif message_type == "offer":

            await self.handle_rtc_signal(
                data,
                "offer",
            )

        # =====================================================
        # WEBRTC ANSWER
        # =====================================================

        elif message_type == "answer":

            await self.handle_rtc_signal(
                data,
                "answer",
            )

        # =====================================================
        # ICE CANDIDATE
        # =====================================================

        elif message_type == "ice_candidate":

            await self.handle_rtc_signal(
                data,
                "ice_candidate",
            )

        # =====================================================
        # HEARTBEAT
        # =====================================================

        elif message_type == "heartbeat":

            await self.handle_heartbeat()

        # =====================================================
        # END STREAM
        # =====================================================

        elif message_type == "end_stream":

            await self.handle_end_stream()

        # =====================================================
        # LEAVE
        # =====================================================

        elif message_type == "leave":

            await self.handle_leave()

        # =====================================================
        # MUTE VIEWER
        # =====================================================

        elif message_type == "mute_viewer":

            await self.handle_mute_viewer(
                data
            )

        # =====================================================
        # UNMUTE VIEWER
        # =====================================================

        elif message_type == "unmute_viewer":

            await self.handle_unmute_viewer(
                data
            )

        # =====================================================
        # KICK VIEWER
        # =====================================================

        elif message_type == "kick_viewer":

            await self.handle_kick_viewer(
                data
            )

        # =====================================================
        # BLOCK VIEWER
        # =====================================================

        elif message_type == "block_viewer":

            await self.handle_block_viewer(
                data
            )

        # =====================================================
        # ASSIGN MODERATOR
        # =====================================================

        elif message_type == "assign_moderator":

            await self.handle_assign_moderator(
                data
            )

        # =====================================================
        # REMOVE MODERATOR
        # =====================================================

        elif message_type == "remove_moderator":

            await self.handle_remove_moderator(
                data
            )

    # ========================================================
    # CHAT MESSAGE
    # ========================================================

    async def handle_message(
        self,
        data,
    ):

        message = (
            data.get("message")
            or ""
        ).strip()

        if not message:
            return

        result = await self.save_live_message(
            self.session_id,
            self.user.id,
            message,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "chat_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to send message.",
                    ),
                }
            )

            return

        live_message = result.get(
            "data"
        )

        if live_message is None:

            await self.send_json(
                {
                    "type": "chat_error",
                    "message": "Unable to create live message.",
                }
            )

            return

        user_info = {
            "id": self.user.id,
            "username": self.user.username,
            "full_name": (
                self.user.get_full_name()
            ),
            "profile_picture": (
                self.user.profile_picture.url
                if self.user.profile_picture
                else None
            ),
            "is_verified": (
                self.user.is_verified
            ),
            "is_online": (
                self.user.is_online
            ),
        }

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "live_message",
                "id": live_message.id,
                "user_id": self.user.id,
                "user_name": (
                    self.user.username
                ),
                "user_info": user_info,
                "message": (
                    live_message.message
                ),
                "created_at": (
                    live_message.created_at.isoformat()
                ),
            },
        )

    # ========================================================
    # RTC SIGNAL
    # ========================================================

    async def handle_rtc_signal(
        self,
        data,
        signal_type,
    ):

        target_connection_id = data.get(
            "target_connection_id"
        )

        if not target_connection_id:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": (
                    f"rtc_{signal_type}"
                ),
                "target_connection_id": (
                    target_connection_id
                ),
                "connection_id": (
                    self.connection_id
                ),
                "user_id": self.user.id,
                "data": data.get(
                    "data"
                ),
            },
        )

    # ========================================================
    # HEARTBEAT
    # ========================================================

    async def handle_heartbeat(
        self,
    ):

        if self.is_streamer_flag:

            result = (
                await self.update_heartbeat(
                    self.session_id,
                    self.user.id,
                )
            )

            if not result.get(
                "success",
                False,
            ):

                await self.send_json(
                    {
                        "type": "heartbeat_error",
                        "message": self.get_service_error_message(
                            result,
                            "Heartbeat failed.",
                        ),
                    }
                )

        else:

            await self.send_json(
                {
                    "type": "heartbeat_ack",
                }
            )

    # ========================================================
    # END STREAM
    # ========================================================

    async def handle_end_stream(
        self,
    ):

        if not self.is_streamer_flag:

            await self.send_json(
                {
                    "type": "error",
                    "message": (
                        "Only the broadcaster can end the live."
                    ),
                }
            )

            return

        result = await self.end_stream(
            self.session_id,
            self.user.id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to end live.",
                    ),
                }
            )

            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "stream_ended",
                "message": (
                    "This live has ended."
                ),
            },
        )

    # ========================================================
    # LEAVE
    # ========================================================

    async def handle_leave(
        self,
    ):

        if self.is_streamer_flag:

            await self.handle_end_stream()
            return

        self.left_live_manually = True

        await self.remove_viewer(
            self.session_id,
            self.user.id,
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_left",
                "user_id": self.user.id,
            },
        )

        await self.send_viewer_count()

        await self.close()

    # ========================================================
    # MUTE VIEWER
    # ========================================================

    async def handle_mute_viewer(
        self,
        data,
    ):

        if not await self.can_manage_current_live():

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": (
                        "You do not have permission to mute viewers."
                    ),
                }
            )

            return

        user_id = data.get(
            "user_id"
        )

        if not user_id:
            return

        result = await self.mute_viewer(
            self.session_id,
            self.user.id,
            user_id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to mute viewer.",
                    ),
                }
            )

            return

        target_user = await self.get_user(
            user_id
        )

        target_username = (
            target_user.username
            if target_user
            else "User"
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_muted",
                "user_id": user_id,
                "actor_id": self.user.id,
                "actor_name": self.user.username,
                "user_name": target_username,
            },
        )

    # ========================================================
    # UNMUTE VIEWER
    # ========================================================

    async def handle_unmute_viewer(
        self,
        data,
    ):

        if not await self.can_manage_current_live():

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": (
                        "You do not have permission to unmute viewers."
                    ),
                }
            )

            return

        user_id = data.get(
            "user_id"
        )

        if not user_id:
            return

        result = await self.unmute_viewer(
            self.session_id,
            self.user.id,
            user_id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to unmute viewer.",
                    ),
                }
            )

            return

        target_user = await self.get_user(
            user_id
        )

        target_username = (
            target_user.username
            if target_user
            else "User"
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_unmuted",
                "user_id": user_id,
                "actor_id": self.user.id,
                "actor_name": self.user.username,
                "user_name": target_username,
            },
        )

    # ========================================================
    # KICK VIEWER
    # ========================================================

    async def handle_kick_viewer(
        self,
        data,
    ):

        if not await self.can_manage_current_live():

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": (
                        "You do not have permission to kick viewers."
                    ),
                }
            )

            return

        user_id = data.get(
            "user_id"
        )

        if not user_id:
            return

        result = await self.kick_viewer(
            self.session_id,
            self.user.id,
            user_id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to kick viewer.",
                    ),
                }
            )

            return

        target_user = await self.get_user(
            user_id
        )

        target_username = (
            target_user.username
            if target_user
            else "User"
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_kicked",
                "user_id": user_id,
                "actor_id": self.user.id,
                "actor_name": self.user.username,
                "user_name": target_username,
            },
        )

        await self.send_viewer_count()

    # ========================================================
    # BLOCK VIEWER
    # ========================================================

    async def handle_block_viewer(
        self,
        data,
    ):

        if not self.is_streamer_flag:

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": (
                        "Only the broadcaster can block viewers."
                    ),
                }
            )

            return

        user_id = data.get(
            "user_id"
        )

        if not user_id:
            return

        result = await self.block_viewer(
            self.session_id,
            self.user.id,
            user_id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to block viewer.",
                    ),
                }
            )

            return

        target_user = await self.get_user(
            user_id
        )

        target_username = (
            target_user.username
            if target_user
            else "User"
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_blocked",
                "user_id": user_id,
                "actor_id": self.user.id,
                "actor_name": self.user.username,
                "user_name": target_username,
            },
        )

    # ========================================================
    # ASSIGN MODERATOR
    # ========================================================

    async def handle_assign_moderator(
        self,
        data,
    ):

        if not self.is_streamer_flag:

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": (
                        "Only the broadcaster can assign live moderators."
                    ),
                }
            )

            return

        user_id = data.get(
            "user_id"
        )

        if not user_id:
            return

        result = await self.assign_moderator(
            self.session_id,
            self.user.id,
            user_id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to assign live admin.",
                    ),
                }
            )

            return

        # =================================================
        # LIVE ADMIN ASSIGNED
        # =================================================

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "moderator_assigned",
                "user_id": user_id,
            },
        )

    # ========================================================
    # REMOVE MODERATOR
    # ========================================================

    async def handle_remove_moderator(
        self,
        data,
    ):

        if not self.is_streamer_flag:

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": (
                        "Only the broadcaster can remove live moderators."
                    ),
                }
            )

            return

        user_id = data.get(
            "user_id"
        )

        if not user_id:
            return

        result = await self.remove_moderator(
            self.session_id,
            self.user.id,
            user_id,
        )

        if not result.get(
            "success",
            False,
        ):

            await self.send_json(
                {
                    "type": "moderation_error",
                    "message": self.get_service_error_message(
                        result,
                        "Unable to remove live admin.",
                    ),
                }
            )

            return

        # =================================================
        # LIVE ADMIN REMOVED
        # =================================================

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "moderator_removed",
                "user_id": user_id,
            },
        )

    # ========================================================
    # LIVE MESSAGE EVENT
    # ========================================================

    async def live_message(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "message",
                "id": event["id"],
                "user_id": event["user_id"],
                "user_name": event[
                    "user_name"
                ],
                "user_info": event[
                    "user_info"
                ],
                "message": event[
                    "message"
                ],
                "created_at": event[
                    "created_at"
                ],
            }
        )

    # ========================================================
    # VIEWER JOINED EVENT
    # ========================================================

    async def viewer_joined(
        self,
        event,
    ):

        if (
            event["user_id"]
            == self.user.id
        ):
            return

        await self.send_json(
            {
                "type": "viewer_joined",
                "user_id": event[
                    "user_id"
                ],
                "user_name": event[
                    "user_name"
                ],
                "message": (
                    f'{event["user_name"]} joined the live.'
                ),
            }
        )

    # ========================================================
    # NEW VIEWER EVENT
    # ========================================================

    async def new_viewer(
        self,
        event,
    ):

        if (
            event["user_id"]
            == self.user.id
        ):
            return

        await self.send_json(
            {
                "type": "new_viewer",
                "connection_id": event[
                    "connection_id"
                ],
                "user_id": event[
                    "user_id"
                ],
            }
        )

    # ========================================================
    # VIEWER LEFT EVENT
    # ========================================================

    async def viewer_left(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "viewer_left",
                "user_id": event[
                    "user_id"
                ],
            }
        )

    # ========================================================
    # VIEWER COUNT EVENT
    # ========================================================

    async def viewer_update(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "viewer_count",
                "count": event[
                    "count"
                ],
            }
        )

    # ========================================================
    # VIEWER MUTED EVENT
    # ========================================================

    async def viewer_muted(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "viewer_muted",
                "user_id": event[
                    "user_id"
                ],
                "actor_id": event.get(
                    "actor_id"
                ),
                "actor_name": event.get(
                    "actor_name"
                ),
                "user_name": event.get(
                    "user_name"
                ),
            }
        )

    # ========================================================
    # VIEWER UNMUTED EVENT
    # ========================================================

    async def viewer_unmuted(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "viewer_unmuted",
                "user_id": event[
                    "user_id"
                ],
                "actor_id": event.get(
                    "actor_id"
                ),
                "actor_name": event.get(
                    "actor_name"
                ),
                "user_name": event.get(
                    "user_name"
                ),
            }
        )

    # ========================================================
    # VIEWER KICKED EVENT
    # ========================================================

    async def viewer_kicked(
        self,
        event,
    ):

        user_id = event[
            "user_id"
        ]

        if (
            user_id
            == self.user.id
        ):

            self.was_kicked = True

            await self.send_json(
                {
                    "type": "kicked",
                    "message": (
                        "You were removed from this live."
                    ),
                }
            )

            await self.close()

            return

        await self.send_json(
            {
                "type": "viewer_kicked",
                "user_id": user_id,
                "actor_id": event.get(
                    "actor_id"
                ),
                "actor_name": event.get(
                    "actor_name"
                ),
                "user_name": event.get(
                    "user_name"
                ),
            }
        )

    # ========================================================
    # VIEWER BLOCKED EVENT
    # ========================================================

    async def viewer_blocked(
        self,
        event,
    ):

        user_id = event[
            "user_id"
        ]

        if (
            user_id
            == self.user.id
        ):

            await self.send_json(
                {
                    "type": "blocked",
                    "message": (
                        "You were blocked from this live."
                    ),
                }
            )

            await self.close()

            return

        await self.send_json(
            {
                "type": "viewer_blocked",
                "user_id": user_id,
                "actor_id": event.get(
                    "actor_id"
                ),
                "actor_name": event.get(
                    "actor_name"
                ),
                "user_name": event.get(
                    "user_name"
                ),
            }
        )

    # ========================================================
    # MODERATOR ASSIGNED EVENT
    # ========================================================

    async def moderator_assigned(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "moderator_assigned",
                "user_id": event[
                    "user_id"
                ],
            }
        )

    # ========================================================
    # MODERATOR REMOVED EVENT
    # ========================================================

    async def moderator_removed(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "moderator_removed",
                "user_id": event[
                    "user_id"
                ],
            }
        )

    # ========================================================
    # RTC OFFER
    # ========================================================

    async def rtc_offer(
        self,
        event,
    ):

        if (
            event["target_connection_id"]
            != self.connection_id
        ):
            return

        await self.send_json(
            {
                "type": "offer",
                "connection_id": event[
                    "connection_id"
                ],
                "user_id": event[
                    "user_id"
                ],
                "data": event[
                    "data"
                ],
            }
        )

    # ========================================================
    # RTC ANSWER
    # ========================================================

    async def rtc_answer(
        self,
        event,
    ):

        if (
            event["target_connection_id"]
            != self.connection_id
        ):
            return

        await self.send_json(
            {
                "type": "answer",
                "connection_id": event[
                    "connection_id"
                ],
                "user_id": event[
                    "user_id"
                ],
                "data": event[
                    "data"
                ],
            }
        )

    # ========================================================
    # RTC ICE CANDIDATE
    # ========================================================

    async def rtc_ice_candidate(
        self,
        event,
    ):

        if (
            event["target_connection_id"]
            == self.connection_id
        ):

            await self.send_json(
                {
                    "type": "ice_candidate",
                    "connection_id": event[
                        "connection_id"
                    ],
                    "user_id": event[
                        "user_id"
                    ],
                    "data": event[
                        "data"
                    ],
                }
            )

            return

        if (
            self.is_streamer_flag
            and event["user_id"]
            != self.user.id
        ):

            await self.send_json(
                {
                    "type": "ice_candidate",
                    "connection_id": event[
                        "connection_id"
                    ],
                    "user_id": event[
                        "user_id"
                    ],
                    "data": event[
                        "data"
                    ],
                }
            )

    # ========================================================
    # STREAM ENDED EVENT
    # ========================================================

    async def stream_ended(
        self,
        event,
    ):

        await self.send_json(
            {
                "type": "stream_ended",
                "message": event.get(
                    "message",
                    "This live has ended.",
                ),
            }
        )

        await self.close()

    # ========================================================
    # SEND VIEWER COUNT
    # ========================================================

    async def send_viewer_count(
        self,
    ):

        count = await self.get_viewer_count(
            self.session_id
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "viewer_update",
                "count": count,
            },
        )

    # ========================================================
    # DATABASE HELPERS
    # ========================================================

    @database_sync_to_async
    def get_user(
        self,
        user_id,
    ):

        try:

            return User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return None

    @database_sync_to_async
    def join_live(
        self,
        session_id,
        user_id,
    ):

        user = self.get_user_sync(
            user_id
        )

        if user is None:

            return {
                "success": False,
                "data": None,
                "error": {
                    "message": (
                        "User account not found."
                    ),
                    "status": 404,
                },
            }

        return join_live_session(
            user=user,
            session_id=session_id,
        )

    @database_sync_to_async
    def remove_viewer(
        self,
        session_id,
        user_id,
    ):

        LiveViewer.objects.filter(
            session_id=session_id,
            user_id=user_id,
        ).delete()

    @database_sync_to_async
    def is_viewer_kicked(
        self,
        session_id,
        user_id,
    ):

        return LiveKickedViewer.objects.filter(
            session_id=session_id,
            user_id=user_id,
        ).exists()

    @database_sync_to_async
    def get_viewer_count(
        self,
        session_id,
    ):

        return LiveViewer.objects.filter(
            session_id=session_id
        ).count()

    # ========================================================
    # SERVICE HELPERS
    # ========================================================

    @database_sync_to_async
    def get_access_block_reason(
        self,
        user,
    ):

        return get_live_access_block_reason(
            user
        )

    @database_sync_to_async
    def get_start_block_reason(
        self,
        user,
    ):

        return get_live_start_block_reason(
            user
        )

    @database_sync_to_async
    def get_session_for_user(
        self,
        session_id,
        user,
    ):

        return get_live_session_for_user(
            session_id=session_id,
            user=user,
        )

    @database_sync_to_async
    def can_manage_current_live_sync(
        self,
        session_id,
        user_id,
    ):

        try:

            session = (
                LiveSession.objects.get(
                    id=session_id
                )
            )

            user = User.objects.get(
                id=user_id
            )

            return can_manage_live(
                session=session,
                user=user,
            )

        except (
            LiveSession.DoesNotExist,
            User.DoesNotExist,
        ):

            return False

    async def can_manage_current_live(
        self,
    ):

        return (
            await self.can_manage_current_live_sync(
                self.session_id,
                self.user.id,
            )
        )

    @database_sync_to_async
    def save_live_message(
        self,
        session_id,
        user_id,
        message,
    ):

        return send_live_message(
            user=self.get_user_sync(user_id),
            session_id=session_id,
            message=message,
        )

    @database_sync_to_async
    def update_heartbeat(
        self,
        session_id,
        user_id,
    ):

        user = self.get_user_sync(
            user_id
        )

        return update_live_heartbeat(
            user=user,
            session_id=session_id,
        )

    @database_sync_to_async
    def end_stream(
        self,
        session_id,
        user_id,
    ):

        user = self.get_user_sync(
            user_id
        )

        return end_live_session(
            user=user,
            session_id=session_id,
        )

    @database_sync_to_async
    def mute_viewer(
        self,
        session_id,
        moderator_id,
        viewer_id,
    ):

        user = self.get_user_sync(
            moderator_id
        )

        return mute_live_viewer(
            user=user,
            session_id=session_id,
            viewer_user_id=viewer_id,
        )

    @database_sync_to_async
    def unmute_viewer(
        self,
        session_id,
        moderator_id,
        viewer_id,
    ):

        user = self.get_user_sync(
            moderator_id
        )

        return unmute_live_viewer(
            user=user,
            session_id=session_id,
            viewer_user_id=viewer_id,
        )

    @database_sync_to_async
    def kick_viewer(
        self,
        session_id,
        moderator_id,
        viewer_id,
    ):

        user = self.get_user_sync(
            moderator_id
        )

        return kick_live_viewer(
            user=user,
            session_id=session_id,
            viewer_user_id=viewer_id,
        )

    @database_sync_to_async
    def block_viewer(
        self,
        session_id,
        broadcaster_id,
        viewer_id,
    ):

        user = self.get_user_sync(
            broadcaster_id
        )

        return block_live_viewer(
            user=user,
            session_id=session_id,
            viewer_user_id=viewer_id,
        )

    @database_sync_to_async
    def assign_moderator(
        self,
        session_id,
        broadcaster_id,
        user_id,
    ):

        user = self.get_user_sync(
            broadcaster_id
        )

        return assign_live_moderator(
            user=user,
            session_id=session_id,
            moderator_user_id=user_id,
        )

    @database_sync_to_async
    def remove_moderator(
        self,
        session_id,
        broadcaster_id,
        user_id,
    ):

        user = self.get_user_sync(
            broadcaster_id
        )

        return remove_live_moderator(
            user=user,
            session_id=session_id,
            moderator_user_id=user_id,
        )

    # ========================================================
    # SERVICE RESULT HELPERS
    # ========================================================

    @staticmethod
    def get_service_error_message(
        result,
        default_message,
    ):

        error = result.get(
            "error"
        )

        if isinstance(
            error,
            dict,
        ):

            message = error.get(
                "message"
            )

            if message:
                return message

        message = result.get(
            "message"
        )

        if message:
            return message

        return default_message

    # ========================================================
    # SYNC USER HELPER
    # ========================================================

    def get_user_sync(
        self,
        user_id,
    ):

        try:

            return User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return None