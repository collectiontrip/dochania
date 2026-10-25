
from pathlib import Path

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
)

from moderation.services import (
    ModerationPermissionError,
    validate_user_can_create_content,
)

from .models import (
    Post,
    PostMedia,
)


# ============================================================
# SUPPORTED MEDIA TYPES
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
}

VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
}

SUPPORTED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS


# ============================================================
# MODERATION PERMISSION
# ============================================================

def _validate_content_permission(*, user):
    """
    Ensure the user is permitted to create or update content.
    """

    try:
        validate_user_can_create_content(
            user=user,
        )

    except ModerationPermissionError as exc:
        raise PermissionDenied(
            str(exc)
        ) from exc


# ============================================================
# POST CONTENT VALIDATION
# ============================================================

def validate_post_content(*, content, files):
    """
    A post must contain text or at least one media file.
    """

    content = (content or "").strip()

    if not content and not files:
        raise ValidationError({
            "content": [
                "Post must contain text or at least one media file."
            ]
        })

    return content


# ============================================================
# MEDIA TYPE VALIDATION
# ============================================================

def _get_media_type(file):
    """
    Determine media type from the file extension.

    This is an extension check, not a substitute for
    validating the actual file contents.
    """

    filename = getattr(
        file,
        "name",
        "",
    )

    extension = Path(filename).suffix.lower()

    if extension in IMAGE_EXTENSIONS:
        return PostMedia.MEDIA_IMAGE

    if extension in VIDEO_EXTENSIONS:
        return PostMedia.MEDIA_VIDEO

    raise ValidationError({
        "media": [
            f"{filename or 'File'} is not a supported file type."
        ]
    })


# ============================================================
# VALIDATE UPLOADED MEDIA
# ============================================================

def validate_post_media(*, files):
    """
    Validate uploaded files and prepare their media types.
    """

    validated_files = []

    for order, file in enumerate(files or []):

        validated_files.append({
            "file": file,
            "media_type": _get_media_type(file),
            "order": order,
        })

    return validated_files


# ============================================================
# PREVIEW GENERATION
# ============================================================

def _schedule_preview_generation(*, media_id):
    """
    Queue preview generation only after the database commits.
    """

    from .tasks import generate_post_media_preview

    transaction.on_commit(
        lambda media_id=str(media_id):
            generate_post_media_preview.delay(media_id)
    )


# ============================================================
# MEDIA FILE CLEANUP
# ============================================================

def _schedule_media_file_deletion(*, media):
    """
    Delete original and preview files after a media record
    is deleted and the database transaction commits.

    This helper is only used for explicit media deletion
    during post editing, not when a post is soft-deleted.
    """

    files_to_delete = []

    for field_name in (
        "file",
        "preview_file",
    ):
        field_file = getattr(
            media,
            field_name,
            None,
        )

        if not field_file:
            continue

        file_name = field_file.name
        storage = field_file.storage

        if file_name:
            files_to_delete.append(
                (storage, file_name)
            )

    for storage, file_name in files_to_delete:

        transaction.on_commit(
            lambda s=storage, n=file_name: s.delete(n)
        )


# ============================================================
# PAID POST VALIDATION
# ============================================================

def _validate_access_settings(*, access_type, coins):
    """
    Validate paid/free post pricing.
    """

    if access_type == Post.ACCESS_PAID:

        if coins is None or coins <= 0:
            raise ValidationError({
                "coins": [
                    "A positive coin amount is required for paid posts."
                ]
            })

        return coins

    return None


# ============================================================
# CREATE POST
# ============================================================

