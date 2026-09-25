from uuid import UUID

from django.db.models import Q

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.mixins import (
    ListModelMixin,
    RetrieveModelMixin,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from reports.constants import (
    REPORT_ACTION_NONE,
    REPORT_REASON_CHOICES,
    REPORT_STATUS_CHOICES,
)

from .constants import (
    MODERATION_PRIORITY_CHOICES,
)

from .models import (
    ModerationActionLog,
    ModerationCase,
    UserModeration,
)

from .pagination import (
    ModerationCasePagination,
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

from .services import (
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
# VALID FILTER VALUES
# ============================================================


VALID_REPORT_STATUSES = frozenset(
    value
    for value, label in REPORT_STATUS_CHOICES
)


VALID_REPORT_REASONS = frozenset(
    value
    for value, label in REPORT_REASON_CHOICES
)


VALID_MODERATION_PRIORITIES = frozenset(
    value
    for value, label in MODERATION_PRIORITY_CHOICES
)


VALID_ASSIGNMENTS = frozenset(
    {
        "all",
        "assigned",
        "unassigned",
    }
)


# ============================================================
# MODERATION CASE VIEWSET
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

    pagination_class = ModerationCasePagination

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
    # QUERYSET
    # ========================================================

    def get_queryset(self):

        queryset = self.queryset

        user = self.request.user

        # ----------------------------------------------------
        # Visibility
        # ----------------------------------------------------

        if user.is_superuser:

            visible_queryset = queryset

        else:

            visible_queryset = queryset.filter(
                Q(
                    assigned_to__isnull=True,
                )
                |
                Q(
                    assigned_to=user,
                )
            )

        # ----------------------------------------------------
        # Filters only apply to list-style endpoints.
        #
        # They must NOT affect:
        #
        # - retrieve
        # - assign
        # - start
        # - resolve
        # - reject
        # ----------------------------------------------------

        if self.action not in {
            "list",
            "assigned",
            "unassigned",
        }:

            return visible_queryset

        return self._apply_case_filters(
            visible_queryset,
        )

    # ========================================================
    # CASE FILTERS
    # ========================================================

    def _apply_case_filters(
        self,
        queryset,
    ):

        params = self.request.query_params

        # ----------------------------------------------------
        # Search
        #
        # Supports:
        #
        # - Case ID
        # - Report ID
        # - Reporter username
        # - Reporter email
        # ----------------------------------------------------

        search = params.get(
            "search",
        )

        if search:

            search = search.strip()

            if search:

                queryset = queryset.filter(
                    Q(
                        id__icontains=search,
                    )
                    |
                    Q(
                        report__id__icontains=search,
                    )
                    |
                    Q(
                        report__reporter__username__icontains=search,
                    )
                    |
                    Q(
                        report__reporter__email__icontains=search,
                    )
                )

        # ----------------------------------------------------
        # Status
        # ----------------------------------------------------

        status_value = params.get(
            "status",
        )

        if (
            status_value
            and status_value != "all"
        ):

            if status_value not in VALID_REPORT_STATUSES:

                raise ValidationError(
                    {
                        "status": (
                            "Invalid moderation "
                            "status filter."
                        )
                    }
                )

            queryset = queryset.filter(
                report__status=status_value,
            )

        # ----------------------------------------------------
        # Assignment
        # ----------------------------------------------------

        assignment = params.get(
            "assignment",
        )

        if (
            assignment
            and assignment not in VALID_ASSIGNMENTS
        ):

            raise ValidationError(
                {
                    "assignment": (
                        "Invalid assignment filter."
                    )
                }
            )

        if assignment == "assigned":

            queryset = queryset.filter(
                assigned_to__isnull=False,
            )

        elif assignment == "unassigned":

            queryset = queryset.filter(
                assigned_to__isnull=True,
            )

        # ----------------------------------------------------
        # Report Reason
        # ----------------------------------------------------

        reason = params.get(
            "reason",
        )

        if (
            reason
            and reason != "all"
        ):

            if reason not in VALID_REPORT_REASONS:

                raise ValidationError(
                    {
                        "reason": (
                            "Invalid report "
                            "reason filter."
                        )
                    }
                )

            queryset = queryset.filter(
                report__reason=reason,
            )

        # ----------------------------------------------------
        # Priority
        # ----------------------------------------------------

        priority = params.get(
            "priority",
        )

        if (
            priority
            and priority != "all"
        ):

            if priority not in VALID_MODERATION_PRIORITIES:

                raise ValidationError(
                    {
                        "priority": (
                            "Invalid moderation "
                            "priority filter."
                        )
                    }
                )

            queryset = queryset.filter(
                priority=priority,
            )

        return queryset

    # ========================================================
    # SERIALIZER
    # ========================================================

    def get_serializer_class(self):

        if self.action == "resolve":

            return ModerationResolveSerializer

        if self.action == "reject":

            return ModerationRejectSerializer

        return UserModerationCaseSerializer

    # ========================================================
    # SERVICE ERROR HANDLER
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
    # MODERATION STATS
    # ========================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="stats",
    )
    def stats(
        self,
        request,
        *args,
        **kwargs,
    ):

        # ----------------------------------------------------
        # Stats use visibility rules only.
        #
        # Search/filter parameters intentionally do not
        # affect global moderation statistics.
        # ----------------------------------------------------

        queryset = self.queryset

        user = request.user

        if not user.is_superuser:

            queryset = queryset.filter(
                Q(
                    assigned_to__isnull=True,
                )
                |
                Q(
                    assigned_to=user,
                )
            )

        # ----------------------------------------------------
        # Total
        # ----------------------------------------------------

        total = queryset.count()

        # ----------------------------------------------------
        # Pending
        # ----------------------------------------------------

        pending = queryset.filter(
            started_at__isnull=True,
            resolved_at__isnull=True,
        ).count()

        # ----------------------------------------------------
        # In Progress
        # ----------------------------------------------------

        in_progress = queryset.filter(
            started_at__isnull=False,
            resolved_at__isnull=True,
        ).count()

        # ----------------------------------------------------
        # Completed
        #
        # Both resolve and reject populate resolved_at.
        #
        # "resolved" is kept for frontend compatibility.
        # ----------------------------------------------------

        resolved = queryset.filter(
            resolved_at__isnull=False,
        ).count()

        # ----------------------------------------------------
        # Assignment
        # ----------------------------------------------------

        unassigned = queryset.filter(
            assigned_to__isnull=True,
        ).count()

        assigned = queryset.filter(
            assigned_to__isnull=False,
        ).count()

        # ----------------------------------------------------
        # Decision Statistics
        # ----------------------------------------------------

        decision_stats = {}

        decision_choices = (
            ModerationCase._meta
            .get_field("decision")
            .choices
        )

        for decision_value, decision_label in decision_choices:

            decision_stats[decision_value] = (
                queryset
                .filter(
                    decision=decision_value,
                )
                .count()
            )

        # ----------------------------------------------------
        # Cases Without Decision
        # ----------------------------------------------------

        decision_stats["none"] = queryset.filter(
            decision__isnull=True,
        ).count()

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return Response(
            {
                "total": total,
                "pending": pending,
                "in_progress": in_progress,
                "resolved": resolved,
                "assigned": assigned,
                "unassigned": unassigned,
                "decisions": decision_stats,
            },
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # ASSIGNED CASES
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

        queryset = self.get_queryset()

        queryset = queryset.filter(
            assigned_to=request.user,
        )

        queryset = self.filter_queryset(
            queryset,
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
    # UNASSIGNED CASES
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

        queryset = self.get_queryset()

        queryset = queryset.filter(
            assigned_to__isnull=True,
        )

        queryset = self.filter_queryset(
            queryset,
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
    # ASSIGN CASE
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
    # START CASE
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
    # RESOLVE CASE
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

        serializer = UserModerationCaseSerializer(
            case,
            context=self.get_serializer_context(),
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # REJECT CASE
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

        serializer = UserModerationCaseSerializer(
            case,
            context=self.get_serializer_context(),
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# MODERATION ACTION LOG VIEWSET
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
    # QUERYSET
    # ========================================================

    def get_queryset(self):

        queryset = self.queryset

        user = self.request.user

        # ----------------------------------------------------
        # Visibility
        # ----------------------------------------------------

        if user.is_superuser:

            visible_queryset = queryset

        else:

            visible_queryset = queryset.filter(
                moderation_case__assigned_to=user,
            )

        # ----------------------------------------------------
        # Moderation Case Filter
        # ----------------------------------------------------

        moderation_case_id = (
            self.request.query_params.get(
                "moderation_case",
            )
        )

        if moderation_case_id:

            moderation_case_id = moderation_case_id.strip()

            try:

                UUID(
                    moderation_case_id,
                )

            except (ValueError, AttributeError):

                raise ValidationError(
                    {
                        "moderation_case": (
                            "Invalid moderation case ID."
                        )
                    }
                )

            visible_queryset = visible_queryset.filter(
                moderation_case_id=moderation_case_id,
            )

        return visible_queryset


# ============================================================
# USER MODERATION VIEWSET
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
    # QUERYSET
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

            search = search.strip()

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
