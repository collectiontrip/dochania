from django.db import transaction
from rest_framework import serializers
from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()

from .models import (
    Follow,
    FriendRequest,
    Friendship,
    Block
)


class FollowCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Follow
        fields = [
            "following",
        ]
    
    def validate_following(self, value):

        request = self.context["request"]

        if request.user == value:
            raise serializers.ValidationError(
                "You cannot follow yourself."
            )
        
        if Block.objects.filter(
            Q(blocker=request.user, blocked=value) |
            Q(blocker=value, blocked=request.user)
        ).exists():
            raise serializers.ValidationError(
                "You cannot follow this user."
            )
        
        return value

    def validate(self, attrs):

        request = self.context["request"]
        following = attrs["following"]

        if Follow.objects.filter(
            follower=request.user,
            following=following
        ).exists():

            raise serializers.ValidationError(
                "You already follow this user."
            )

        

        return attrs

    def create(self, validated_data):

        return Follow.objects.create(
            follower=self.context["request"].user,
            **validated_data
        )


class FollowUserSerializer(
    serializers.ModelSerializer
):
    is_following = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "profile_picture",
            "bio",
            "is_private",
            "is_following",
        ]
    
    def get_is_following(self, obj):

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return Follow.objects.filter(
            follower=request.user,
            following=obj
        ).exists()

    
    

class FollowDetailSerializer(
    serializers.ModelSerializer
):

    follower = FollowUserSerializer(
        read_only=True
    )

    following = FollowUserSerializer(
        read_only=True
    )

    class Meta:
        model = Follow

        fields = [
            "id",
            "follower",
            "following",
            "created_at",
        ]


