from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import (
    ListModelMixin,
    RetrieveModelMixin,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from reports.constants import (
    REPORT_ACTION_NONE,
)

from .models import (
    ModerationActionLog,
    ModerationCase,
    UserModeration,
)

from .permissions import (
    CanViewModerationCase,
    IsModerator,
)

from .serializers import (
    ModerationActionLogSerializer,
    ModerationRejectSerializer,
    ModerationResolveSerializer,
    UserModerationCaseSerializer,
    UserModerationSerializer,
)

from .service import (
    InvalidModerationAction,
    InvalidModerationDecision,
    ModerationPermissionError,
    ModerationServiceError,
    ModerationTargetNotFound,
    assign_case,
    reject_case,
    resolve_case,
    start_case,
)


# ============================================================
# Moderation Case ViewSet
# ============================================================


class ModerationCaseViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    GenericViewSet,
):

    permission_classes = [
        IsAuthenticated,
        IsModerator,
        CanViewModerationCase,
    ]

    serializer_class = UserModerationCaseSerializer

    lookup_field = "pk"

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    queryset = (
        ModerationCase.objects
        .select_related(
            "report",
            "report__reporter",
            "report__content_type",
            "assigned_to",
        )
        .prefetch_related(
            "action_logs",
            "report__actions",
            "report__evidence",
        )
        .order_by(
            "-created_at",
        )
    )

    # ========================================================
    # Queryset
    # ========================================================

    def get_queryset(self):

        queryset = self.queryset

        user = self.request.user

        # ----------------------------------------------------
        # Superuser
        # ----------------------------------------------------

        if user.is_superuser:
            return queryset

        # ----------------------------------------------------
        # Moderator
        #
        # Can see:
        # 1. Unassigned cases
        # 2. Cases assigned to himself
        # ----------------------------------------------------

        return queryset.filter(
            Q(
                assigned_to__isnull=True,
            )
            |
            Q(
                assigned_to=user,
            )
        )

    # ========================================================
    # Serializer
    # ========================================================

    def get_serializer_class(self):

        if self.action == "resolve":
            return ModerationResolveSerializer

        if self.action == "reject":
            return ModerationRejectSerializer

        return UserModerationCaseSerializer

    # ========================================================
    # Service Error Handler
    # ========================================================

    def _service_error_response(
        self,
        exc,
    ):

        if isinstance(
            exc,
            ModerationPermissionError,
        ):

            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if isinstance(
            exc,
            ModerationTargetNotFound,
        ):

            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if isinstance(
            exc,
            (
                InvalidModerationAction,
                InvalidModerationDecision,
                ModerationServiceError,
            ),
        ):

            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": (
                    "Unable to process "
                    "the moderation request."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ========================================================
    # Assigned Cases
    # ========================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="assigned",
    )
    def assigned(
        self,
        request,
        *args,
        **kwargs,
    ):

        queryset = self.filter_queryset(
            self.get_queryset().filter(
                assigned_to=request.user,
            )
        )

        page = self.paginate_queryset(
            queryset,
        )

        if page is not None:

            serializer = self.get_serializer(
                page,
                many=True,
            )

            return self.get_paginated_response(
                serializer.data,
            )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # Unassigned Cases
    # ========================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="unassigned",
    )
    def unassigned(
        self,
        request,
        *args,
        **kwargs,
    ):

        queryset = self.filter_queryset(
            self.get_queryset().filter(
                assigned_to__isnull=True,
            )
        )

        page = self.paginate_queryset(
            queryset,
        )

        if page is not None:

            serializer = self.get_serializer(
                page,
                many=True,
            )

            return self.get_paginated_response(
                serializer.data,
            )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # Assign Case
    # ========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="assign",
    )
    def assign(
        self,
        request,
        *args,
        **kwargs,
    ):

        case = self.get_object()

        try:

            case = assign_case(
                moderation_case=case,
                moderator=request.user,
            )

        except ModerationServiceError as exc:

            return self._service_error_response(
                exc,
            )

        serializer = UserModerationCaseSerializer(
            case,
            context=self.get_serializer_context(),
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # Start Case
    # ========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="start",
    )
    def start(
        self,
        request,
        *args,
        **kwargs,
    ):

        case = self.get_object()

        try:

            case = start_case(
                moderation_case=case,
                moderation=request.user,
            )

        except ModerationServiceError as exc:

            return self._service_error_response(
                exc,
            )

        serializer = UserModerationCaseSerializer(
            case,
            context=self.get_serializer_context(),
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # Resolve Case
    # ========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="resolve",
    )
    def resolve(
        self,
        request,
        *args,
        **kwargs,
    ):

        case = self.get_object()

        serializer = ModerationResolveSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )

        serializer.is_valid(
            raise_exception=True,
        )

        data = serializer.validated_data

        try:

            case = resolve_case(
                moderation_case=case,
                moderator=request.user,

                action_taken=data.get(
                    "action_taken",
                    REPORT_ACTION_NONE,
                ),

                action_reason=data.get(
                    "action_reason",
                    "",
                ),

                restriction_expires_at=data.get(
                    "restriction_expires_at",
                ),

                suspension_expires_at=data.get(
                    "suspension_expires_at",
                ),

                is_permanent=data.get(
                    "is_permanent",
                    False,
                ),

                note=data.get(
                    "note",
                    "",
                ),
            )

        except ModerationServiceError as exc:

            return self._service_error_response(
                exc,
            )

        output_serializer = UserModerationCaseSerializer(
            case,
            context=self.get_serializer_context(),
        )

        return Response(
            output_serializer.data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # Reject Case
    # ========================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="reject",
    )
    def reject(
        self,
        request,
        *args,
        **kwargs,
    ):

        case = self.get_object()

        serializer = ModerationRejectSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )

        serializer.is_valid(
            raise_exception=True,
        )

        data = serializer.validated_data

        try:

            case = reject_case(
                moderation_case=case,
                moderator=request.user,
                note=data.get(
                    "note",
                    "",
                ),
            )

        except ModerationServiceError as exc:

            return self._service_error_response(
                exc,
            )

        output_serializer = UserModerationCaseSerializer(
            case,
            context=self.get_serializer_context(),
        )

        return Response(
            output_serializer.data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# Moderation Action Log ViewSet
# ============================================================


class ModerationActionLogViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    GenericViewSet,
):

    permission_classes = [
        IsAuthenticated,
        IsModerator,
    ]

    serializer_class = ModerationActionLogSerializer

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    lookup_field = "pk"

    queryset = (
        ModerationActionLog.objects
        .select_related(
            "moderation_case",
            "moderation_case__report",
            "moderator",
        )
        .order_by(
            "-created_at",
        )
    )

    # ========================================================
    # Queryset
    # ========================================================

    def get_queryset(self):

        queryset = self.queryset

        user = self.request.user

        # ----------------------------------------------------
        # Superuser
        # ----------------------------------------------------

        if user.is_superuser:
            return queryset

        # ----------------------------------------------------
        # Moderator
        #
        # Can only see logs belonging to cases
        # assigned to himself.
        # ----------------------------------------------------

        queryset = queryset.filter(
            moderation_case__assigned_to=user,
        )

        # ----------------------------------------------------
        # Filter by moderation case
        # ----------------------------------------------------

        moderation_case_id = (
            self.request.query_params.get(
                "moderation_case",
            )
        )

        if moderation_case_id:

            queryset = queryset.filter(
                moderation_case_id=moderation_case_id,
            )

        return queryset


