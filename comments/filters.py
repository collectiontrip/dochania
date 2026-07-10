import django_filters

from .models import Comment
from .utils import get_content_type


class CommentFilter(
    django_filters.FilterSet,
):

    content_type = django_filters.CharFilter(
        method="filter_content_type",
    )

    object_id = django_filters.UUIDFilter(
        field_name="object_id",
    )

    parent = django_filters.UUIDFilter(
        field_name="parent_id",
    )

    class Meta:

        model = Comment

        fields = (
            "content_type",
            "object_id",
            "parent",
        )

    def filter_content_type(
        self,
        queryset,
        _name,
        value,
    ):

        content_type = get_content_type(
            value,
        )

        return queryset.filter(
            content_type=content_type,
        )