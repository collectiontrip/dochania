# core/serializers.py
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseUserSerializer
from rest_framework import serializers
from .models import User
from relationships.models import Follow, Block

class UserCreateSerializer(BaseUserCreateSerializer):
    password = serializers.CharField(write_only=True, required=True)
    re_password = serializers.CharField(write_only=True, required=True)  # confirm password

    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ['id', 'username', 'email', 'password', 're_password', 'first_name', 'last_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['re_password']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('re_password')  # remove confirm password
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.is_active = False 
        user.save()
        return user


class UserSerializer(BaseUserSerializer):
    is_following = serializers.SerializerMethodField()
    is_followed_by = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    blocked_you = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    coin_balance = serializers.SerializerMethodField()


    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_online',
            'last_seen',
            'bio',
            'profile_picture',
            'is_private',
            'is_following',
            'is_followed_by',
            'is_blocked',
            'blocked_you',
            'followers_count',
            'following_count',
            'coin_balance',
        ]

    def get_is_following(self, obj):

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
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
    

    def get_followers_count(self, obj):
        return Follow.objects.filter(
            following=obj
        ).count()

    def get_following_count(self, obj):
        return Follow.objects.filter(
            follower=obj
        ).count()

    def get_coin_balance(self, obj):
        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and request.user == obj
        ):
            return obj.coin_wallet.balance

        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User

        fields = [
            'username',
            'first_name',
            'last_name',
            'email',
            'bio',
            'profile_picture',
            'is_private',
        ]