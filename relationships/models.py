from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction


User = settings.AUTH_USER_MODEL


class Follow(models.Model):
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="following_relationships"
    )

    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="follower_relationships"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:

        db_table = "follows"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="unique_follow_relationship"
            ),

            models.CheckConstraint(
                condition=~models.Q(
                    follower=models.F("following")
                ),
                name="prevent_self_follow"
            ),
        ]

        indexes = [
            models.Index(
                fields=["follower", "-created_at"]
            ),
            models.Index(
                fields=["following", "-created_at"]
            ),
        ]
    
    def clean(self):

        if self.follower == self.following:
            raise ValidationError(
                "Users cannot follow themselves."
            )

    def save(self, *args, **kwargs):

        self.full_clean()
        super().save(*args, **kwargs)

    
    def __str__(self):
        return f"{self.follower} follows {self.following}"


class FriendRequest(models.Model):

    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),

    ]

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_friend_requests"
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_friend_requests"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:

        db_table = "friend_requests"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["sender", "receiver"],
                condition=models.Q(status="pending"),
                name="unique_pending_friend_request"
            ),

            models.CheckConstraint(
                condition=~models.Q(
                    sender=models.F("receiver")
                ),
                name="prevent_self_friend_request"
            ),

        ]

        indexes = [
            models.Index(
                fields=["sender", "status"]
            ),
            models.Index(
                fields=["receiver", "status"]
            ),
            
        ]

    def clean(self):
        
        if self.sender == self.receiver:
            raise ValidationError(
                "Users cannot send friend request to themselves."
            )
    
    def save(self, *args, **kwargs):

        self.full_clean()

        super().save(*args, **kwargs)
    
    def __str__(self):

        return (
            f"{self.sender} -> "
            f"{self.receiver} "
            f"({self.status})"
        )


class Friendship(models.Model):

    user1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="friendships_initiated"
    )

    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="friendships_received"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:

        db_table = "friendships"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user1", "user2"],
                name="unique_friendship"
            ),

            models.CheckConstraint(
                condition=~models.Q(
                    user1=models.F("user2")
                ),
                name="prevent_self_friendship"
            ),
        ]

        indexes = [
            models.Index(
                fields=["user1", "-created_at"]
            ),
            models.Index(
                fields=["user2", "-created_at"]
            ),
        ]

    def clean(self):

        if self.user1 == self.user2:
            raise ValidationError(
                "Users cannot be friends with themselves."
            )

    def save(self, *args, **kwargs):

        if (
            self.user1_id is not None and 
            self.user2_id is not None and 
            self.user1_id > self.user2_id
        ):
            
            self.user1_id, self.user2_id = (
                self.user2_id,
                self.user1_id
            )

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):

        return (
            f"{self.user1} <-> {self.user2}"
        )


class Block(models.Model):

    blocker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="blocked_users"
    )

    blocked = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="blocked_by_users"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:

        db_table = "blocks"

        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["blocker", "blocked"],
                name="unique_block_relationship"
            ),

            models.CheckConstraint(
                condition=~models.Q(
                    blocker=models.F("blocked")
                ),
                name="prevent_self_block"
            ),
            
        ]

        indexes = [
            models.Index(
                fields=["blocker", "-created_at"]
            ),
            models.Index(
                fields=["blocked", "-created_at"]
            ),
        ]

    def clean(self):

        if self.blocker == self.blocked:
            raise ValidationError(
                "Users cannot block themselves."
            )

    def save(self, *args, **kwargs):

        self.full_clean()

        with transaction.atomic():
            super().save(*args, **kwargs)

    def __str__(self):

        return (
            f"{self.blocker} blocked {self.blocked}"
        )