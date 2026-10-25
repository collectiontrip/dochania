
import logging
import os
import subprocess
import tempfile

from io import BytesIO
from pathlib import Path

from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image, ImageFilter, ImageOps

from .models import PostMedia


logger = logging.getLogger(__name__)


# ============================================================
# PREVIEW SETTINGS
# ============================================================

IMAGE_PREVIEW_SIZE = (640, 640)
IMAGE_BLUR_RADIUS = 60
IMAGE_PREVIEW_QUALITY = 55

VIDEO_PREVIEW_WIDTH = 480
VIDEO_PREVIEW_SECONDS = 5
VIDEO_PREVIEW_CRF = 32
VIDEO_BLUR_RADIUS = 60
VIDEO_BLUR_POWER = 2
VIDEO_PROCESS_TIMEOUT = 180


# ============================================================
# IMAGE PREVIEW GENERATION
# ============================================================

def _generate_image_preview(media):
    """
    Generate a resized, blurred JPEG preview.

    The original image is never modified.
    """

    with media.file.open("rb") as original_file:
        with Image.open(original_file) as source_image:

            image = ImageOps.exif_transpose(source_image)

            # Convert image modes that JPEG cannot safely store.
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Resize while preserving the original aspect ratio.
            image.thumbnail(
                IMAGE_PREVIEW_SIZE,
                Image.Resampling.LANCZOS,
            )

            # Apply blur to the generated preview.
            image = image.filter(
                ImageFilter.GaussianBlur(
                    radius=IMAGE_BLUR_RADIUS,
                )
            )

            output = BytesIO()

            image.save(
                output,
                format="JPEG",
                quality=IMAGE_PREVIEW_QUALITY,
                optimize=True,
            )

            output.seek(0)

            return ContentFile(
                output.read(),
                name=f"{media.pk}_preview.jpg",
            )


# ============================================================
# VIDEO PREVIEW GENERATION
# ============================================================

def _generate_video_preview(media):
    """
    Generate a short, low-resolution, blurred MP4 preview.

    Audio is removed and temporary files are cleaned up.
    """

    input_path = None
    output_path = None

    try:
        original_suffix = (
            Path(media.file.name).suffix or ".mp4"
        )

        # Copy the original video to a temporary input file.
        with tempfile.NamedTemporaryFile(
            suffix=original_suffix,
            delete=False,
        ) as input_temp:

            input_path = input_temp.name

            with media.file.open("rb") as original_file:
                for chunk in original_file.chunks():
                    input_temp.write(chunk)

        # Create a temporary output file.
        with tempfile.NamedTemporaryFile(
            suffix=".mp4",
            delete=False,
        ) as output_temp:

            output_path = output_temp.name

        # Construct the FFmpeg video filter.
        video_filter = (
            f"scale={VIDEO_PREVIEW_WIDTH}:-2,"
            f"boxblur={VIDEO_BLUR_RADIUS}:{VIDEO_BLUR_POWER}"
        )

        command = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-i", input_path,
            "-t", str(VIDEO_PREVIEW_SECONDS),
            "-vf", video_filter,
            "-an",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", str(VIDEO_PREVIEW_CRF),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path,
        ]

        subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=VIDEO_PROCESS_TIMEOUT,
        )

        # Ensure FFmpeg produced a non-empty file.
        if (
            not os.path.isfile(output_path)
            or os.path.getsize(output_path) == 0
        ):
            raise RuntimeError(
                "FFmpeg did not generate a valid video preview."
            )

        with open(output_path, "rb") as preview_file:
            return ContentFile(
                preview_file.read(),
                name=f"{media.pk}_preview.mp4",
            )

    finally:
        # Clean up temporary files even if FFmpeg fails.
        for temporary_path in (input_path, output_path):

            if (
                temporary_path
                and os.path.exists(temporary_path)
            ):
                try:
                    os.remove(temporary_path)

                except OSError:
                    logger.warning(
                        "Could not remove temporary preview file: %s",
                        temporary_path,
                    )


# ============================================================
# CELERY PREVIEW TASK
# ============================================================

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def generate_post_media_preview(self, media_id):
    """
    Generate and save a preview for one PostMedia record.

    Image:
        Resized, blurred JPEG.

    Video:
        Short, low-resolution, blurred MP4 without audio.

    Original media is never intentionally overwritten.
    """

    try:
        media = PostMedia.objects.get(
            pk=media_id,
        )

    except PostMedia.DoesNotExist:
        logger.info(
            "Preview skipped because media %s no longer exists.",
            media_id,
        )
        return "Media no longer exists."

    if not media.file:
        logger.warning(
            "Preview skipped because media %s has no original file.",
            media_id,
        )
        return "Original media file is missing."

    try:
        media.preview_status = "processing"

        media.save(
            update_fields=[
                "preview_status",
            ]
        )

        # Generate the preview based on the stored media type.
        if media.media_type == PostMedia.MEDIA_IMAGE:

            preview_content = _generate_image_preview(
                media,
            )

        elif media.media_type == PostMedia.MEDIA_VIDEO:

            preview_content = _generate_video_preview(
                media,
            )

        else:
            raise ValueError(
                f"Unsupported media type: {media.media_type}"
            )

        # Keep track of the old preview for later cleanup.
        old_preview_name = (
            media.preview_file.name
            if media.preview_file
            else None
        )

        preview_storage = media.preview_file.storage

        # Save the new preview file.
        media.preview_file.save(
            preview_content.name,
            preview_content,
            save=False,
        )

        new_preview_name = media.preview_file.name

        media.preview_status = "ready"

        try:
            media.save(
                update_fields=[
                    "preview_file",
                    "preview_status",
                ]
            )

        except Exception:
            # If the database update fails, remove the newly
            # generated file to avoid leaving an orphan behind.
            try:
                preview_storage.delete(
                    new_preview_name,
                )
            except Exception:
                logger.exception(
                    "Could not clean up preview after database "
                    "save failure for media %s.",
                    media_id,
                )

            raise

        # Delete the old preview only after the new preview
        # has been saved successfully.
        if (
            old_preview_name
            and old_preview_name != new_preview_name
        ):
            try:
                preview_storage.delete(
                    old_preview_name,
                )

            except Exception:
                logger.exception(
                    "Could not delete old preview for media %s.",
                    media_id,
                )

        logger.info(
            "Preview generated successfully for media %s.",
            media_id,
        )

        return "Preview generated successfully."

    except Exception as exc:
        logger.exception(
            "Preview generation failed for media %s.",
            media_id,
        )

        # Retry failed processing up to three times.
        if self.request.retries < self.max_retries:
            raise self.retry(
                exc=exc,
            )

        # Record the final failure without masking the task result.
        PostMedia.objects.filter(
            pk=media_id,
        ).update(
            preview_status="failed",
        )

        return "Preview generation failed after retries."
