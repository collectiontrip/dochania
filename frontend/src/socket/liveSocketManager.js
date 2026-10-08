let liveSocket = null;

let listeners = new Set();

let currentSessionId = null;


// ============================================================
// GET LIVE SOCKET
// ============================================================

export const getLiveSocket = (
    sessionId,
) => {

    const token =
        localStorage.getItem(
            "accessToken",
        );


    if (!token) {

        console.log(
            "Live socket skipped (no access token)",
        );

        return null;

    }


    // ========================================================
    // REUSE EXISTING SOCKET
    // ========================================================

    if (
        liveSocket &&
        (
            liveSocket.readyState === WebSocket.OPEN ||
            liveSocket.readyState === WebSocket.CONNECTING
        ) &&
        currentSessionId === sessionId
    ) {

        console.log(
            "Using existing LIVE WebSocket",
        );

        return liveSocket;

    }


    // ========================================================
    // SWITCH SESSION
    // ========================================================

    if (
        liveSocket &&
        currentSessionId !== sessionId
    ) {

        console.log(
            "Closing previous session socket...",
        );

        const oldSocket =
            liveSocket;


        liveSocket = null;

        currentSessionId = null;


        try {

            oldSocket.onopen = null;
            oldSocket.onmessage = null;
            oldSocket.onerror = null;
            oldSocket.onclose = null;

            oldSocket.close();

        } catch (error) {

            console.error(
                "Unable to close previous live socket",
                error,
            );

        }

    }


    currentSessionId =
        sessionId;


    // ========================================================
    // LIVE WEBSOCKET URL
    // ========================================================

    const wsUrl =
        `wss://${window.location.hostname}:8001/ws/live/${sessionId}/?token=${encodeURIComponent(token)}`;


    console.log(
        "Creating LIVE WebSocket:",
        `wss://${window.location.hostname}:8001/ws/live/${sessionId}/?token=***`,
    );


    const socket =
        new WebSocket(
            wsUrl,
        );


    liveSocket =
        socket;


    // ========================================================
    // OPEN
    // ========================================================

    socket.onopen = () => {

        if (
            liveSocket !== socket
        ) {

            return;

        }


        console.log(
            "Live WebSocket connected",
        );

    };


    // ========================================================
    // MESSAGE
    // ========================================================

    socket.onmessage = (
        event,
    ) => {

        if (
            liveSocket !== socket
        ) {

            return;

        }


        try {

            const data =
                JSON.parse(
                    event.data,
                );


            console.log(
                "LIVE WS MESSAGE:",
                data,
            );


            listeners.forEach(
                (
                    callback,
                ) => {

                    try {

                        callback(
                            data,
                        );

                    } catch (error) {

                        console.error(
                            "Live listener error",
                            error,
                        );

                    }

                },
            );

        } catch (error) {

            console.error(
                "Invalid Live WS message",
                event.data,
                error,
            );

        }

    };


    // ========================================================
    // ERROR
    // ========================================================

    socket.onerror = (
        error,
    ) => {

        if (
            liveSocket !== socket
        ) {

            return;

        }


        console.error(
            "Live socket error",
            error,
        );

    };


    // ========================================================
    // CLOSE
    // ========================================================

    socket.onclose = (
        event,
    ) => {

        console.log(
            "Live WebSocket disconnected",
            event.code,
        );


        if (
            liveSocket !== socket
        ) {

            return;

        }


        liveSocket = null;

        currentSessionId = null;

    };


    return socket;

};


// ============================================================
// GET CURRENT LIVE SOCKET
// ============================================================

export const getCurrentLiveSocket = () => {

    return liveSocket;

};


// ============================================================
// GET CURRENT SESSION ID
// ============================================================

export const getCurrentLiveSessionId = () => {

    return currentSessionId;

};


// ============================================================
// CHECK LIVE SOCKET
// ============================================================

export const isLiveSocketOpen = () => {

    return (
        liveSocket !== null &&
        liveSocket.readyState === WebSocket.OPEN
    );

};


// ============================================================
// SEND LIVE SOCKET MESSAGE
// ============================================================

