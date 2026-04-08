from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated 
from django.utils import timezone


from .models import LiveSession, LiveMessage, LiveViewer
from .serializers import (
    LiveSessionSerializer,
    LiveMessageSerializer,
    LiveViewerSerializer
)


class StartLiveSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        title = request.data.get("title", "")

        if LiveSession.objects.filter(streamer=user, is_live=True).exists():
            return Response({"error": "Already live"}, status=400)

        session = LiveSession.objects.create(
            streamer=user,
            title=title
        )
        return Response(
            LiveSessionSerializer(session).data,
            status=201
        )


class EndLiveSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = LiveSession.objects.get(id=session_id, streamer=request.user)
        except LiveSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=404)

        session.is_live = False
        session.ended_at = timezone.now()
        session.save()

        return Response({"message": "Live ended"})


class LiveSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = LiveSession.objects.filter(is_live=True)
        serializer = LiveSessionSerializer(sessions, many=True)
        return Response(serializer.data)


class JoinLiveSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = LiveSession.objects.get(id=session_id, is_live=True)
        except LiveSession.DoesNotExist:
            return Response({"error": "Session not live"}, status=400)

        viewer, created = LiveViewer.objects.get_or_create(
            session=session,
            user=request.user
        )

        return Response({"message": "Joined live"})


class LeaveLiveSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        LiveViewer.objects.filter(
            session_id=session_id,
            user=request.user
        ).delete()

        return Response({"message": "Left live"})


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session")
        message_text = request.data.get("message")
        
        if not message_text:
            return Response({"error": "Message cannot be empty"}, status=400)
        
        try:
            session = LiveSession.objects.get(id=session_id, is_live=True)
        
        except LiveSession.DoesNotExist:
            return Response({"error": "Session not live"}, status=404)

        message = LiveMessage.objects.create(
            session=session,
            user=request.user,
            message=message_text
        )

        return Response(
            LiveMessageSerializer(message).data,
            status=201
        )


class LiveMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        messages = LiveMessage.objects.filter(session_id=session_id).order_by("created_at")
        serializer = LiveMessageSerializer(messages, many=True)
        return Response(serializer.data)
