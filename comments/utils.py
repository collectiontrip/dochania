from django.contrib.contenttypes.models import ContentType
from rest_framework.exceptions import ValidationError

from post.models import Post


CONTENT_TYPE_MODELS = {
    "post": Post,
}


def get_content_type(
    content_type,
):
    normalized_type = content_type.lower()

    if normalized_type == "comment":
        from .models import Comment

        model = Comment
    else:
        model = CONTENT_TYPE_MODELS.get(
            normalized_type,
        )

    if model is None:
        raise ValidationError(
            {
                "content_type": (
                    "Invalid content type."
                )
            }
        )

    return ContentType.objects.get_for_model(
        model,
    )