class UserMiniSerializer(serializers.ModelSerializer):

    is_following = serializers.SerializerMethodField()
    is_followed_by = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    blocked_you = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "profile_picture",
            "is_following",
            "is_followed_by",
            "is_blocked",
            "blocked_you",
        ]

    def get_is_following(self, obj):
        request = self.context.get("request")

        if not request:
            return False

        return Follow.objects.filter(
            follower=request.user,
            following=obj
        ).exists()

    def get_is_followed_by(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return Follow.objects.filter(
            follower=obj,
            following=request.user
        ).exists()

    def get_is_blocked(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return Block.objects.filter(
            blocker=request.user,
            blocked=obj
        ).exists()

    def get_blocked_you(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return Block.objects.filter(
            blocker=obj,
            blocked=request.user
        ).exists()
            


class FollowListSerializer(serializers.ModelSerializer):
    follower = UserMiniSerializer(
        read_only=True
    )

    following = UserMiniSerializer(
        read_only=True
    )

    
    class Meta:
        model = Follow

        fields = [
            "id",
            "follower",
            "following",
            "created_at"
        ]

class FriendRequestCreateSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = FriendRequest

        fields = [
            "receiver",
        ]

    def validate_receiver(self, value):

        request = self.context["request"]

        if request.user == value:

            raise serializers.ValidationError(
                "You cannot send a friend request to yourself."
            )
        
        return value

    def validate(self, attrs):
        sender = self.context["request"].user
        receiver = attrs["receiver"]

        if FriendRequest.objects.filter(
            sender=sender,
            receiver=receiver,
            status=FriendRequest.STATUS_PENDING
        ).exists():

            raise serializers.ValidationError(
                "Friend request already exists."
            )

        if FriendRequest.objects.filter(
            sender=receiver,
            receiver=sender,
            status=FriendRequest.STATUS_PENDING
        ).exists():

            raise serializers.ValidationError(
                "This user has already sent you a friend request."
            )
        
        if Friendship.objects.filter(
            Q(user1=sender, user2=receiver) |
            Q(user1=receiver, user2=sender)
        ).exists():

            raise serializers.ValidationError(
                "You are already friends."
            )
        
        if Block.objects.filter(
            Q(blocker=sender, blocked=receiver) |
            Q(blocker=receiver, blocked=sender)
        ).exists():

            raise serializers.ValidationError(
                "Friend request cannot be sent."
            )

        return attrs

    def create(self, validated_data):

        return FriendRequest.objects.create(
            sender=self.context["request"].user,
            **validated_data
        )


class FriendRequestListSerializer(
    serializers.ModelSerializer
):

    sender_id = serializers.IntegerField(
        source="sender.id",
        read_only=True
    )

    receiver_id = serializers.IntegerField(
        source="receiver.id",
        read_only=True
    )

    class Meta:

        model = FriendRequest

        fields = [
            "id",
            "sender_id",
            "receiver_id",
            "status",
            "created_at",
        ]


class FriendRequestDetailSerializer(
    serializers.ModelSerializer
):

    sender_id = serializers.IntegerField(
        source="sender.id",
        read_only=True
    )

    receiver_id = serializers.IntegerField(
        source="receiver.id",
        read_only=True
    )

    
    class Meta:

        model = FriendRequest

        fields = [
            "id",
            "sender_id",
            "receiver_id",
            "status",
            "created_at",
            "updated_at",
        ]


class FriendRequestUpdateSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = FriendRequest

        fields = [
            "status",
        ]

    def validate_status(self, value):

        allowed_statuses = [
            FriendRequest.STATUS_ACCEPTED,
            FriendRequest.STATUS_REJECTED,
        ]

        if value not in allowed_statuses:

            raise serializers.ValidationError(
                "Invalid status."
            )
        
        return value


class FriendshipSerializer(
    serializers.ModelSerializer
):

    user1_id = serializers.IntegerField(
        source="user1.id",
        read_only=True
    )

    user2_id = serializers.IntegerField(
        source="user2.id",
        read_only=True
    )


    class Meta:

        model = Friendship

        fields = [
            "id",
            "user1_id",
            "user2_id",
            "created_at",
        ]


class FriendshipDetailSerializer(
    serializers.ModelSerializer
):

    user1_id = serializers.IntegerField(
        source="user1.id",
        read_only=True
    )

    user2_id = serializers.IntegerField(
        source="user2.id",
        read_only=True
    )

    
    class Meta:

        model = Friendship

        fields = [
            "id",
            "user1_id",
            "user2_id",
            "created_at",
        ]


class BlockCreateSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = Block

        fields = [
            "blocked",
        ]
    
    def validate_blocked(self, value):

        request = self.context["request"]

        if request.user == value:

            raise serializers.ValidationError(
                "You cannot block yourself."
            )
        
        return value

    def validate(self, attrs):

        blocker = self.context["request"].user
        blocked = attrs["blocked"]

        if Block.objects.filter(
            blocker=blocker,
            blocked=blocked
        ).exists():

            raise serializers.ValidationError(
                "User is already blocked."
            )

        return attrs

    def create(self, validated_data):

        with transaction.atomic():

            block = Block.objects.create(
                blocker=self.context["request"].user,
                **validated_data
            )

            Friendship.objects.filter(
                Q(
                    user1=block.blocker,
                    user2=block.blocked
                ) |
                Q(
                    user1=block.blocked,
                    user2=block.blocker
                )
            ).delete()

            Follow.objects.filter(
                Q(
                    follower=block.blocker,
                    following=block.blocked
                ) |
                Q(
                    follower=block.blocked,
                    following=block.blocker
                )
            ).delete()

            FriendRequest.objects.filter(
                Q(
                    sender=block.blocker,
                    receiver=block.blocked
                ) |
                Q(
                    sender=block.blocked,
                    receiver=block.blocker
                )
            ).delete()

            return block


class BlockListSerializer(
    serializers.ModelSerializer
):

    blocker = UserMiniSerializer(read_only=True)
    blocked = UserMiniSerializer(read_only=True)

    class Meta:

        model = Block

        fields = [
            "id",
            "blocker",
            "blocked",
            "created_at",
        ]


class BlockDetailSerializer(
    serializers.ModelSerializer
):

    blocker_id = serializers.IntegerField(
        source="blocker.id",
        read_only=True
    )

    blocked_id = serializers.IntegerField(
        source="blocked.id",
        read_only=True
    )

    class Meta:

        model = Block

        fields = [
            "id",
            "blocker_id",
            "blocked_id",
            "created_at",
        ]