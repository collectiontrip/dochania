from django.db import models
from django.contrib.auth.models import AbstractUser





class User(AbstractUser):
    is_active = models.BooleanField(default=False)
    email = models.EmailField(unique=True)
 
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    public_key = models.TextField(blank=True, null=True)
    
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True
    )

    bio = models.CharField(
        max_length=255,
        blank=True,
        null=True
        )

    is_private = models.BooleanField(default=False)

    is_verified = models.BooleanField(
        default=False,
    )

    failed_login_attempts = models.PositiveSmallIntegerField(
        default=0,
    )

    locked_until = models.DateTimeField(
        null=True,
        blank=True,
    )

    last_failed_login_at = models.DateTimeField(
        null=True,
        blank=True,
    )


class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    user_agent = models.TextField()
    platform = models.CharField(max_length=100, blank=True)
    device_name = models.CharField(max_length=100, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.platform}"