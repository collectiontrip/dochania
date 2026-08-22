from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone

from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .constants import (
    REPORT_REASON_CHOICES,
    REPORT_STATUS_PENDING,
)

from .models import (
    Report,
    ReportAction,
    ReportEvidence,
)

from .permissions import (
    IsModerator,
    IsReportOwnerOrModerator,
)

from .serializers import (
    ReportSerializer,
    ReportCreateSerializer,
    ReportUpdateSerializer,
    ReportEvidenceSerializer,
    ReportEvidenceCreateSerializer,
)


class ReportViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    """
    Report API.

    Normal user:
        - Create report
        - List own reports
        - Retrieve own reports
        - Upload evidence to own pending reports
        - Get available report reasons

    Moderator:
        - View all reports
        - Retrieve any report
        - Update report status/action
        - Upload evidence where permitted
        - Get available report reasons
    """

    lookup_field = "id"

    http_method_names = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "options",
    ]

    queryset = (
        Report.objects
        .select_related(
            "reporter",
            "reviewed_by",
            "content_type",
        )
        .prefetch_related(
            Prefetch(
                "actions",
                queryset=(
                    ReportAction.objects
                    .select_related(
                        "moderator",
                    )
                    .order_by(
                        "-created_at",
                    )
                ),
            ),
            Prefetch(
                "evidence",
                queryset=(
                    ReportEvidence.objects
                    .order_by(
                        "-created_at",
                    )
                ),
            ),
        )
        .order_by(
            "-created_at",
        )
    )

    # ============================================================
    # QUERYSET
    # ============================================================

    def get_queryset(
        self,
    ):
        """
        Moderators can access all reports.

        Normal authenticated users can access only
        their own reports.
        """

        queryset = self.queryset

        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if IsModerator().has_permission(
            self.request,
            self,
        ):
            return queryset

        return queryset.filter(
            reporter=user,
        )

    # ============================================================
    # PERMISSIONS
    # ============================================================

    def get_permissions(
        self,
    ):
        """
        Return permissions according to the current action.
        """

        if self.action in (
            "update",
            "partial_update",
            "moderation",
        ):
            permission_classes = (
                IsAuthenticated,
                IsModerator,
            )

        elif self.action == "upload_evidence":
            permission_classes = (
                IsAuthenticated,
                IsReportOwnerOrModerator,
            )

        else:
            permission_classes = (
                IsAuthenticated,
            )

        return [
            permission()
            for permission in permission_classes
        ]

    # ============================================================
    # OBJECT PERMISSIONS
    # ============================================================

    def get_object(
        self,
    ):
        """
        Get object and apply object-level permissions.
        """

        obj = super().get_object()

        self.check_object_permissions(
            self.request,
            obj,
        )

        return obj

    # ============================================================
    # SERIALIZER
    # ============================================================

    def get_serializer_class(
        self,
    ):
        if self.action == "create":
            return ReportCreateSerializer

        if self.action == "upload_evidence":
            return ReportEvidenceCreateSerializer

        if self.action in (
            "update",
            "partial_update",
        ):
            return ReportUpdateSerializer

        return ReportSerializer

    # ============================================================
    # CREATE
    # ============================================================

    def perform_create(
        self,
        serializer,
    ):
        """
        Reporter is assigned inside ReportCreateSerializer.

        Do not accept reporter from frontend.
        """

        serializer.save()

    # ============================================================
    # UPDATE
    # ============================================================

    def update(
        self,
        request,
        *args,
        **kwargs,
    ):
        """
        Moderator-only report update.

        Tracks previous moderation state and creates
        an audit entry when status/action changes.
        """

        partial = kwargs.pop(
            "partial",
            False,
        )

        report = self.get_object()

        old_status = report.status
        old_action = report.action_taken

        serializer = self.get_serializer(
            report,
            data=request.data,
            partial=partial,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        with transaction.atomic():

            report = serializer.save(
                reviewed_by=request.user,
                reviewed_at=timezone.now(),
            )

            self._create_action_log(
                report=report,
                moderator=request.user,
                old_status=old_status,
                old_action=old_action,
                note=request.data.get(
                    "note",
                    "",
                ),
            )

        response_serializer = ReportSerializer(
            report,
            context=self.get_serializer_context(),
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )

    # ============================================================
    # PARTIAL UPDATE
    # ============================================================

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):
        """
        Moderator-only partial update.
        """

        kwargs["partial"] = True

        return self.update(
            request,
            *args,
            **kwargs,
        )

    # ============================================================
    # ACTION LOG
    # ============================================================

    @staticmethod
    def _create_action_log(
        *,
        report,
        moderator,
        old_status,
        old_action,
        note="",
    ):
        """
        Create an audit log only when moderation state
        actually changes.
        """

        status_changed = (
            old_status != report.status
        )

        action_changed = (
            old_action != report.action_taken
        )

        if not (
            status_changed
            or action_changed
        ):
            return None

        return ReportAction.objects.create(
            report=report,
            moderator=moderator,
            old_status=old_status,
            new_status=report.status,
            action_taken=report.action_taken,
            note=note,
        )

    # ============================================================
    # REPORT REASONS
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[
            IsAuthenticated,
        ],
        url_path="reasons",
    )
    def reasons(
        self,
        request,
    ):
        """
        Return available report reasons.

        REPORT_REASON_CHOICES is the single source of truth.
        """

        return Response(
            [
                {
                    "value": value,
                    "label": label,
                }
                for value, label
                in REPORT_REASON_CHOICES
            ],
            status=status.HTTP_200_OK,
        )

    # ============================================================
    # MY REPORTS
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="my-reports",
    )
    def my_reports(
        self,
        request,
    ):
        """
        Return only reports created by the
        authenticated user.

        This remains user-scoped even for moderators.
        """

        queryset = self.filter_queryset(
            self.queryset.filter(
                reporter=request.user,
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

    # ============================================================
    # MODERATION QUEUE
    # ============================================================

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[
            IsAuthenticated,
            IsModerator,
        ],
        url_path="moderation",
    )
    def moderation(
        self,
        request,
    ):
        """
        Moderator-only moderation queue.

        Returns all reports.
        """

        queryset = self.filter_queryset(
            self.queryset,
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

    # ============================================================
    # UPLOAD EVIDENCE
    # ============================================================

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            IsAuthenticated,
            IsReportOwnerOrModerator,
        ],
        url_path="evidence",
    )
    def upload_evidence(
        self,
        request,
        *args,
        **kwargs,
    ):
        """
        Upload evidence to a report.

        Rules:

        - Report owner or moderator only
        - Report must still be pending
        - Maximum 5 evidence files
        """

        report = self.get_object()

        with transaction.atomic():

            # ----------------------------------------------------
            # Lock report row
            # ----------------------------------------------------

            report = (
                Report.objects
                .select_for_update()
                .get(
                    pk=report.pk,
                )
            )

            # ----------------------------------------------------
            # Status check
            # ----------------------------------------------------

            if report.status != REPORT_STATUS_PENDING:

                return Response(
                    {
                        "detail": (
                            "Evidence can only be added "
                            "to pending reports."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ----------------------------------------------------
            # Evidence limit
            # ----------------------------------------------------

            evidence_count = (
                ReportEvidence.objects
                .filter(
                    report=report,
                )
                .count()
            )

            if evidence_count >= 5:

                return Response(
                    {
                        "detail": (
                            "Maximum 5 evidence files "
                            "are allowed."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ----------------------------------------------------
            # Validate evidence
            # ----------------------------------------------------

            serializer = self.get_serializer(
                data=request.data,
                context=self.get_serializer_context(),
            )

            serializer.is_valid(
                raise_exception=True,
            )

            evidence = serializer.save(
                report=report,
            )

        # --------------------------------------------------------
        # Response
        # --------------------------------------------------------

        response_serializer = ReportEvidenceSerializer(
            evidence,
            context=self.get_serializer_context(),
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )