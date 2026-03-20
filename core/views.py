from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_public_key(request):
    public_key = request.data.get("public_key")
    
    if not public_key or len(public_key) <100:
        return Response(
            {"error": "public_key is required"},
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