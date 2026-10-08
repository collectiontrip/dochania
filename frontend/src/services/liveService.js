import AxiosInstance from "../component/auth/axiosInstance";


// ============================================================
// LIVE SERVICE
// ============================================================

const liveService = {

    // ========================================================
    // LIVE SESSION
    // ========================================================

    // Start Live Session
    startLive(title = "") {
        return AxiosInstance.post(
            "/live/start/",
            {
                title: title.trim(),
            },
        );
    },

    // End Live Session
    endLive(sessionId) {
        return AxiosInstance.post(
            `/live/end/${sessionId}/`,
        );
    },

    // Get All Live Streams
    getLiveStreams() {
        return AxiosInstance.get(
            "/live/streams/",
        );
    },

    // Send Live Heartbeat
    sendHeartbeat(sessionId) {
        return AxiosInstance.post(
            `/live/heartbeat/${sessionId}/`,
        );
    },


    // ========================================================
    // LIVE VIEWER
    // ========================================================

    // Join Live Session
    joinLive(sessionId) {
        return AxiosInstance.post(
            `/live/join/${sessionId}/`,
        );
    },

    // Leave Live Session
    leaveLive(sessionId) {
        return AxiosInstance.post(
            `/live/leave/${sessionId}/`,
        );
    },

    // Get Live Viewers
    getLiveViewers(sessionId) {
        return AxiosInstance.get(
            `/live/viewers/${sessionId}/`,
        );
    },


    // ========================================================
    // VIEWER MODERATION
    // ========================================================

    // Mute Live Viewer
    muteLiveViewer(
        sessionId,
        userId,
        durationMinutes = null,
    ) {
        const data = {};

        if (
            durationMinutes !== null &&
            durationMinutes !== undefined
        ) {
            data.duration_minutes = durationMinutes;
        }

        return AxiosInstance.post(
            `/live/viewers/${sessionId}/${userId}/mute/`,
            data,
        );
    },

    // Unmute Live Viewer
    unmuteLiveViewer(
        sessionId,
        userId,
    ) {
        return AxiosInstance.post(
            `/live/viewers/${sessionId}/${userId}/unmute/`,
        );
    },

    // Kick Live Viewer
    kickLiveViewer(
        sessionId,
        userId,
    ) {
        return AxiosInstance.post(
            `/live/viewers/${sessionId}/${userId}/kick/`,
        );
    },

    // Block Live Viewer
    blockLiveViewer(
        sessionId,
        userId,
    ) {
        return AxiosInstance.post(
            `/live/viewers/${sessionId}/${userId}/block/`,
        );
    },


    // ========================================================
    // LIVE ADMIN
    // ========================================================

    // Get Active Live Admins
    getLiveModerators(sessionId) {
        return AxiosInstance.get(
            `/live/moderators/${sessionId}/`,
        );
    },

    // Assign Permanent Live Admin
    assignLiveModerator(
        sessionId,
        userId,
    ) {
        return AxiosInstance.post(
            `/live/moderators/${sessionId}/assign/`,
            {
                user_id: userId,
            },
        );
    },

    // Remove Permanent Live Admin
    removeLiveModerator(
        sessionId,
        userId,
    ) {
        return AxiosInstance.post(
            `/live/moderators/${sessionId}/${userId}/remove/`,
        );
    },


    // ========================================================
    // LIVE CHAT
    // ========================================================

    // Send Live Message
    sendLiveMessage(
        sessionId,
        message,
    ) {
        return AxiosInstance.post(
            "/live/message/send/",
            {
                session: sessionId,
                message: message.trim(),
            },
        );
    },

    // Get Live Messages
    getLiveMessages(sessionId) {
        return AxiosInstance.get(
            `/live/messages/${sessionId}/`,
        );
    },


    // ========================================================
    // LIVE MODERATION ACTIONS
    // ========================================================

    // Apply Live Moderation Action
    applyLiveModerationAction(
        sessionId,
        action,
        reason,
        note = "",
        durationMinutes = null,
    ) {
        const data = {
            action,
            reason,
            note: note.trim(),
        };

        if (
            durationMinutes !== null &&
            durationMinutes !== undefined
        ) {
            data.duration_minutes = durationMinutes;
        }

        return AxiosInstance.post(
            `/live/moderation/${sessionId}/action/`,
            data,
        );
    },

    // End Live Moderation Action
    endLiveModerationAction(actionId) {
        return AxiosInstance.post(
            `/live/moderation/action/${actionId}/end/`,
        );
    },

    // Get Live Moderation Actions
    getLiveModerationActions(sessionId) {
        return AxiosInstance.get(
            `/live/moderation/${sessionId}/actions/`,
        );
    },

};


export default liveService;