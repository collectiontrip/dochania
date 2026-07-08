from django.db import transaction
from django.db.models import Q
from rest_framework import generics 
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Follow,
    FriendRequest,
    Friendship,
    Block,

)
from.serializers import (
    FollowCreateSerializer,
    FollowListSerializer,
    FollowDetailSerializer,
    FriendRequestCreateSerializer,
    FriendRequestListSerializer,
    FriendRequestDetailSerializer,
    FriendRequestUpdateSerializer,
    FriendshipSerializer,
    FriendshipDetailSerializer,
    BlockCreateSerializer,
    BlockListSerializer,
    BlockDetailSerializer,
)


class FollowCreateView(generics.CreateAPIView):
    serializer_class = FollowCreateSerializer
    permission_classes = [IsAuthenticated]


class FollowingListView(generics.ListAPIView):
    serializer_class = FollowListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Follow.objects.filter(
            follower=self.request.user
        ).select_related(
            "following"
        )


class FollowerListView(generics.ListAPIView):
    serializer_class = FollowListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Follow.objects.filter(
            following=self.request.user
        ).select_related(
            "follower"
        )

class UserFollowingListView(generics.ListAPIView):
    serializer_class = FollowDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Follow.objects.filter(
            follower_id=self.kwargs["user_id"]
        ).select_related(
            "follower",
            "following",

        )

class UserFollowerListView(generics.ListAPIView):
    serializer_class = FollowDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Follow.objects.filter(
            following_id=self.kwargs["user_id"]
        ).select_related(
            "follower",
            "following"
        )


class UnfollowView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):

        delete_count, _ = Follow.objects.filter(
            follower=request.user,
            following_id=user_id
        ).delete()

        if delete_count == 0:
            raise NotFound(
                "Follow relationship not found."
            )

        return Response(
            {"detail": "User unfollowed successfully."},
            status=status.HTTP_200_OK
        )


class FriendRequestCreateView(generics.CreateAPIView):
    serializer_class = FriendRequestCreateSerializer
    permission_classes = [IsAuthenticated]


class ReceivedFriendRequestListView(
    generics.ListAPIView
):

    serializer_class = FriendRequestListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return FriendRequest.objects.filter(
            receiver=self.request.user,
            status=FriendRequest.STATUS_PENDING

        ).select_related("sender")

    

class SentFriendRequestListView(
    generics.ListAPIView
):

    serializer_class = FriendRequestListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return FriendRequest.objects.filter(
            sender= self.request.user
        ).select_related("receiver")


class FriendRequestDetailView(
    generics.RetrieveAPIView
):

    serializer_class = FriendRequestDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return FriendRequest.objects.filter(
            Q(sender=self.request.user) |
            Q(receiver=self.request.user)
        )


class FriendRequestUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):

        friend_request = FriendRequest.objects.filter(
            pk=pk
        ).first()

        if not friend_request:
            raise NotFound(
                "Friend request not found."
            )

        if friend_request.receiver != request.user:
            raise PermissionDenied(
                "You cannot update this request."
            )
        
        if friend_request.status != (
            FriendRequest.STATUS_PENDING
        ):

            return Response(
                {
                    "detail":
                    "Request already processed."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = (
            FriendRequestUpdateSerializer(
                friend_request,
                data=request.data,
                partial=True
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        with transaction.atomic():

            friend_request.status = (
                serializer.validated_data[
                    "status"
                ]
            )
            friend_request.save()

            if(
                friend_request.status == 
                FriendRequest.STATUS_ACCEPTED
            ):

                Friendship.objects.get_or_create(
                    user1=friend_request.sender,
                    user2=friend_request.receiver
                )

        return Response(
            FriendRequestDetailSerializer(
                friend_request
            ).data
        )


class FriendRequestCancelView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):

        friend_request = FriendRequest.objects.filter(
            pk=pk,
            sender=request.user,
            status=FriendRequest.STATUS_PENDING
        ).first()

        if not friend_request:
            raise NotFound(
                "Friend request not found."
            )

        friend_request.delete()

        return Response(
            {"detail": "Friend request cancelled successfully."},
            status=status.HTTP_200_OK
        )


class FriendshipListView(
    generics.ListAPIView
):

    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Friendship.objects.filter(
            Q(user1=self.request.user) |
            Q(user2=self.request.user)
        ).select_related(
            "user1",
            "user2"
        )


class FriendshipDetailView(
    generics.RetrieveAPIView
):

    serializer_class = FriendshipDetailSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):

        return Friendship.objects.filter(
            Q(user1=self.request.user) |
            Q(user2=self.request.user)
        )


class UnfriendView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):

        delete_count, _ = Friendship.objects.filter(
            Q(
                user1=request.user,
                user2_id=user_id
            ) |  
            Q(
                user1_id=user_id,
                user2=request.user
            )
        ).delete()

        if delete_count == 0:
            raise NotFound(
                "Friendship not found."
            )

        return Response(
            {
                "detail":
                "Friend removed successfully."
            },
            status=status.HTTP_200_OK
        )


class BlockCreateView(generics.CreateAPIView):
    serializer_class = BlockCreateSerializer
    permission_classes = [IsAuthenticated]


class BlockListView(
    generics.ListAPIView
):

    serializer_class = BlockListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Block.objects.filter(
            blocker=self.request.user
        ).select_related(
            "blocked"
        )


class BlockDetailView(
    generics.RetrieveAPIView
):

    serializer_class = BlockDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Block.objects.filter(
            blocker=self.request.user
        )

class UnblockView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):

        delete_count, _ = Block.objects.filter(
            blocker=request.user,
            blocked_id=user_id
        ).delete()

        if delete_count == 0:
            raise NotFound(
                "Block relationship not found."
            )

        return Response(
            {
                "detail":
                "User unblocked successfully."
            },
            status=status.HTTP_200_OK
        )
        