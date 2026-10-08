from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


from .serializers import (
    LiveSessionSerializer,
    LiveMessageSerializer,
    LiveViewerSerializer,
    BroadcasterLiveAdminSerializer,
    LiveModeratorSerializer,
    LiveModerationActionSerializer,
)


from .service import (
    start_live_session,
    end_live_session,
    update_live_heartbeat,
    get_live_sessions_for_user,
    join_live_session,
    leave_live_session,

    get_live_viewers,
    mute_live_viewer,
    unmute_live_viewer,
    kick_live_viewer,
    block_live_viewer,

    assign_live_moderator,
    remove_live_moderator,
    get_live_moderators,

    send_live_message,
    get_live_messages,

    apply_live_moderation_action,
    end_live_moderation_action,
    get_live_moderation_actions,
)


# ============================================================
# SERVICE RESPONSE HELPER
# ============================================================


def service_response(
    result,
    success_status=200,
):

    if not result["success"]:

        error = result["error"]

        return Response(
            {
                "error": error["message"],
            },
            status=error["status"],
        )

    return Response(
        result["data"],
        status=success_status,
    )


# ============================================================
# START LIVE SESSION
# ============================================================


class StartLiveSessionView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(self, request):

        title = request.data.get(
            "title",
            "",
        )

        result = start_live_session(
            user=request.user,
            title=title,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            LiveSessionSerializer(
                result["data"]
            ).data,
            status=201,
        )


# ============================================================
# END LIVE SESSION
# ============================================================


class EndLiveSessionView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
    ):

        result = end_live_session(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],
        }

        if (
            "session" in data
            and data["session"] is not None
        ):

            response_data["session"] = (
                LiveSessionSerializer(
                    data["session"]
                ).data
            )

        return Response(
            response_data
        )


# ============================================================
# LIVE HEARTBEAT
# ============================================================


class LiveHeartbeatView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
    ):

        result = update_live_heartbeat(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {}

        if isinstance(
            data,
            dict,
        ):

            if "message" in data:

                response_data["message"] = (
                    data["message"]
                )

            if (
                "session" in data
                and data["session"] is not None
            ):

                response_data["session"] = (
                    LiveSessionSerializer(
                        data["session"]
                    ).data
                )

        return Response(
            response_data
        )


# ============================================================
# LIVE SESSION LIST
# ============================================================


class LiveSessionListView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):

        result = get_live_sessions_for_user(
            user=request.user,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            LiveSessionSerializer(
                result["data"],
                many=True,
            ).data
        )


# ============================================================
# JOIN LIVE SESSION
# ============================================================


class JoinLiveSessionView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
    ):

        result = join_live_session(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],

            "session": LiveSessionSerializer(
                data["session"]
            ).data,

            "created": data["created"],

            "is_admin": data.get(
                "is_admin",
                False,
            ),
        }

        # BROADCASTER DOES NOT RECEIVE VIEWER OBJECT

        if (
            "viewer" in data
            and data["viewer"] is not None
        ):

            response_data["viewer"] = (
                LiveViewerSerializer(
                    data["viewer"]
                ).data
            )

        return Response(
            response_data
        )


# ============================================================
# LEAVE LIVE SESSION
# ============================================================


class LeaveLiveSessionView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
    ):

        result = leave_live_session(
            user=request.user,
            session_id=session_id,
        )

        return service_response(
            result
        )


# ============================================================
# LIVE VIEWERS
# ============================================================


class LiveViewerListView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
        session_id,
    ):

        result = get_live_viewers(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            LiveViewerSerializer(
                result["data"],
                many=True,
            ).data
        )


# ============================================================
# MUTE LIVE VIEWER
# ============================================================


class MuteLiveViewerView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
        user_id,
    ):

        duration_minutes = request.data.get(
            "duration_minutes"
        )

        result = mute_live_viewer(
            user=request.user,
            session_id=session_id,
            viewer_user_id=user_id,
            duration_minutes=duration_minutes,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        return Response(
            {
                "message": data["message"],

                "viewer": LiveViewerSerializer(
                    data["viewer"]
                ).data,
            }
        )


# ============================================================
# UNMUTE LIVE VIEWER
# ============================================================


class UnmuteLiveViewerView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
        user_id,
    ):

        result = unmute_live_viewer(
            user=request.user,
            session_id=session_id,
            viewer_user_id=user_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        return Response(
            {
                "message": data["message"],

                "viewer": LiveViewerSerializer(
                    data["viewer"]
                ).data,
            }
        )


# ============================================================
# KICK LIVE VIEWER
# ============================================================


class KickLiveViewerView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
        user_id,
    ):

        result = kick_live_viewer(
            user=request.user,
            session_id=session_id,
            viewer_user_id=user_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return service_response(
            result
        )


# ============================================================
# BLOCK LIVE VIEWER
# ============================================================


class BlockLiveViewerView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
        user_id,
    ):

        result = block_live_viewer(
            user=request.user,
            session_id=session_id,
            viewer_user_id=user_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],
        }

        if (
            "block" in data
            and data["block"] is not None
        ):

            block = data["block"]

            response_data["block"] = {
                "id": block.id,
                "blocker": block.blocker_id,
                "blocked": block.blocked_id,
            }

        return Response(
            response_data
        )