# ============================================================
# User Moderation ViewSet
# ============================================================


class UserModerationViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    GenericViewSet,
):

    permission_classes = [
        IsAuthenticated,
        IsModerator,
    ]

    serializer_class = UserModerationSerializer

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    lookup_field = "pk"

    queryset = (
        UserModeration.objects
        .select_related(
            "user",
        )
        .order_by(
            "-updated_at",
        )
    )

    # ========================================================
    # Queryset
    # ========================================================

    def get_queryset(self):

        queryset = self.queryset

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        search = self.request.query_params.get(
            "search",
        )

        if search:

            queryset = queryset.filter(
                Q(
                    user__username__icontains=search,
                )
                |
                Q(
                    user__email__icontains=search,
                )
            )

        # ----------------------------------------------------
        # Restricted
        # ----------------------------------------------------

        is_restricted = (
            self.request.query_params.get(
                "is_restricted",
            )
        )

        if is_restricted in {
            "true",
            "false",
        }:

            queryset = queryset.filter(
                is_restricted=(
                    is_restricted == "true"
                ),
            )

        # ----------------------------------------------------
        # Suspended
        # ----------------------------------------------------

        is_suspended = (
            self.request.query_params.get(
                "is_suspended",
            )
        )

        if is_suspended in {
            "true",
            "false",
        }:

            queryset = queryset.filter(
                is_suspended=(
                    is_suspended == "true"
                ),
            )

        # ----------------------------------------------------
        # Banned
        # ----------------------------------------------------

        is_banned = (
            self.request.query_params.get(
                "is_banned",
            )
        )

        if is_banned in {
            "true",
            "false",
        }:

            queryset = queryset.filter(
                is_banned=(
                    is_banned == "true"
                ),
            )

        return queryset