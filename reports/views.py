from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone

from rest_framework import mixins
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .constants import REPORT_STATUS_PENDING

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

    lookup_field = "id"

    http_method_names = [
        "get",
        "post",
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
                ),
            ),
            Prefetch(
                "evidence",
                queryset=ReportEvidence.objects.all(),
            ),
        )
        .order_by(
            "-created_at",
        )
    )

    def get_queryset(
        self,
    ):

        queryset = self.queryset

        if self.request.user.is_staff:
            return queryset

        return queryset.filter(
            reporter=self.request.user,
        )

    def get_permissions(
        self,
    ):

        if self.action in (
            "partial_update",
            "update",
            "moderation",
        ):

            permission_classes = (
                IsAuthenticated,
                IsModerator,
            )

        else:

            permission_classes = (
                IsAuthenticated,
            )

        return [
            permission()
            for permission in permission_classes
        ]

    def get_object(
        self,
    ):

        obj = super().get_object()

        self.check_object_permissions(
            self.request,
            obj,
        )

        return obj

    def get_serializer_class(
        self,
    ):

        if self.action == "create":

            return ReportCreateSerializer

        elif self.action == "upload_evidence":

            return ReportEvidenceCreateSerializer

        elif self.action in (
            "update",
            "partial_update",
        ):

            return ReportUpdateSerializer

        return ReportSerializer

    def partial_update(
        self,
        request,
        *args,
        **kwargs,
    ):

        report = self.get_object()

        old_status = report.status

        serializer = self.get_serializer(
            report,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        with transaction.atomic():

            report = serializer.save(
                reviewed_by=request.user,
                reviewed_at=timezone.now(),
            )

            ReportAction.objects.create(
                report=report,
                moderator=request.user,
                old_status=old_status,
                new_status=report.status,
                action_taken=report.action_taken,
                note=request.data.get(
                    "note",
                    "",
                ),
            )

        return Response(
            ReportSerializer(
                report,
                context=self.get_serializer_context(),
            ).data
        )

    def perform_create(
        self,
        serializer,
    ):

        serializer.save()

    @action(
        detail=False,
        methods=["get"],
        url_path="my-reports",
    )
    def my_reports(
        self,
        request,
    ):

        queryset = self.filter_queryset(
            self.get_queryset(),
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
        )

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
        )

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

        report = self.get_object()

        if report.status != REPORT_STATUS_PENDING:

            return Response(
                {
                    "detail": (
                        "Evidence can only be added "
                        "to pending reports."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if report.evidence.count() >= 5:

            return Response(
                {
                    "detail": (
                        "Maximum 5 evidence files "
                        "are allowed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        return Response(
            ReportEvidenceSerializer(
                evidence,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_201_CREATED,
        )