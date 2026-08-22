import axiosInstance from "../component/auth/axiosInstance";


const moderationService = {

    // ==================================================
    // MODERATION CASES
    // ==================================================

    // --------------------------------------------------
    // GET ALL MODERATION CASES
    // GET /moderation/cases/
    // --------------------------------------------------

    getCases: async (params = {}) => {

        const response = await axiosInstance.get(
            "/moderation/cases/",
            {
                params,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET SINGLE MODERATION CASE
    // GET /moderation/cases/<id>/
    // --------------------------------------------------

    getCase: async (caseId) => {

        const response = await axiosInstance.get(
            `/moderation/cases/${caseId}/`
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET ASSIGNED CASES
    // GET /moderation/cases/assigned/
    // --------------------------------------------------

    getAssignedCases: async (params = {}) => {

        const response = await axiosInstance.get(
            "/moderation/cases/assigned/",
            {
                params,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET UNASSIGNED CASES
    // GET /moderation/cases/unassigned/
    // --------------------------------------------------

    getUnassignedCases: async (params = {}) => {

        const response = await axiosInstance.get(
            "/moderation/cases/unassigned/",
            {
                params,
            }
        );

        return response.data;
    },


    // ==================================================
    // CASE ACTIONS
    // ==================================================

    // --------------------------------------------------
    // ASSIGN CASE
    // POST /moderation/cases/<id>/assign/
    // --------------------------------------------------

    assignCase: async (caseId) => {

        const response = await axiosInstance.post(
            `/moderation/cases/${caseId}/assign/`
        );

        return response.data;
    },


    // --------------------------------------------------
    // START CASE
    // POST /moderation/cases/<id>/start/
    // --------------------------------------------------

    startCase: async (caseId) => {

        const response = await axiosInstance.post(
            `/moderation/cases/${caseId}/start/`
        );

        return response.data;
    },


    // --------------------------------------------------
    // RESOLVE CASE
    // POST /moderation/cases/<id>/resolve/
    // --------------------------------------------------

    resolveCase: async (
        caseId,
        data
    ) => {

        const response = await axiosInstance.post(
            `/moderation/cases/${caseId}/resolve/`,
            data
        );

        return response.data;
    },


    // --------------------------------------------------
    // REJECT CASE
    // POST /moderation/cases/<id>/reject/
    // --------------------------------------------------

    rejectCase: async (
        caseId,
        data = {}
    ) => {

        const response = await axiosInstance.post(
            `/moderation/cases/${caseId}/reject/`,
            data
        );

        return response.data;
    },


    // ==================================================
    // MODERATION ACTION LOGS
    // ==================================================

    // --------------------------------------------------
    // GET ACTION LOGS
    // GET /moderation/action-logs/
    // --------------------------------------------------

    getActionLogs: async (params = {}) => {

        const response = await axiosInstance.get(
            "/moderation/action-logs/",
            {
                params,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET ACTION LOGS FOR CASE
    // GET /moderation/action-logs/?moderation_case=<id>
    // --------------------------------------------------

    getCaseActionLogs: async (
        caseId,
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/moderation/action-logs/",
            {
                params: {
                    ...params,
                    moderation_case: caseId,
                },
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET SINGLE ACTION LOG
    // GET /moderation/action-logs/<id>/
    // --------------------------------------------------

    getActionLog: async (actionLogId) => {

        const response = await axiosInstance.get(
            `/moderation/action-logs/${actionLogId}/`
        );

        return response.data;
    },


    // ==================================================
    // USER MODERATION
    // ==================================================

    // --------------------------------------------------
    // GET MODERATED USERS
    // GET /moderation/users/
    // --------------------------------------------------

    getUsers: async (params = {}) => {

        const response = await axiosInstance.get(
            "/moderation/users/",
            {
                params,
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // GET SINGLE USER MODERATION
    // GET /moderation/users/<id>/
    // --------------------------------------------------

    getUserModeration: async (userModerationId) => {

        const response = await axiosInstance.get(
            `/moderation/users/${userModerationId}/`
        );

        return response.data;
    },


    // --------------------------------------------------
    // SEARCH MODERATED USERS
    // GET /moderation/users/?search=<query>
    // --------------------------------------------------

    searchUsers: async (
        search,
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/moderation/users/",
            {
                params: {
                    ...params,
                    search,
                },
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // FILTER RESTRICTED USERS
    // GET /moderation/users/?is_restricted=true
    // --------------------------------------------------

    getRestrictedUsers: async (
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/moderation/users/",
            {
                params: {
                    ...params,
                    is_restricted: true,
                },
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // FILTER SUSPENDED USERS
    // GET /moderation/users/?is_suspended=true
    // --------------------------------------------------

    getSuspendedUsers: async (
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/moderation/users/",
            {
                params: {
                    ...params,
                    is_suspended: true,
                },
            }
        );

        return response.data;
    },


    // --------------------------------------------------
    // FILTER BANNED USERS
    // GET /moderation/users/?is_banned=true
    // --------------------------------------------------

    getBannedUsers: async (
        params = {}
    ) => {

        const response = await axiosInstance.get(
            "/moderation/users/",
            {
                params: {
                    ...params,
                    is_banned: true,
                },
            }
        );

        return response.data;
    },

};


export default moderationService;