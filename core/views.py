from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from relationships.models import Block
from .models import UserDevice
from .serializers import ProfileUpdateSerializer, UserSerializer


User = get_user_model()


# ==========================================================
# Helper: Visible Users
# ==========================================================

def get_visible_users(user):
    blocked_ids = Block.objects.filter(
        blocker=user
    ).values_list("blocked_id", flat=True)

    blocked_you_ids = Block.objects.filter(
        blocked=user
    ).values_list("blocker_id", flat=True)

    return (
        User.objects
        .filter(is_active=True)
        .exclude(id=user.id)
        .exclude(id__in=blocked_ids)
        .exclude(id__in=blocked_you_ids)
    )


# ==========================================================
# User List
# ==========================================================

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = get_visible_users(self.request.user)

        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        return queryset.order_by("username")


# ==========================================================
# User Detail
# ==========================================================

class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return get_visible_users(self.request.user)


# ==========================================================
# Public Key APIs
# ==========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_public_key(request):
    public_key = request.data.get("public_key")

    if not public_key or len(public_key) < 100:
        return Response(
            {"error": "Valid public_key is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.public_key = public_key
    request.user.save(update_fields=["public_key"])

    return Response(
        {
            "message": "Public key saved",
            "user_id": request.user.id,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_public_key(request, user_id):

    user = get_object_or_404(
        get_visible_users(request.user),
        id=user_id,
    )

    if not user.public_key:
        return Response(
            {"error": "User has no public key"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "user_id": user.id,
            "public_key": user.public_key,
        },
        status=status.HTTP_200_OK,
    )


# ==========================================================
# Save Device
# ==========================================================

class SaveDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        device_info = request.data.get("device_info", {})

        print("🔥 FULL REQUEST DATA:", request.data)
        print("🔥 DEVICE INFO:", device_info)
        print("🔥 DEVICE NAME:", device_info.get("device_name"))

        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")

        user_agent = (
            device_info.get("user_agent")
            or request.META.get("HTTP_USER_AGENT", "")
        )

        platform = device_info.get("platform") or "Unknown"

        device_name = device_info.get("device_name") or "Unknown Device"

        device = UserDevice.objects.create(
            user=request.user,
            user_agent=user_agent,
            platform=platform,
            device_name=device_name,
            ip_address=ip,
        )

        print("✅ DEVICE SAVED:", device.id)

        return Response(
            {
                "status": "device saved",
                "device_id": device.id,
                "device_name": device_name,
            },
            status=status.HTTP_201_CREATED,
        )


# ==========================================================
# Profile Update
# ==========================================================

class ProfileUpdateView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == "GET":
            return UserSerializer
        return ProfileUpdateSerializer

    def put(self, request, *args, **kwargs):
        print("PUT DATA:", request.data)
        return self.update(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        print("PATCH DATA:", request.data)
        return self.partial_update(request, *args, **kwargs)