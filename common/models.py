from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .managers import ActiveManager
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        abstract = True

    
class GenericRelationModel(models.Model):

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        db_index=True,
    )

    object_id = models.UUIDField(
        db_index=True,
    )

    content_object = GenericForeignKey(
        ct_field="content_type",
        fk_field="object_id"
    )

    class Meta:
        abstract = True
        indexes = [
            models.Index(
                fields=["content_type", "object_id"],
                name="generic_relation_idx",
            ),
        ]


class SoftDeleteModel(models.Model):

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
    )

    deleted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        
        if self.is_deleted:
            return

        self.is_deleted = True
        self.deleted_at = timezone.now()

        self.save(
            update_fields=[
                "is_deleted",
                "deleted_at",
            ]
        )