export const sendLiveSocketMessage = (
    data,
) => {

    if (
        !liveSocket ||
        liveSocket.readyState !== WebSocket.OPEN
    ) {

        console.error(
            "LIVE WebSocket is not connected",
        );

        return false;

    }


    try {

        console.log(
            "LIVE WS SEND:",
            data,
        );


        liveSocket.send(
            JSON.stringify(
                data,
            ),
        );

        return true;

    } catch (error) {

        console.error(
            "Unable to send LIVE WebSocket message",
            error,
        );

        return false;

    }

};


// ============================================================
// SEND CHAT MESSAGE
// ============================================================

export const sendLiveChatMessage = (
    message,
) => {

    return sendLiveSocketMessage(
        {
            type: "message",
            message: message,
        },
    );

};


// ============================================================
// SEND WEBRTC OFFER
// ============================================================

export const sendLiveOffer = (
    connectionId,
    offer,
) => {

    return sendLiveSocketMessage(
        {
            type: "offer",
            target_connection_id:
                connectionId,
            data: offer,
        },
    );

};


// ============================================================
// SEND WEBRTC ANSWER
// ============================================================

export const sendLiveAnswer = (
    connectionId,
    answer,
) => {

    return sendLiveSocketMessage(
        {
            type: "answer",
            target_connection_id:
                connectionId,
            data: answer,
        },
    );

};


// ============================================================
// SEND WEBRTC ICE CANDIDATE
// ============================================================

export const sendLiveIceCandidate = (
    connectionId,
    candidate,
) => {

    return sendLiveSocketMessage(
        {
            type: "ice_candidate",
            target_connection_id:
                connectionId,
            data: candidate,
        },
    );

};


// ============================================================
// SEND HEARTBEAT
// ============================================================

export const sendLiveHeartbeat = () => {

    return sendLiveSocketMessage(
        {
            type: "heartbeat",
        },
    );

};


// ============================================================
// END LIVE STREAM
// ============================================================

export const sendEndLiveStream = () => {

    return sendLiveSocketMessage(
        {
            type: "end_stream",
        },
    );

};


// ============================================================
// LEAVE LIVE
// ============================================================

export const sendLeaveLive = () => {

    return sendLiveSocketMessage(
        {
            type: "leave",
        },
    );

};


// ============================================================
// MUTE LIVE VIEWER
// ============================================================

export const sendMuteLiveViewer = (
    userId,
    durationMinutes = null,
) => {

    const data = {
        type: "mute_viewer",
        user_id: userId,
    };


    if (
        durationMinutes !== null &&
        durationMinutes !== undefined
    ) {

        data.duration_minutes =
            durationMinutes;

    }


    return sendLiveSocketMessage(
        data,
    );

};


// ============================================================
// UNMUTE LIVE VIEWER
// ============================================================

export const sendUnmuteLiveViewer = (
    userId,
) => {

    return sendLiveSocketMessage(
        {
            type: "unmute_viewer",
            user_id: userId,
        },
    );

};


// ============================================================
// KICK LIVE VIEWER
// ============================================================

export const sendKickLiveViewer = (
    userId,
) => {

    return sendLiveSocketMessage(
        {
            type: "kick_viewer",
            user_id: userId,
        },
    );

};


// ============================================================
// BLOCK LIVE VIEWER
// ============================================================

export const sendBlockLiveViewer = (
    userId,
) => {

    return sendLiveSocketMessage(
        {
            type: "block_viewer",
            user_id: userId,
        },
    );

};


// ============================================================
// ADD LIVE LISTENER
// ============================================================

export const addLiveListener = (
    callback,
) => {

    if (
        typeof callback !== "function"
    ) {

        console.error(
            "addLiveListener requires a function",
        );

        return;

    }


    listeners.add(
        callback,
    );

};


// ============================================================
// REMOVE LIVE LISTENER
// ============================================================

export const removeLiveListener = (
    callback,
) => {

    listeners.delete(
        callback,
    );

};


// ============================================================
// CLOSE LIVE SOCKET
// ============================================================

export const closeLiveSocket = () => {

    const socket =
        liveSocket;


    liveSocket = null;

    currentSessionId = null;


    if (!socket) {

        return;

    }


    try {

        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        socket.close();

    } catch (error) {

        console.error(
            "Unable to close LIVE WebSocket",
            error,
        );

    }

};


// ============================================================
// RESET LIVE SOCKET
// ============================================================

export const resetLiveSocket = () => {

    closeLiveSocket();

    listeners.clear();

};