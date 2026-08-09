from pathlib import Path

from django.contrib.contenttypes.models import ContentType

from rest_framework import serializers

from .constants import (
    EVIDENCE_TYPE_IMAGE,
    EVIDENCE_TYPE_VIDEO,
    REPORT_ACTION_NONE,
    REPORT_STATUS_PENDING,
    REPORT_STATUS_RESOLVED,
)

from .models import (
    Report,
    ReportAction,
    ReportEvidence,
)


CONTENT_TYPE_MAPPING = {
    "post": (
        "posts",
        "post",
    ),
    "comment": (
        "comments",
        "comment",
    ),
}


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


class ReportEvidenceSerializer(
    serializers.ModelSerializer,
):

    class Meta:

        model = ReportEvidence

        fields = (
            "id",
            "file",
            "evidence_type",
            "created_at",
        )

        read_only_fields = (
            "id",
            "created_at",
        )


class ReportEvidenceCreateSerializer(
    serializers.ModelSerializer,
):

    class Meta:

        model = ReportEvidence

        fields = (
            "file",
            "evidence_type",
        )

    def validate_file(
        self,
        value,
    ):

        max_size = 10 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "Maximum file size is 10 MB."
            )

        extension = (
            Path(value.name)
            .suffix
            .lower()
        )

        evidence_type = (
            self.initial_data.get(
                "evidence_type",
                EVIDENCE_TYPE_IMAGE,
            )
        )

        if (
            evidence_type
            == EVIDENCE_TYPE_IMAGE
        ):
            if extension not in IMAGE_EXTENSIONS:
                raise serializers.ValidationError(
                    "Invalid image file."
                )

        elif (
            evidence_type
            == EVIDENCE_TYPE_VIDEO
        ):
            if extension not in VIDEO_EXTENSIONS:
                raise serializers.ValidationError(
                    "Invalid video file."
                )

        return value


class ReportActionSerializer(
    serializers.ModelSerializer,
):

    moderator = serializers.StringRelatedField()

    class Meta:

        model = ReportAction

        fields = (
            "id",
            "moderator",
            "old_status",
            "new_status",
            "action_taken",
            "note",
            "created_at",
        )

        read_only_fields = (
            "id",
            "moderator",
            "created_at",
        )


class ReportSerializer(
    serializers.ModelSerializer,
):

    reporter = serializers.StringRelatedField()

    reviewed_by = serializers.StringRelatedField()

    evidence = ReportEvidenceSerializer(
        many=True,
        read_only=True,
    )

    actions = ReportActionSerializer(
        many=True,
        read_only=True,
    )

    content_type = serializers.SerializerMethodField()

    class Meta:

        model = Report

        fields = (
            "id",
            "reporter",
            "content_type",
            "object_id",
            "reason",
            "description",
            "status",
            "action_taken",
            "reviewed_by",
            "reviewed_at",
            "evidence",
            "actions",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "reporter",
            "status",
            "action_taken",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        )

    def get_content_type(
        self,
        obj,
    ):
        return obj.content_type.model


class ReportCreateSerializer(
    serializers.ModelSerializer,
):

    content_type = serializers.CharField()

    class Meta:

        model = Report

        fields = (
            "content_type",
            "object_id",
            "reason",
            "description",
        )

    def validate_content_type(
        self,
        value,
    ):

        value = value.lower()

        if value not in CONTENT_TYPE_MAPPING:

            raise serializers.ValidationError(
                "This content type cannot be reported."
            )

        app_label, model = (
            CONTENT_TYPE_MAPPING[value]
        )

        try:

            return ContentType.objects.get(
                app_label=app_label,
                model=model,
            )

        except ContentType.DoesNotExist:

            raise serializers.ValidationError(
                "Invalid content type."
            )

    def validate(
        self,
        attrs,
    ):

        request = self.context["request"]

        user = request.user

        content_type = attrs["content_type"]

        object_id = attrs["object_id"]

        if Report.objects.filter(
            reporter=user,
            content_type=content_type,
            object_id=object_id,
        ).exists():

            raise serializers.ValidationError(
                "You have already reported this content."
            )

        model_class = (
            content_type.model_class()
        )

        if model_class is None:

            raise serializers.ValidationError(
                {
                    "content_type": (
                        "Invalid content type."
                    )
                }
            )

        try:

            obj = model_class.objects.get(
                pk=object_id,
            )

        except model_class.DoesNotExist:

            raise serializers.ValidationError(
                {
                    "object_id": (
                        "Object does not exist."
                    )
                }
            )

        if (
            hasattr(obj, "is_deleted")
            and obj.is_deleted
        ):
            raise serializers.ValidationError(
                "Content no longer exists."
            )

        owner = None

        if content_type.model == "post":
            owner = obj.author

        elif content_type.model == "comment":
            owner = obj.user

        if owner == user:

            raise serializers.ValidationError(
                "You cannot report your own content."
            )

        return attrs

    def create(
        self,
        validated_data,
    ):

        return Report.objects.create(
            reporter=self.context["request"].user,
            status=REPORT_STATUS_PENDING,
            **validated_data,
        )


class ReportUpdateSerializer(
    serializers.ModelSerializer,
):

    class Meta:

        model = Report

        fields = (
            "status",
            "action_taken",
        )

    def validate(
        self,
        attrs,
    ):

        status = attrs.get(
            "status",
            self.instance.status,
        )

        action_taken = attrs.get(
            "action_taken",
            self.instance.action_taken,
        )

        if (
            status == REPORT_STATUS_RESOLVED
            and action_taken == REPORT_ACTION_NONE
        ):
            raise serializers.ValidationError(
                {
                    "action_taken": (
                        "Please select an action."
                    )
                }
            )

        return attrs

    def update(
        self,
        instance,
        validated_data,
    ):

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        instance.save()

        return instance