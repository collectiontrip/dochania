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


# ============================================================
# CONTENT TYPE MAPPING
# ============================================================

CONTENT_TYPE_MAPPING = {
    "post": (
        "post",
        "post",
    ),
    "comment": (
        "comments",
        "comment",
    ),
}


# ============================================================
# FILE EXTENSIONS
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


# ============================================================
# REPORT EVIDENCE SERIALIZER
# ============================================================

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


# ============================================================
# REPORT EVIDENCE CREATE SERIALIZER
# ============================================================

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


        else:

            raise serializers.ValidationError(
                "Invalid evidence type."
            )


        return value


# ============================================================
# REPORT ACTION SERIALIZER
# ============================================================

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


# ============================================================
# REPORTED CONTENT AUTHOR SERIALIZER
# ============================================================

class ReportedContentAuthorSerializer(
    serializers.Serializer,
):

    username = serializers.CharField(
        read_only=True,
    )

    profile_picture = serializers.SerializerMethodField()


    def get_profile_picture(
        self,
        obj,
    ):

        if not obj:

            return None


        profile_picture = getattr(
            obj,
            "profile_picture",
            None,
        )


        if not profile_picture:

            return None


        try:

            url = profile_picture.url

        except (
            ValueError,
            AttributeError,
        ):

            return None


        request = self.context.get(
            "request",
        )


        if request:

            return request.build_absolute_uri(
                url,
            )


        return url


# ============================================================
# REPORTED CONTENT MEDIA SERIALIZER
# ============================================================

class ReportedContentMediaSerializer(
    serializers.Serializer,
):

    id = serializers.UUIDField(
        read_only=True,
    )

    url = serializers.SerializerMethodField()

    media_type = serializers.CharField(
        read_only=True,
    )


    def get_url(
        self,
        obj,
    ):

        if not obj:

            return None


        file = getattr(
            obj,
            "file",
            None,
        )


        if not file:

            return None


        try:

            url = file.url

        except (
            ValueError,
            AttributeError,
        ):

            return None


        request = self.context.get(
            "request",
        )


        if request:

            return request.build_absolute_uri(
                url,
            )


        return url


# ============================================================
# REPORT READ SERIALIZER
# ============================================================

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

    reason_label = serializers.SerializerMethodField()

    reported_content = serializers.SerializerMethodField()


    class Meta:

        model = Report

        fields = (
            "id",
            "reporter",

            "content_type",
            "object_id",

            "reason",
            "reason_label",
            "description",

            "status",
            "action_taken",

            "reviewed_by",
            "reviewed_at",

            "reported_content",

            "evidence",
            "actions",

            "created_at",
            "updated_at",
        )


        read_only_fields = (
            "id",
            "reporter",

            "reason_label",
            "reported_content",

            "status",
            "action_taken",

            "reviewed_by",
            "reviewed_at",

            "created_at",
            "updated_at",
        )


    # ========================================================
    # CONTENT TYPE
    # ========================================================

    def get_content_type(
        self,
        obj,
    ):

        if not obj.content_type:

            return None


        return obj.content_type.model


    # ========================================================
    # REASON LABEL
    # ========================================================

    def get_reason_label(
        self,
        obj,
    ):

        return obj.get_reason_display()


    # ========================================================
    # PROFILE PICTURE URL
    # ========================================================

    def _get_profile_picture_url(
        self,
        user,
    ):

        if not user:

            return None


        profile_picture = getattr(
            user,
            "profile_picture",
            None,
        )


        if not profile_picture:

            return None


        try:

            url = profile_picture.url

        except (
            ValueError,
            AttributeError,
        ):

            return None


        request = self.context.get(
            "request",
        )


        if request:

            return request.build_absolute_uri(
                url,
            )


        return url


    # ========================================================
    # MEDIA DATA
    # ========================================================

    def _get_media_data(
        self,
        post,
    ):

        if not post:

            return []


        media_queryset = (
            post.media.all()
        )


        serializer = (
            ReportedContentMediaSerializer(
                media_queryset,
                many=True,
                context=self.context,
            )
        )


        return serializer.data


    # ========================================================
    # GET POST DATA
    # ========================================================

    def _get_post_data(
        self,
        post,
    ):

        if not post:

            return None


        author = getattr(
            post,
            "author",
            None,
        )


        content = getattr(
            post,
            "content",
            "",
        )


        return {
            "type": "post",

            "id": post.id,

            "author": {
                "username": (
                    author.username
                    if author
                    else "Unknown user"
                ),

                "profile_picture": (
                    self._get_profile_picture_url(
                        author,
                    )
                ),
            },

            "preview": (
                content[:300]
                if content
                else ""
            ),

            # IMPORTANT:
            # Never return raw PostMedia objects.
            "media": (
                self._get_media_data(
                    post,
                )
            ),

            "parent_post_id": None,

            "parent_post": None,
        }


    # ========================================================
    # GET COMMENT DATA
    # ========================================================

    def _get_comment_data(
        self,
        comment,
    ):

        if not comment:

            return None


        parent_post = None


        # ====================================================
        # FIND PARENT POST
        # ====================================================

        comment_content_type = getattr(
            comment,
            "content_type",
            None,
        )


        comment_object_id = getattr(
            comment,
            "object_id",
            None,
        )


        if (
            comment_content_type
            and comment_object_id
            and comment_content_type.model
            == "post"
        ):

            post_model = (
                comment_content_type.model_class()
            )


            if post_model:

                parent_post = (
                    post_model.objects
                    .select_related(
                        "author",
                    )
                    .prefetch_related(
                        "media",
                    )
                    .filter(
                        pk=comment_object_id,
                    )
                    .first()
                )


        # ====================================================
        # PARENT POST ID
        # ====================================================

        parent_post_id = (

            parent_post.id
            if parent_post
            else None

        )


        # ====================================================
        # COMMENT AUTHOR
        # ====================================================

        comment_author = getattr(
            comment,
            "user",
            None,
        )


        content = getattr(
            comment,
            "content",
            "",
        )


        return {
            "type": "comment",

            "id": comment.id,

            "author": {
                "username": (
                    comment_author.username
                    if comment_author
                    else "Unknown user"
                ),

                "profile_picture": (
                    self._get_profile_picture_url(
                        comment_author,
                    )
                ),
            },

            "preview": (
                content[:300]
                if content
                else ""
            ),

            "media": [],

            "parent_post_id": (
                parent_post_id
            ),

            "parent_post": (
                self._get_post_data(
                    parent_post,
                )
            ),
        }


    # ========================================================
    # REPORTED CONTENT
    # ========================================================

    def get_reported_content(
        self,
        obj,
    ):

        if not obj.content_type:

            return None


        model = (
            obj.content_type.model
        )


        model_class = (
            obj.content_type.model_class()
        )


        if model_class is None:

            return None


        # ====================================================
        # POST
        # ====================================================

        if model == "post":

            post = (
                model_class.objects
                .select_related(
                    "author",
                )
                .prefetch_related(
                    "media",
                )
                .filter(
                    pk=obj.object_id,
                )
                .first()
            )


            return self._get_post_data(
                post,
            )


        # ====================================================
        # COMMENT
        # ====================================================

        if model == "comment":

            comment = (
                model_class.objects
                .select_related(
                    "user",
                    "content_type",
                )
                .filter(
                    pk=obj.object_id,
                )
                .first()
            )


            return self._get_comment_data(
                comment,
            )


        return None


