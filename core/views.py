from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import UserDevice
from rest_framework.views import APIView

User = get_user_model()


# =========================
# 🔐 PUBLIC KEY APIs
# =========================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_public_key(request):
    public_key = request.data.get("public_key")

    if not public_key or len(public_key) < 100:
        return Response(
            {"error": "Valid public_key is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user
    user.public_key = public_key
    user.save(update_fields=["public_key"])

    return Response({
        "message": "Public key saved",
        "user_id": user.id
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_public_key(request, user_id):
    user = get_object_or_404(User, id=user_id)

    if not user.public_key:
        return Response(
            {"error": "User has no public key"},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "user_id": user.id,
        "public_key": user.public_key
    }, status=status.HTTP_200_OK)


# =========================
# 📱 SAVE DEVICE API
# =========================

class SaveDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        device_info = request.data.get("device_info", {})

        # 🔥 DEBUG LOGS (VERY IMPORTANT)
        print("🔥 FULL REQUEST DATA:", request.data)
        print("🔥 DEVICE INFO:", device_info)
        print("🔥 DEVICE NAME:", device_info.get("device_name"))

        # ✅ Real IP logic
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")

        # ✅ Safety fallback (important)
        user_agent = device_info.get("user_agent") or request.META.get("HTTP_USER_AGENT", "")
        platform = device_info.get("platform") or "Unknown"
        device_name = device_info.get("device_name") or "Unknown Device"

        # ✅ Save device
        device = UserDevice.objects.create(
            user=request.user,
            user_agent=user_agent,
            platform=platform,
            device_name=device_name,
            ip_address=ip
        )

        print("✅ DEVICE SAVED:", device.id)

        return Response({
            "status": "device saved",
            "device_id": device.id,
            "device_name": device_name
        }, status=status.HTTP_201_CREATED)