@transaction.atomic
def create_post(
    *,
    author,
    validated_data,
    files,
):
    """
    Create a post and its initial media records.

    Preview generation is queued after a successful commit.
    """

    _validate_content_permission(
        user=author,
    )

    files = list(files or [])

    content = validate_post_content(
        content=validated_data.get(
            "content",
            "",
        ),
        files=files,
    )

    validated_media = validate_post_media(
        files=files,
    )

    post_data = dict(validated_data)

    post_data.pop(
        "content",
        None,
    )

    access_type = post_data.get(
        "access_type",
    )

    # Validate pricing only when access_type was provided.
    # Model defaults remain responsible for omitted fields.
    if access_type is not None:

        coins = post_data.get(
            "coins",
        )

        post_data["coins"] = _validate_access_settings(
            access_type=access_type,
            coins=coins,
        )

    post = Post.objects.create(
        author=author,
        content=content,
        **post_data,
    )

    for item in validated_media:

        media = PostMedia.objects.create(
            post=post,
            file=item["file"],
            media_type=item["media_type"],
            order=item["order"],
        )

        _schedule_preview_generation(
            media_id=media.pk,
        )

    return post


# ============================================================
# UPDATE POST
# ============================================================

@transaction.atomic
def update_post(
    *,
    post,
    validated_data,
):
    """
    Update post fields and perform media operations.

    Supported media operations:

    Existing media:
        {"id": "<uuid>", "order": 1}

    Delete existing media:
        {"id": "<uuid>", "delete": True}

    Add new media:
        {"file": <uploaded-file>, "order": 0}

    Existing media IDs are scoped to the current post.
    """

    _validate_content_permission(
        user=post.author,
    )

    # Lock the post to reduce concurrent update conflicts.
    post = (
        Post.objects
        .select_for_update()
        .get(pk=post.pk)
    )

    update_data = dict(validated_data)

    media_data = update_data.pop(
        "media",
        None,
    )

    # --------------------------------------------------------
    # VALIDATE ACCESS SETTINGS
    # --------------------------------------------------------

    access_type = update_data.get(
        "access_type",
        post.access_type,
    )

    coins = update_data.get(
        "coins",
        post.coins,
    )

    update_data["coins"] = _validate_access_settings(
        access_type=access_type,
        coins=coins,
    )

    # --------------------------------------------------------
    # LOAD AND LOCK EXISTING MEDIA
    # --------------------------------------------------------

    existing_media = list(
        PostMedia.objects
        .select_for_update()
        .filter(post=post)
        .order_by(
            "order",
            "created_at",
        )
    )

    existing_by_id = {
        str(item.pk): item
        for item in existing_media
    }

    operations = {}
    new_items = []
    deleted_ids = set()

    # --------------------------------------------------------
    # VALIDATE MEDIA OPERATIONS
    # --------------------------------------------------------

    if media_data is not None:

        for position, raw_item in enumerate(media_data):

            item = dict(raw_item)

            media_id = item.pop(
                "id",
                None,
            )

            media_file = item.pop(
                "file",
                None,
            )

            should_delete = item.pop(
                "delete",
                False,
            )

            requested_order = item.pop(
                "order",
                position,
            )

            if item:
                raise ValidationError({
                    "media": [
                        "Unsupported media fields were supplied."
                    ]
                })

            # ------------------------------------------------
            # EXISTING MEDIA OPERATION
            # ------------------------------------------------

            if media_id is not None:

                media_id = str(media_id)

                media = existing_by_id.get(
                    media_id,
                )

                if media is None:
                    raise ValidationError({
                        "media": [
                            (
                                f"Media {media_id} does not belong "
                                "to this post."
                            )
                        ]
                    })

                if media_id in operations:
                    raise ValidationError({
                        "media": [
                            (
                                f"Media {media_id} was supplied "
                                "more than once."
                            )
                        ]
                    })

                if should_delete:

                    if media_file is not None:
                        raise ValidationError({
                            "media": [
                                "Cannot delete and replace media "
                                "in the same operation."
                            ]
                        })

                    if "order" in raw_item:
                        raise ValidationError({
                            "media": [
                                "Cannot change media order while deleting it."
                            ]
                        })

                    deleted_ids.add(
                        media_id,
                    )

                elif media_file is not None:

                    raise ValidationError({
                        "media": [
                            (
                                "Replacing an existing media file "
                                "is not supported. Delete it and "
                                "upload a new file separately."
                            )
                        ]
                    })

                operations[media_id] = {
                    "media": media,
                    "delete": should_delete,
                    "order": requested_order,
                }

                continue

            # ------------------------------------------------
            # NEW MEDIA OPERATION
            # ------------------------------------------------

            if should_delete:
                raise ValidationError({
                    "media": [
                        "An existing media ID is required for deletion."
                    ]
                })

            if media_file is None:
                raise ValidationError({
                    "media": [
                        "A new media item requires a file."
                    ]
                })

            media_type = _get_media_type(
                media_file,
            )

            new_items.append({
                "file": media_file,
                "media_type": media_type,
                "order": requested_order,
                "original_order": len(existing_media) + position,
            })

    # --------------------------------------------------------
    # PREPARE RETAINED MEDIA AND FINAL ORDER
    # --------------------------------------------------------

    retained = []

    for media in existing_media:

        media_id = str(media.pk)

        if media_id in deleted_ids:
            continue

        operation = operations.get(
            media_id,
        )

        if operation is not None:
            desired_order = operation["order"]
        else:
            desired_order = media.order

        retained.append({
            "media": media,
            "order": desired_order,
            "original_order": media.order,
        })

    for item in new_items:

        retained.append({
            "new": item,
            "order": item["order"],
            "original_order": item["original_order"],
        })

    retained.sort(
        key=lambda item: (
            item["order"],
            item["original_order"],
        )
    )

    # --------------------------------------------------------
    # VALIDATE RESULTING POST BEFORE FILE OPERATIONS
    # --------------------------------------------------------

    new_content = update_data.get(
        "content",
        post.content,
    )

    resulting_media_count = len(
        retained,
    )

    if not (new_content or "").strip() and resulting_media_count == 0:
        raise ValidationError({
            "content": [
                "Post must contain text or at least one media file."
            ]
        })

    # --------------------------------------------------------
    # UPDATE POST FIELDS
    # --------------------------------------------------------

    for field, value in update_data.items():
        setattr(
            post,
            field,
            value,
        )

    post.is_edited = True
    post.edited_at = timezone.now()

    post.save()

    # --------------------------------------------------------
    # DELETE MEDIA RECORDS AND CLEAN UP STORAGE
    # --------------------------------------------------------

    for media_id in deleted_ids:

        media = existing_by_id[media_id]

        _schedule_media_file_deletion(
            media=media,
        )

        media.delete()

    # --------------------------------------------------------
    # TEMPORARY ORDER SHIFT
    # --------------------------------------------------------

    surviving_media = [
        item["media"]
        for item in retained
        if "media" in item
    ]

    max_order = max(
        (
            item.order
            for item in existing_media
        ),
        default=-1,
    )

    offset = (
        max_order
        + len(existing_media)
        + len(new_items)
        + 2
    )

    if surviving_media:

        PostMedia.objects.filter(
            pk__in=[
                item.pk
                for item in surviving_media
            ]
        ).update(
            order=F("order") + offset,
        )

    # --------------------------------------------------------
    # SAVE MEDIA IN FINAL ORDER
    # --------------------------------------------------------

    for final_order, item in enumerate(retained):

        if "media" in item:

            media = item["media"]

            media.order = final_order

            media.save(
                update_fields=[
                    "order",
                ]
            )

        else:

            new_item = item["new"]

            media = PostMedia.objects.create(
                post=post,
                file=new_item["file"],
                media_type=new_item["media_type"],
                order=final_order,
            )

            _schedule_preview_generation(
                media_id=media.pk,
            )

    return post


# ============================================================
# SOFT DELETE POST
# ============================================================

@transaction.atomic
def delete_post(*, post):
    """
    Soft-delete a post without deleting its media records
    or original/preview files.
    """

    post = (
        Post.objects
        .select_for_update()
        .get(pk=post.pk)
    )

    if post.is_deleted:
        return post

    post.is_deleted = True
    post.deleted_at = timezone.now()

    post.save(
        update_fields=[
            "is_deleted",
            "deleted_at",
        ]
    )

    return post
