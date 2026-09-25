from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone


from rest_framework import (
    mixins,
    status,
)

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

    IMPORTANT:

    The moderation system has a dedicated moderation workflow.

    Therefore direct report updates are restricted to the
    report-level status/action workflow and must not be used
    for account moderation state changes such as:

        - account restriction
        - account suspension
        - account ban

    Those actions must go through moderation/services.py.
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
        Return permissions according to current action.
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
        Reporter is assigned inside serializer.

        Frontend cannot provide reporter.
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

        This endpoint handles report-level status/action
        updates and creates a ReportAction audit entry.

        IMPORTANT:

        Account-level moderation actions must still be
        performed through moderation/services.py.

        This prevents direct Report updates from becoming
        the source of truth for UserModeration.
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

        requested_action = serializer.validated_data.get(
            "action_taken",
            report.action_taken,
        )

        # --------------------------------------------------------
        # ACCOUNT MODERATION PROTECTION
        # --------------------------------------------------------
        #
        # These actions require the centralized moderation
        # service because they modify UserModeration and
        # ModerationCase state.
        #
        # Therefore they cannot be applied through:
        #
        #     PATCH /reports/<id>/
        #
        # --------------------------------------------------------

        account_moderation_actions = {
            "account_restricted",
            "account_suspended",
            "account_banned",
        }

        if requested_action in account_moderation_actions:

            return Response(
                {
                    "detail": (
                        "Account moderation actions must be "
                        "performed through the moderation case "
                        "workflow."
                    ),
                    "code": "use_moderation_workflow",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------------
        # TRANSACTION
        # --------------------------------------------------------

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

        # --------------------------------------------------------
        # RESPONSE
        # --------------------------------------------------------

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

        Account-level moderation actions are rejected by
        update() and must use moderation/services.py.
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
        Create audit log only when moderation state changes.
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
        permission_classes=[
            IsAuthenticated,
        ],
        url_path="my-reports",
    )
    def my_reports(
        self,
        request,
    ):
        """
        Return only reports created by the
        authenticated user.

        Even moderators receive only their own
        reports from this endpoint.
        """

        queryset = (
            self.queryset
            .filter(
                reporter=request.user,
            )
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

        This endpoint is read-only.

        Actual account moderation actions are handled by
        the dedicated moderation case workflow.
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
            # LOCK REPORT ROW
            # ----------------------------------------------------

            report = (
                Report.objects
                .select_for_update()
                .get(
                    pk=report.pk,
                )
            )

            # ----------------------------------------------------
            # STATUS CHECK
            # ----------------------------------------------------

            if (
                report.status
                != REPORT_STATUS_PENDING
            ):

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
            # EVIDENCE LIMIT
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
            # VALIDATE EVIDENCE
            # ----------------------------------------------------

            serializer = self.get_serializer(
                data=request.data,
                context=self.get_serializer_context(),
            )

            serializer.is_valid(
                raise_exception=True,
            )

            # ----------------------------------------------------
            # SAVE EVIDENCE
            # ----------------------------------------------------

            evidence = serializer.save(
                report=report,
            )

        # --------------------------------------------------------
        # RESPONSE
        # --------------------------------------------------------

        response_serializer = (
            ReportEvidenceSerializer(
                evidence,
                context=self.get_serializer_context(),
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )