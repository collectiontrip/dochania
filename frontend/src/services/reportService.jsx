import axiosInstance from "../component/auth/axiosInstance";


const reportService = {

    // --------------------------------------------------
    // CREATE REPORT
    // POST /reports/
    // --------------------------------------------------

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
                description,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET MY REPORTS
    // GET /reports/my-reports/
    // --------------------------------------------------

    getMyReports: async (params = {}) => {

        const response = await axiosInstance.get(
            "/reports/my-reports/",
            {
                params,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET REPORT LIST
    // GET /reports/
    // --------------------------------------------------
    // Staff/moderator can get reports.
    // Normal user gets only their own reports
    // because of get_queryset() in backend.

    getReports: async (params = {}) => {

        const response = await axiosInstance.get(
            "/reports/",
            {
                params,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET SINGLE REPORT
    // GET /reports/<id>/
    // --------------------------------------------------

    getReport: async (reportId) => {

        const response = await axiosInstance.get(
            `/reports/${reportId}/`
        );

        return response.data;
    },


    // --------------------------------------------------
    // UPDATE REPORT / MODERATION
    // PATCH /reports/<id>/
    // --------------------------------------------------

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


    // --------------------------------------------------
    // UPLOAD EVIDENCE
    // POST /reports/<id>/evidence/
    // --------------------------------------------------

    uploadEvidence: async (
        reportId,
        file
    ) => {

        const formData = new FormData();

        formData.append(
            "file",
            file
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


    // --------------------------------------------------
    // UPLOAD MULTIPLE EVIDENCE FILES
    // --------------------------------------------------
    // Backend allows maximum 5 files per report.
    // This method uploads them one by one.

    uploadEvidenceFiles: async (
        reportId,
        files
    ) => {

        const uploadedEvidence = [];

        for (const file of files) {

            const evidence =
                await reportService.uploadEvidence(
                    reportId,
                    file
                );

            uploadedEvidence.push(
                evidence
            );
        }

        return uploadedEvidence;
    },

};


export default reportService;