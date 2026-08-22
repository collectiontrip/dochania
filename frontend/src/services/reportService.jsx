import axiosInstance from "../component/auth/axiosInstance";


const reportService = {

    // ============================================================
    // GET REPORT REASONS
    // GET /reports/reasons/
    // ============================================================

    getReportReasons: async () => {

        const response = await axiosInstance.get(
            "/reports/reasons/"
        );

        return response.data;
    },


    // ============================================================
    // CREATE REPORT
    // POST /reports/
    // ============================================================

    createReport: async ({
        contentType,
        objectId,
        reason,
        description = "",
    }) => {

        const response = await axiosInstance.post(
            "/reports/",
            {
                content_type: contentType,
                object_id: objectId,
                reason,
                description: description.trim(),
            }
        );

        return response.data;
    },


    // ============================================================
    // GET MY REPORTS
    // GET /reports/my-reports/
    // ============================================================

    getMyReports: async (
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/reports/my-reports/",
            {
                params,
            }
        );

        return response.data;
    },


    // ============================================================
    // GET REPORT LIST
    // GET /reports/
    // ============================================================
    //
    // Moderator:
    //     Gets all reports.
    //
    // Normal user:
    //     Backend restricts results to own reports.
    //
    // ============================================================

    getReports: async (
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/reports/",
            {
                params,
            }
        );

        return response.data;
    },


    // ============================================================
    // GET MODERATION QUEUE
    // GET /reports/moderation/
    // ============================================================

    getModerationReports: async (
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/reports/moderation/",
            {
                params,
            }
        );

        return response.data;
    },


    // ============================================================
    // GET SINGLE REPORT
    // GET /reports/<id>/
    // ============================================================

    getReport: async (
        reportId
    ) => {

        const response = await axiosInstance.get(
            `/reports/${reportId}/`
        );

        return response.data;
    },


    // ============================================================
    // UPDATE REPORT
    // PATCH /reports/<id>/
    // ============================================================

    updateReport: async (
        reportId,
        data
    ) => {

        const response = await axiosInstance.patch(
            `/reports/${reportId}/`,
            data
        );

        return response.data;
    },


    // ============================================================
    // REPLACE REPORT
    // PUT /reports/<id>/
    // ============================================================

    replaceReport: async (
        reportId,
        data
    ) => {

        const response = await axiosInstance.put(
            `/reports/${reportId}/`,
            data
        );

        return response.data;
    },


    // ============================================================
    // UPLOAD SINGLE EVIDENCE
    // POST /reports/<id>/evidence/
    // ============================================================

    uploadEvidence: async (
        reportId,
        file,
        evidenceType = "image"
    ) => {

        const formData = new FormData();

        formData.append(
            "file",
            file
        );

        formData.append(
            "evidence_type",
            evidenceType
        );


        const response = await axiosInstance.post(
            `/reports/${reportId}/evidence/`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    },


    // ============================================================
    // UPLOAD MULTIPLE EVIDENCE FILES
    // ============================================================
    //
    // Backend maximum:
    //     5 evidence records per report.
    //
    // Files are uploaded sequentially so the backend remains
    // authoritative about the maximum allowed evidence.
    //
    // ============================================================

    uploadEvidenceFiles: async (
        reportId,
        files
    ) => {

        if (!files?.length) {
            return [];
        }


        if (files.length > 5) {
            throw new Error(
                "Maximum 5 evidence files are allowed."
            );
        }


        const uploadedEvidence = [];


        for (const item of files) {

            let file;
            let evidenceType = "image";


            // ----------------------------------------------------
            // Support:
            //
            // File
            //
            // OR
            //
            // {
            //     file,
            //     evidenceType
            // }
            // ----------------------------------------------------

            if (
                item instanceof File
            ) {

                file = item;

            } else {

                file = item.file;

                evidenceType =
                    item.evidenceType || "image";
            }


            const evidence =
                await reportService.uploadEvidence(
                    reportId,
                    file,
                    evidenceType
                );


            uploadedEvidence.push(
                evidence
            );
        }


        return uploadedEvidence;
    },

};


export default reportService;