# ============================================================
# LIVE ADMIN LIST
# ============================================================


class LiveModeratorListView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
        session_id,
    ):

        result = get_live_moderators(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            BroadcasterLiveAdminSerializer(
                result["data"],
                many=True,
            ).data
        )


# ============================================================
# ASSIGN LIVE ADMIN
# ============================================================


class AssignLiveModeratorView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
    ):

        user_id = request.data.get(
            "user_id"
        )

        if user_id is None:

            return Response(
                {
                    "error": "user_id is required.",
                },
                status=400,
            )

        result = assign_live_moderator(
            user=request.user,
            session_id=session_id,
            moderator_user_id=user_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],

            "assignment": (
                BroadcasterLiveAdminSerializer(
                    data["assignment"]
                ).data
            ),

            "assignment_created": data.get(
                "assignment_created",
                False,
            ),

            "is_active": data.get(
                "is_active",
                False,
            ),
        }

        return Response(
            response_data,
            status=201,
        )


# ============================================================
# REMOVE LIVE ADMIN
# ============================================================


class RemoveLiveModeratorView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
        user_id,
    ):

        result = remove_live_moderator(
            user=request.user,
            session_id=session_id,
            moderator_user_id=user_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],

            "user_id": data.get(
                "user_id",
                user_id,
            ),
        }

        return Response(
            response_data
        )


# ============================================================
# SEND LIVE MESSAGE
# ============================================================


class SendMessageView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
    ):

        session_id = request.data.get(
            "session"
        )

        message = request.data.get(
            "message"
        )

        result = send_live_message(
            user=request.user,
            session_id=session_id,
            message=message,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            LiveMessageSerializer(
                result["data"]
            ).data,
            status=201,
        )


# ============================================================
# LIVE MESSAGE HISTORY
# ============================================================


class LiveMessageView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
        session_id,
    ):

        result = get_live_messages(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            LiveMessageSerializer(
                result["data"],
                many=True,
            ).data
        )


# ============================================================
# APPLY LIVE MODERATION ACTION
# ============================================================


class ApplyLiveModerationActionView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        session_id,
    ):

        action = request.data.get(
            "action"
        )

        reason = request.data.get(
            "reason"
        )

        note = request.data.get(
            "note",
            "",
        )

        duration_minutes = request.data.get(
            "duration_minutes"
        )

        result = apply_live_moderation_action(
            user=request.user,
            session_id=session_id,
            action=action,
            reason=reason,
            note=note,
            duration_minutes=duration_minutes,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],

            "action": LiveModerationActionSerializer(
                data["action"]
            ).data,
        }

        if (
            "session" in data
            and data["session"] is not None
        ):

            response_data["session"] = (
                LiveSessionSerializer(
                    data["session"]
                ).data
            )

        return Response(
            response_data,
            status=201,
        )


# ============================================================
# END LIVE MODERATION ACTION
# ============================================================


class EndLiveModerationActionView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def post(
        self,
        request,
        action_id,
    ):

        result = end_live_moderation_action(
            user=request.user,
            action_id=action_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        data = result["data"]

        response_data = {
            "message": data["message"],

            "action": LiveModerationActionSerializer(
                data["action"]
            ).data,
        }

        if (
            "session" in data
            and data["session"] is not None
        ):

            response_data["session"] = (
                LiveSessionSerializer(
                    data["session"]
                ).data
            )

        return Response(
            response_data
        )


# ============================================================
# LIVE MODERATION ACTION HISTORY
# ============================================================


class LiveModerationActionListView(APIView):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
        session_id,
    ):

        result = get_live_moderation_actions(
            user=request.user,
            session_id=session_id,
        )

        if not result["success"]:

            return service_response(
                result
            )

        return Response(
            LiveModerationActionSerializer(
                result["data"],
                many=True,
            ).data
        )