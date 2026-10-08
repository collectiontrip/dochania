import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import liveService from "../../services/liveService";
import "./Viewer.css";

import {
    getLiveSocket,
    addLiveListener,
    removeLiveListener,
    closeLiveSocket,
    sendLiveAnswer,
    sendLiveIceCandidate,
    sendLeaveLive,
} from "../../socket/liveSocketManager";


// ============================================================
// VIEWER
// ============================================================

const Viewer = ({
    sessionId = null,
    isLive = false,

    remoteVideoRef = null,

    onJoinedChange = null,
    onRemoteStreamChange = null,
    onViewerCountChange = null,

    onStreamEnded = null,
    onForcedLeave = null,

    onChatDisabledChange = null,
}) => {

    // ========================================================
    // STATE
    // ========================================================

    const [
        isJoined,
        setIsJoined,
    ] = useState(false);

    const [
        remoteStream,
        setRemoteStream,
    ] = useState(null);

    const [
        viewerCount,
        setViewerCount,
    ] = useState(0);

    const [
        loading,
        setLoading,
    ] = useState(false);


    // ========================================================
    // REFS
    // ========================================================

    const internalRemoteVideoRef =
        useRef(null);

    const peerConnectionRef =
        useRef(null);

    const iceQueueRef =
        useRef([]);

    const mountedRef =
        useRef(false);

    const joinedRef =
        useRef(false);


    // ========================================================
    // REMOTE VIDEO REF
    // ========================================================

    const videoRef =
        remoteVideoRef ||
        internalRemoteVideoRef;


    // ========================================================
    // WEBRTC CONFIG
    // ========================================================

    const rtcConfiguration = {
        iceServers: [
            {
                urls:
                    "stun:stun.l.google.com:19302",
            },
        ],
    };


    // ========================================================
    // UPDATE JOINED STATE
    // ========================================================

    const updateJoinedState =
        useCallback(
            (value) => {

                joinedRef.current =
                    value;

                setIsJoined(
                    value,
                );


                if (
                    onJoinedChange
                ) {

                    onJoinedChange(
                        value,
                    );

                }

            },
            [
                onJoinedChange,
            ],
        );


    // ========================================================
    // UPDATE REMOTE STREAM
    // ========================================================

    const updateRemoteStream =
        useCallback(
            (value) => {

                setRemoteStream(
                    value,
                );


                if (
                    onRemoteStreamChange
                ) {

                    onRemoteStreamChange(
                        value,
                    );

                }

            },
            [
                onRemoteStreamChange,
            ],
        );


    // ========================================================
    // UPDATE VIEWER COUNT
    // ========================================================

    const updateViewerCount =
        useCallback(
            (value) => {

                const count =
                    Number(value) || 0;


                setViewerCount(
                    count,
                );


                if (
                    onViewerCountChange
                ) {

                    onViewerCountChange(
                        count,
                    );

                }

            },
            [
                onViewerCountChange,
            ],
        );


    // ========================================================
    // CLEANUP PEER CONNECTION
    // ========================================================

    const cleanupPeerConnection =
        useCallback(
            () => {

                const peerConnection =
                    peerConnectionRef.current;


                if (
                    peerConnection
                ) {

                    try {

                        peerConnection.onicecandidate =
                            null;

                        peerConnection.ontrack =
                            null;

                        peerConnection.onconnectionstatechange =
                            null;

                        peerConnection.oniceconnectionstatechange =
                            null;

                        peerConnection.close();

                    } catch (error) {

                        console.error(
                            "Unable to close viewer peer connection:",
                            error,
                        );

                    }

                }


                peerConnectionRef.current =
                    null;


                iceQueueRef.current =
                    [];


                if (
                    videoRef?.current
                ) {

                    try {

                        videoRef.current.pause();

                    } catch {}

                    videoRef.current.srcObject =
                        null;

                }


                updateRemoteStream(
                    null,
                );

            },
            [
                updateRemoteStream,
                videoRef,
            ],
        );


    // ========================================================
    // FLUSH ICE QUEUE
    // ========================================================

    const flushIceQueue =
        useCallback(
            async (
                peerConnection,
            ) => {

                if (
                    !peerConnection
                ) {

                    return;

                }


                if (
                    !peerConnection.remoteDescription
                ) {

                    return;

                }


                const queuedCandidates =
                    [
                        ...iceQueueRef.current,
                    ];


                if (
                    queuedCandidates.length === 0
                ) {

                    return;

                }


                iceQueueRef.current =
                    [];


                for (
                    const candidate
                    of queuedCandidates
                ) {

                    try {

                        await peerConnection.addIceCandidate(
                            new RTCIceCandidate(
                                candidate,
                            ),
                        );

                    } catch (error) {

                        console.error(
                            "Unable to add queued viewer ICE candidate:",
                            error,
                        );

                    }

                }

            },
            [],
        );


    // ========================================================
    // CREATE VIEWER PEER CONNECTION
    // ========================================================

    const createPeerConnection =
        useCallback(
            (
                connectionId,
            ) => {

                cleanupPeerConnection();


                const peerConnection =
                    new RTCPeerConnection(
                        rtcConfiguration,
                    );


                // =================================================
                // REMOTE TRACK
                // =================================================

                peerConnection.ontrack =
                    (
                        event,
                    ) => {

                        const incomingStream =
                            event.streams?.[0];


                        if (
                            !incomingStream
                        ) {

                            return;

                        }


                        console.log(
                            "Viewer received remote stream",
                        );


                        updateRemoteStream(
                            incomingStream,
                        );

                    };


                // =================================================
                // LOCAL ICE
                // =================================================

                peerConnection.onicecandidate =
                    (
                        event,
                    ) => {

                        if (
                            !event.candidate
                        ) {

                            return;

                        }


                        sendLiveIceCandidate(
                            connectionId ||
                                "broadcaster",
                            event.candidate,
                        );

                    };


                // =================================================
                // CONNECTION STATE
                // =================================================

                peerConnection.onconnectionstatechange =
                    () => {

                        const state =
                            peerConnection.connectionState;


                        console.log(
                            "Viewer WebRTC connection state:",
                            state,
                        );


                        if (
                            state === "failed" ||
                            state === "closed"
                        ) {

                            updateRemoteStream(
                                null,
                            );

                        }

                    };


                // =================================================
                // ICE CONNECTION STATE
                // =================================================

                peerConnection.oniceconnectionstatechange =
                    () => {

                        const state =
                            peerConnection.iceConnectionState;


                        console.log(
                            "Viewer ICE connection state:",
                            state,
                        );


                        if (
                            state === "failed"
                        ) {

                            console.warn(
                                "Viewer ICE connection failed",
                            );

                        }

                    };


                peerConnectionRef.current =
                    peerConnection;


                return peerConnection;

            },
            [
                cleanupPeerConnection,
                updateRemoteStream,
            ],
        );


    // ========================================================
    // HANDLE WEBRTC OFFER
    // ========================================================

    const handleOffer =
        useCallback(
            async (
                data,
            ) => {

                if (
                    !mountedRef.current ||
                    !joinedRef.current
                ) {

                    return;

                }


                if (
                    !data?.data
                ) {

                    console.error(
                        "Viewer received invalid WebRTC offer:",
                        data,
                    );

                    return;

                }


                const connectionId =
                    data.connection_id ||
                    "broadcaster";


                console.log(
                    "Viewer received WebRTC offer:",
                    connectionId,
                );


                try {

                    const peerConnection =
                        createPeerConnection(
                            connectionId,
                        );


                    if (
                        !peerConnection
                    ) {

                        return;

                    }


                    // ------------------------------------------------
                    // REMOTE DESCRIPTION
                    // ------------------------------------------------

                    await peerConnection.setRemoteDescription(
                        new RTCSessionDescription(
                            data.data,
                        ),
                    );


                    // ------------------------------------------------
                    // QUEUED ICE
                    // ------------------------------------------------

                    await flushIceQueue(
                        peerConnection,
                    );


                    // ------------------------------------------------
                    // CREATE ANSWER
                    // ------------------------------------------------

                    const answer =
                        await peerConnection.createAnswer();


                    await peerConnection.setLocalDescription(
                        answer,
                    );


                    // ------------------------------------------------
                    // SEND ANSWER
                    // ------------------------------------------------

                    const sent =
                        sendLiveAnswer(
                            connectionId,
                            answer,
                        );


                    if (
                        !sent
                    ) {

                        console.error(
                            "Unable to send viewer WebRTC answer",
                        );

                        return;

                    }


                    console.log(
                        "Viewer WebRTC answer sent:",
                        connectionId,
                    );

                } catch (error) {

                    console.error(
                        "Viewer offer handling failed:",
                        error,
                    );

                }

            },
            [
                createPeerConnection,
                flushIceQueue,
            ],
        );


    // ========================================================
    // HANDLE REMOTE ICE CANDIDATE
    // ========================================================

    const handleIceCandidate =
        useCallback(
            async (
                data,
            ) => {

                if (
                    !mountedRef.current ||
                    !joinedRef.current
                ) {

                    return;

                }


                if (
                    !data?.data
                ) {

                    return;

                }


                const peerConnection =
                    peerConnectionRef.current;


                if (
                    !peerConnection
                ) {

                    iceQueueRef.current.push(
                        data.data,
                    );

                    return;

                }


                // ------------------------------------------------
                // REMOTE DESCRIPTION NOT READY
                // ------------------------------------------------

                if (
                    !peerConnection.remoteDescription
                ) {

                    console.log(
                        "Queueing viewer ICE candidate",
                    );


                    iceQueueRef.current.push(
                        data.data,
                    );

                    return;

                }


                // ------------------------------------------------
                // ADD ICE
                // ------------------------------------------------

                try {

                    await peerConnection.addIceCandidate(
                        new RTCIceCandidate(
                            data.data,
                        ),
                    );

                } catch (error) {

                    console.error(
                        "Unable to add viewer ICE candidate:",
                        error,
                    );

                }

            },
            [],
        );


    // ========================================================
    // HANDLE FORCED LEAVE
    // ========================================================

    const handleForcedLeave =
        useCallback(
            (
                reason = "forced",
            ) => {

                console.warn(
                    "Viewer forced to leave:",
                    reason,
                );


                // =================================================
                // STOP WEBRTC
                // =================================================

                cleanupPeerConnection();


                // =================================================
                // RESET VIEWER STATE
                // =================================================

                updateJoinedState(
                    false,
                );


                // =================================================
                // RESET VIEWER COUNT
                // =================================================

                updateViewerCount(
                    0,
                );


                // =================================================
                // CLOSE LIVE SOCKET
                // =================================================

                closeLiveSocket();


                // =================================================
                // NOTIFY PARENT
                // =================================================

                if (
                    onForcedLeave
                ) {

                    onForcedLeave(
                        reason,
                    );

                }

            },
            [
                cleanupPeerConnection,
                onForcedLeave,
                updateJoinedState,
                updateViewerCount,
            ],
        );


    // ========================================================
    // HANDLE STREAM ENDED
    // ========================================================

    const handleStreamEnded =
        useCallback(
            () => {

                console.log(
                    "Live stream ended",
                );


                cleanupPeerConnection();

                updateJoinedState(
                    false,
                );

                updateViewerCount(
                    0,
                );

                closeLiveSocket();


                if (
                    onStreamEnded
                ) {

                    onStreamEnded();

                }

            },
            [
                cleanupPeerConnection,
                onStreamEnded,
                updateJoinedState,
                updateViewerCount,
            ],
        );


    // ========================================================
    // HANDLE SOCKET MESSAGE
    // ========================================================

    const handleSocketMessage =
        useCallback(
            async (
                data,
            ) => {

                if (
                    !data?.type
                ) {

                    return;

                }


                switch (
                    data.type
                ) {

                    // =================================================
                    // WEBRTC OFFER
                    // =================================================

                    case "offer":

                        await handleOffer(
                            data,
                        );

                        break;


                    // =================================================
                    // WEBRTC ICE
                    // =================================================

                    case "ice_candidate":

                        await handleIceCandidate(
                            data,
                        );

                        break;


                    // =================================================
                    // VIEWER COUNT
                    // =================================================

                    case "viewer_count":

                        updateViewerCount(
                            data.count ??
                            data.viewer_count ??
                            0,
                        );

                        break;


                    // =================================================
                    // STREAM ENDED
                    // =================================================

                    case "stream_ended":

                        handleStreamEnded();

                        break;


                    // =================================================
                    // KICKED
                    // =================================================

                    case "kicked":

                        handleForcedLeave(
                            "kicked",
                        );

                        break;


                    // =================================================
                    // BLOCKED
                    // =================================================

                    case "blocked":

                        handleForcedLeave(
                            "blocked",
                        );

                        break;


                    // =================================================
                    // ACCESS BLOCKED
                    // =================================================

                    case "access_blocked":

                        handleForcedLeave(
                            "access_blocked",
                        );

                        break;


                    // =================================================
                    // LIVE ACCESS BLOCKED
                    // =================================================

                    case "live_access_blocked":

                        handleForcedLeave(
                            "live_access_blocked",
                        );

                        break;


                    // =================================================
                    // STREAM BLOCKED
                    // =================================================

                    case "stream_blocked":

                        handleForcedLeave(
                            "stream_blocked",
                        );

                        break;


                    // =================================================
                    // CHAT RESTRICTED
                    // =================================================

                    case "chat_restricted":

                        if (
                            onChatDisabledChange
                        ) {

                            onChatDisabledChange(
                                true,
                            );

                        }

                        break;


                    default:

                        break;

                }

            },
            [
                handleOffer,
                handleIceCandidate,
                updateViewerCount,
                handleStreamEnded,
                handleForcedLeave,
                onChatDisabledChange,
            ],
        );


    // ========================================================
    // SOCKET LISTENER
    // ========================================================

    useEffect(
        () => {

            mountedRef.current =
                true;


            addLiveListener(
                handleSocketMessage,
            );


            return () => {

                removeLiveListener(
                    handleSocketMessage,
                );

            };

        },
        [
            handleSocketMessage,
        ],
    );


    // ========================================================
    // JOIN LIVE
    // ========================================================

    const joinLive =
        useCallback(
            async () => {

                if (
                    !sessionId
                ) {

                    console.error(
                        "Viewer cannot join: missing session ID",
                    );

                    return false;

                }


                if (
                    !isLive
                ) {

                    console.warn(
                        "Viewer cannot join: live is not active",
                    );

                    return false;

                }


                if (
                    joinedRef.current
                ) {

                    return true;

                }


                try {

                    setLoading(
                        true,
                    );


                    console.log(
                        "Joining live:",
                        sessionId,
                    );


                    // ------------------------------------------------
                    // REST JOIN
                    // ------------------------------------------------

                    await liveService.joinLive(
                        sessionId,
                    );


                    // ------------------------------------------------
                    // STATE
                    // ------------------------------------------------

                    updateJoinedState(
                        true,
                    );


                    // ------------------------------------------------
                    // LIVE SOCKET
                    // ------------------------------------------------

                    const socket =
                        getLiveSocket(
                            sessionId,
                        );


                    if (
                        !socket
                    ) {

                        console.error(
                            "Unable to create viewer LIVE socket",
                        );


                        updateJoinedState(
                            false,
                        );

                        return false;

                    }


                    console.log(
                        "Viewer LIVE socket created",
                    );


                    return true;

                } catch (error) {

                    console.error(
                        "Unable to join live:",
                        error.response?.data ||
                        error.message,
                    );


                    updateJoinedState(
                        false,
                    );


                    return false;

                } finally {

                    setLoading(
                        false,
                    );

                }

            },
            [
                sessionId,
                isLive,
                updateJoinedState,
            ],
        );


    // ========================================================
    // LEAVE LIVE
    // ========================================================

    const leaveLive =
        useCallback(
            async () => {

                if (
                    !sessionId
                ) {

                    return;

                }


                setLoading(
                    true,
                );


                // ------------------------------------------------
                // SOCKET LEAVE
                // ------------------------------------------------

                try {

                    if (
                        joinedRef.current
                    ) {

                        sendLeaveLive();

                    }

                } catch (error) {

                    console.error(
                        "Unable to send viewer leave event:",
                        error,
                    );

                }


                // ------------------------------------------------
                // REST LEAVE
                // ------------------------------------------------

                try {

                    if (
                        joinedRef.current
                    ) {

                        await liveService.leaveLive(
                            sessionId,
                        );

                    }

                } catch (error) {

                    console.error(
                        "Unable to leave live through REST:",
                        error.response?.data ||
                        error.message,
                    );

                } finally {

                    cleanupPeerConnection();

                    updateJoinedState(
                        false,
                    );

                    closeLiveSocket();

                    setLoading(
                        false,
                    );

                }

            },
            [
                sessionId,
                cleanupPeerConnection,
                updateJoinedState,
            ],
        );


    // ========================================================
    // AUTO RESET WHEN LIVE BECOMES INACTIVE
    // ========================================================

    useEffect(
        () => {

            if (
                isLive
            ) {

                return;

            }


            if (
                joinedRef.current
            ) {

                cleanupPeerConnection();

                updateJoinedState(
                    false,
                );

                updateViewerCount(
                    0,
                );

                closeLiveSocket();

            }

        },
        [
            isLive,
            cleanupPeerConnection,
            updateJoinedState,
            updateViewerCount,
        ],
    );


    // ========================================================
    // CLEANUP ON UNMOUNT
    // ========================================================

    useEffect(
        () => {

            mountedRef.current =
                true;


            return () => {

                mountedRef.current =
                    false;


                if (
                    joinedRef.current
                ) {

                    try {

                        sendLeaveLive();

                    } catch {}

                }


                cleanupPeerConnection();

                joinedRef.current =
                    false;

                closeLiveSocket();

            };

        },
        [
            cleanupPeerConnection,
        ],
    );


    // ========================================================
    // REMOTE VIDEO SYNC
    // ========================================================

    useEffect(
        () => {

            const video =
                videoRef?.current;


            if (
                !video
            ) {

                return;

            }


            video.srcObject =
                remoteStream || null;


            if (
                !remoteStream
            ) {

                try {

                    video.pause();

                } catch {}

                return;

            }


            const playVideo =
                async () => {

                    try {

                        await video.play();

                        console.log(
                            "Viewer remote video playing",
                        );

                    } catch (error) {

                        console.warn(
                            "Viewer video autoplay was blocked:",
                            error,
                        );

                    }

                };


            playVideo();


            return () => {

                if (
                    video.srcObject ===
                    remoteStream
                ) {

                    video.pause();

                }

            };

        },
        [
            remoteStream,
            videoRef,
        ],
    );


    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div className="viewer">

            {/* ==================================================
                VIEWER VIDEO
                ================================================== */}

            <div className="viewer-video-wrapper">

                <video
                    ref={
                        videoRef
                    }

                    className="viewer-video"

                    autoPlay

                    playsInline

                    muted={
                        false
                    }
                />


                {/* ==============================================
                    NOT JOINED
                    ============================================== */}

                {!isJoined && (

                    <div className="viewer-overlay">

                        <div className="viewer-overlay-content">

                            <p>
                                {isLive
                                    ? "You are not watching this live yet."
                                    : "This live stream is not active."
                                }
                            </p>


                            {isLive && (

                                <button
                                    type="button"

                                    className="viewer-join-button"

                                    onClick={
                                        joinLive
                                    }

                                    disabled={
                                        loading
                                    }
                                >

                                    {loading
                                        ? "Joining..."
                                        : "Join Live"
                                    }

                                </button>

                            )}

                        </div>

                    </div>

                )}


                {/* ==============================================
                    JOINED BUT STREAM NOT RECEIVED
                    ============================================== */}

                {isJoined &&
                    !remoteStream && (

                        <div className="viewer-overlay">

                            <div className="viewer-overlay-content">

                                <p>
                                    Connecting to live stream...
                                </p>

                            </div>

                        </div>

                    )}


                {/* ==============================================
                    VIEWER STATUS
                    ============================================== */}

                {isJoined && (

                    <div className="viewer-status">

                        <span>
                            ● LIVE
                        </span>

                    </div>

                )}

            </div>


            {/* ==================================================
                VIEWER INFO
                ================================================== */}

            <div className="viewer-info">

                <div className="viewer-count">

                    👁️{" "}
                    {viewerCount}

                    {" "}
                    {viewerCount === 1
                        ? "viewer"
                        : "viewers"
                    }

                </div>


                {/* =================================================
                    LEAVE BUTTON
                    ================================================= */}

                {isJoined && (

                    <button
                        type="button"

                        className="viewer-leave-button"

                        onClick={
                            leaveLive
                        }

                        disabled={
                            loading
                        }
                    >

                        {loading
                            ? "Leaving..."
                            : "Leave Live"
                        }

                    </button>

                )}

            </div>

        </div>

    );

};


export default Viewer;