# ============================================================
# REPORT CREATE SERIALIZER
# ============================================================

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


    # ========================================================
    # VALIDATE CONTENT TYPE
    # ========================================================

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


    # ========================================================
    # VALIDATE REPORT
    # ========================================================

    def validate(
        self,
        attrs,
    ):

        request = self.context.get(
            "request",
        )


        if not request or not request.user.is_authenticated:

            raise serializers.ValidationError(
                "Authentication is required."
            )


        user = request.user

        content_type = attrs["content_type"]

        object_id = attrs["object_id"]


        # ====================================================
        # DUPLICATE REPORT
        # ====================================================

        if Report.objects.filter(
            reporter=user,
            content_type=content_type,
            object_id=object_id,
        ).exists():

            raise serializers.ValidationError(
                "You have already reported this content."
            )


        # ====================================================
        # TARGET MODEL
        # ====================================================

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


        # ====================================================
        # TARGET OBJECT
        # ====================================================

        try:

            obj = (
                model_class.objects.get(
                    pk=object_id,
                )
            )

        except model_class.DoesNotExist:

            raise serializers.ValidationError(
                {
                    "object_id": (
                        "Object does not exist."
                    )
                }
            )


        # ====================================================
        # DELETED CONTENT
        # ====================================================

        if (
            getattr(
                obj,
                "is_deleted",
                False,
            )
        ):

            raise serializers.ValidationError(
                "Content no longer exists."
            )


        # ====================================================
        # CONTENT OWNER
        # ====================================================

        owner = None


        if content_type.model == "post":

            owner = getattr(
                obj,
                "author",
                None,
            )


        elif content_type.model == "comment":

            owner = getattr(
                obj,
                "user",
                None,
            )


        # ====================================================
        # OWN CONTENT
        # ====================================================

        if owner == user:

            raise serializers.ValidationError(
                "You cannot report your own content."
            )


        return attrs


    # ========================================================
    # CREATE REPORT
    # ========================================================

    def create(
        self,
        validated_data,
    ):

        return Report.objects.create(
            reporter=self.context["request"].user,
            status=REPORT_STATUS_PENDING,
            **validated_data,
        )


# ============================================================
# REPORT UPDATE SERIALIZER
# ============================================================

class ReportUpdateSerializer(
    serializers.ModelSerializer,
):

    class Meta:

        model = Report

        fields = (
            "status",
            "action_taken",
        )


    # ========================================================
    # VALIDATE UPDATE
    # ========================================================

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


    # ========================================================
    # UPDATE REPORT
    # ========================================================

    def update(
        self,
        instance,
        validated_data,
    ):

        for attr, value in (
            validated_data.items()
        ):

            setattr(
                instance,
                attr,
                value,
            )


        instance.save()


        return instance