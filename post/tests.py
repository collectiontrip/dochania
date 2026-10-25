
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from moderation.models import UserModeration
from post.models import Post


User = get_user_model()


class PostModerationPermissionTests(TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="post_test_user",
            email="post_test_user@example.com",
            password="TestPassword123!",
            is_active=True,
        )

        self.other_user = User.objects.create_user(
            username="post_test_other",
            email="post_test_other@example.com",
            password="TestPassword123!",
            is_active=True,
        )

        self.post = Post.objects.create(
            author=self.user,
            content="Original post content",
            visibility="public",
            access_type="free",
        )

        self.create_url = reverse("post-create")
        self.update_url = reverse(
            "post-update",
            kwargs={"pk": self.post.pk},
        )

    def set_moderation(self, **changes):
        moderation, _ = UserModeration.objects.get_or_create(
            user=self.user,
        )

        for field, value in changes.items():
            setattr(moderation, field, value)

        moderation.save()
        return moderation

    def test_normal_user_can_create_post(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.create_url,
            {
                "content": "A normal public post",
                "visibility": "public",
                "access_type": "free",
                "coins": 0,
                "allow_comments": True,
                "hide_like_count": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_restricted_user_cannot_create_post(self):
        self.set_moderation(
            is_restricted=True,
            restriction_expires_at=timezone.now()
            + timedelta(days=2),
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.create_url,
            {
                "content": "This should be blocked",
                "visibility": "public",
                "access_type": "free",
                "coins": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_suspended_user_cannot_create_post(self):
        self.set_moderation(
            is_suspended=True,
            suspension_expires_at=timezone.now()
            + timedelta(days=2),
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.create_url,
            {
                "content": "This should be blocked",
                "visibility": "public",
                "access_type": "free",
                "coins": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_banned_user_cannot_create_post(self):
        self.set_moderation(is_banned=True)

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.create_url,
            {
                "content": "This should be blocked",
                "visibility": "public",
                "access_type": "free",
                "coins": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_restricted_user_cannot_update_post(self):
        self.set_moderation(
            is_restricted=True,
            restriction_expires_at=timezone.now()
            + timedelta(days=2),
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.update_url,
            {"content": "Updated content"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_suspended_user_cannot_update_post(self):
        self.set_moderation(
            is_suspended=True,
            suspension_expires_at=timezone.now()
            + timedelta(days=2),
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.update_url,
            {"content": "Updated content"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_banned_user_cannot_update_post(self):
        self.set_moderation(is_banned=True)

        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.update_url,
            {"content": "Updated content"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
