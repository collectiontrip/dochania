import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useLocation,
    useParams,
} from "react-router-dom";

import {
    toast,
} from "react-toastify";

import "./Live.css";

import liveService from "../../services/liveService";

import { useUser } from "../../contexts/UserContext";

import LiveHeader from "./LiveHeader";
import LiveVideo from "./LiveVideo";
import LiveControls from "./LiveControls";
import LiveChat from "./LiveChat";
import LiveViewerList from "./LiveViewerList";
import LiveModeratorList from "./LiveModeratorList";
import LiveModeration from "./LiveModeration";
import Viewer from "./Viewer";

import {
    getLiveSocket,
    addLiveListener,
    removeLiveListener,

    sendLiveChatMessage,

    sendLiveOffer,
    sendLiveIceCandidate,

    sendLiveHeartbeat,
    sendEndLiveStream,

    sendMuteLiveViewer,
    sendUnmuteLiveViewer,
    sendKickLiveViewer,
    sendBlockLiveViewer,

    closeLiveSocket,

} from "../../socket/liveSocketManager";


// ============================================================
// LIVE
// ============================================================

const Live = () => {

    // ========================================================
    // ROUTER
    // ========================================================

    const params =
        useParams();

    const location =
        useLocation();


    // ========================================================
    // USER CONTEXT
    // ========================================================

    const {
        user,
    } = useUser();

    const currentUserId =
        user?.id ?? null;

    const currentUsername =
        user?.username ||
        "Broadcaster";

    const isModerator =
        Boolean(
            user?.is_moderator,
        );


    // ========================================================
    // LIVE STATE
    // ========================================================

    const [
        isLive,
        setIsLive,
    ] = useState(false);

    const [
        sessionId,
        setSessionId,
    ] = useState(null);

    const [
        session,
        setSession,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(false);


    // ========================================================
    // BROADCASTER STREAM STATE
    // ========================================================

    const [
        stream,
        setStream,
    ] = useState(null);

    const streamRef =
        useRef(null);


    // ========================================================
    // SOCKET STATE
    // ========================================================

    const [
        socket,
        setSocket,
    ] = useState(null);


    // ========================================================
    // ROLE
    // ========================================================

    const [
        isBroadcaster,
        setIsBroadcaster,
    ] = useState(false);


    // ========================================================
    // VIEWER JOIN STATE
    // ========================================================

    const [
        viewerJoined,
        setViewerJoined,
    ] = useState(false);


    // ========================================================
    // VIEWER MANAGEMENT STATE
    // ========================================================

    const [
        viewerCount,
        setViewerCount,
    ] = useState(0);

    const [
        viewers,
        setViewers,
    ] = useState([]);


    // ========================================================
    // ACTIVE LIVE ADMIN STATE
    // ========================================================

    const [
        moderators,
        setModerators,
    ] = useState([]);


    // ========================================================
    // ACTIVE LIVE ADMIN ROLE
    // ========================================================

    const isLiveAdmin =
        useMemoLiveAdmin(
            moderators,
            currentUserId,
        );


    // ========================================================
    // CHAT
    // ========================================================

    const [
        messages,
        setMessages,
    ] = useState([]);

    const [
        isChatDisabled,
        setIsChatDisabled,
    ] = useState(false);


    // ========================================================
    // PLATFORM MODERATION
    // ========================================================

    const [
        moderationLoading,
        setModerationLoading,
    ] = useState(false);


    // ========================================================
    // BROADCASTER WEBRTC
    // ========================================================

    const peerConnectionsRef =
        useRef({});

    const viewersRef =
        useRef(new Set());

    const iceQueueRef =
        useRef({});

    const pendingViewerConnectionsRef =
        useRef(new Set());

    const viewerConnectionsRef =
        useRef({});


    // ========================================================
    // SYSTEM MESSAGE TIMERS
    // ========================================================

    const systemMessageTimersRef =
        useRef({});


    // ========================================================
    // HEARTBEAT
    // ========================================================

    const heartbeatRef =
        useRef(null);


    // ========================================================
    // LOCAL VIDEO
    // ========================================================

    const localVideoRef =
        useRef(null);


    // ========================================================
    // RESOLVE SESSION ID
    // ========================================================

    useEffect(
        () => {

            const stateSessionId =
                location.state?.sessionId;

            const stateId =
                location.state?.id;

            const stateSessionObjectId =
                location.state?.session?.id;

            const paramSessionId =
                params.sessionId;

            const paramId =
                params.id;

            const resolvedSessionId =
                stateSessionId ||
                stateId ||
                stateSessionObjectId ||
                paramSessionId ||
                paramId ||
                null;


            console.log(
                "LIVE SESSION ID RESOLUTION:",
                {
                    stateSessionId,
                    stateId,
                    stateSessionObjectId,
                    paramSessionId,
                    paramId,
                    resolvedSessionId,
                },
            );


            // =================================================
            // EXISTING SESSION
            // =================================================

            if (
                resolvedSessionId
            ) {

                setSessionId(
                    resolvedSessionId,
                );

                setIsBroadcaster(
                    false,
                );

                setViewerJoined(
                    false,
                );

                setIsLive(
                    true,
                );


                if (
                    location.state?.session
                ) {

                    setSession(
                        location.state.session,
                    );

                } else if (
                    location.state
                ) {

                    setSession(
                        previous => ({
                            ...(previous || {}),
                            ...location.state,
                            id: resolvedSessionId,
                            is_live:
                                location.state?.is_live ??
                                true,
                        }),
                    );

                } else {

                    setSession(
                        previous => ({
                            ...(previous || {}),
                            id: resolvedSessionId,
                            is_live: true,
                        }),
                    );

                }

            } else {

                // =================================================
                // NO SESSION
                // =================================================

                setSessionId(
                    null,
                );

                setSession(
                    null,
                );

                setIsLive(
                    false,
                );

                setIsBroadcaster(
                    true,
                );

                setViewerJoined(
                    false,
                );

                setViewerCount(
                    0,
                );

                setViewers(
                    [],
                );

                setModerators(
                    [],
                );

            }

        },
        [
            location.state,
            params.sessionId,
            params.id,
        ],
    );


    // ========================================================
    // LOAD VIEWERS
    // ========================================================

    const loadViewers =
        useCallback(
            async () => {

                if (
                    !sessionId
                ) {

                    return;
                }


                try {

                    const response =
                        await liveService.getLiveViewers(
                            sessionId,
                        );

                    const data =
                        response?.data;

                    let viewerList = [];


                    if (
                        Array.isArray(data)
                    ) {

                        viewerList =
                            data;

                    } else if (
                        Array.isArray(
                            data?.results,
                        )
                    ) {

                        viewerList =
                            data.results;

                    } else if (
                        Array.isArray(
                            data?.viewers,
                        )
                    ) {

                        viewerList =
                            data.viewers;

                    }


                    setViewers(
                        viewerList,
                    );


                    if (
                        typeof data?.count ===
                        "number"
                    ) {

                        setViewerCount(
                            data.count,
                        );

                    } else {

                        setViewerCount(
                            viewerList.length,
                        );

                    }

                } catch (error) {

                    console.error(
                        "Load viewers error:",
                        error.response?.data ||
                        error.message,
                    );

                }

            },
            [
                sessionId,
            ],
        );


    // ========================================================
    // LOAD ACTIVE LIVE ADMINS
    // ========================================================

    const loadModerators =
        useCallback(
            async () => {

                if (
                    !sessionId
                ) {

                    return;
                }


                try {

                    const response =
                        await liveService.getLiveModerators(
                            sessionId,
                        );

                    const data =
                        response?.data;

                    let moderatorList = [];


                    if (
                        Array.isArray(data)
                    ) {

                        moderatorList =
                            data;

                    } else if (
                        Array.isArray(
                            data?.results,
                        )
                    ) {

                        moderatorList =
                            data.results;

                    } else if (
                        Array.isArray(
                            data?.moderators,
                        )
                    ) {

                        moderatorList =
                            data.moderators;

                    }


                    setModerators(
                        moderatorList,
                    );

                } catch (error) {

                    console.error(
                        "Load active live admins error:",
                        error.response?.data ||
                        error.message,
                    );

                }

            },
            [
                sessionId,
            ],
        );


    // ========================================================
    // LOAD MESSAGES
    // ========================================================

    const loadMessages =
        useCallback(
            async () => {

                if (
                    !sessionId
                ) {

                    return;
                }


                try {

                    const response =
                        await liveService.getLiveMessages(
                            sessionId,
                        );

                    const data =
                        response?.data;

                    let messageList = [];


                    if (
                        Array.isArray(data)
                    ) {

                        messageList =
                            data;

                    } else if (
                        Array.isArray(
                            data?.results,
                        )
                    ) {

                        messageList =
                            data.results;

                    } else if (
                        Array.isArray(
                            data?.messages,
                        )
                    ) {

                        messageList =
                            data.messages;

                    }


                    setMessages(
                        previous => {

                            const messageMap =
                                new Map();


                            previous.forEach(
                                message => {

                                    if (
                                        message?.is_system
                                    ) {

                                        messageMap.set(
                                            String(
                                                message.id,
                                            ),
                                            message,
                                        );

                                        return;
                                    }


                                    const messageId =
                                        message?.id;


                                    if (
                                        messageId !==
                                        undefined &&
                                        messageId !==
                                        null
                                    ) {

                                        messageMap.set(
                                            String(
                                                messageId,
                                            ),
                                            message,
                                        );

                                    }

                                },
                            );


                            messageList.forEach(
                                message => {

                                    const messageId =
                                        message?.id;


                                    if (
                                        messageId !==
                                        undefined &&
                                        messageId !==
                                        null
                                    ) {

                                        messageMap.set(
                                            String(
                                                messageId,
                                            ),
                                            message,
                                        );

                                    }

                                },
                            );


                            const mergedMessages =
                                Array.from(
                                    messageMap.values(),
                                );


                            mergedMessages.sort(
                                (
                                    first,
                                    second,
                                ) => {

                                    const firstTime =
                                        new Date(
                                            first?.created_at ||
                                            0,
                                        ).getTime();

                                    const secondTime =
                                        new Date(
                                            second?.created_at ||
                                            0,
                                        ).getTime();


                                    return (
                                        firstTime -
                                        secondTime
                                    );

                                },
                            );


                            return mergedMessages;

                        },
                    );

                } catch (error) {

                    console.error(
                        "Load messages error:",
                        error.response?.data ||
                        error.message,
                    );

                }

            },
            [
                sessionId,
            ],
        );


    // ========================================================
    // ADD SYSTEM MESSAGE
    // ========================================================

    const addSystemMessage =
        useCallback(
            (
                action,
                message,
            ) => {

                if (
                    !action ||
                    !message
                ) {

                    return;
                }


                const messageId =
                    `system-${action}-${Date.now()}-${Math.random()}`;


                const systemMessage = {
                    id: messageId,
                    is_system: true,
                    system_action: action,
                    user_id: null,
                    user_name: null,
                    message,
                    created_at:
                        new Date().toISOString(),
                };


                setMessages(
                    previous => [
                        ...previous,
                        systemMessage,
                    ],
                );


                const timer =
                    setTimeout(
                        () => {

                            setMessages(
                                previous =>
                                    previous.filter(
                                        item =>
                                            String(
                                                item?.id,
                                            ) !==
                                            String(
                                                messageId,
                                            ),
                                    ),
                            );


                            delete
                                systemMessageTimersRef.current[
                                    messageId
                                ];

                        },
                        5000,
                    );


                systemMessageTimersRef.current[
                    messageId
                ] = timer;

            },
            [],
        );


    // ========================================================
    // GET VIEWER USERNAME
    // ========================================================

    const getViewerUsername =
        useCallback(
            (
                userId,
            ) => {

                const viewer =
                    viewers.find(
                        item =>
                            String(
                                item?.user_info?.id,
                            ) ===
                            String(
                                userId,
                            ),
                    );


                return (
                    viewer?.user_info?.username ||
                    viewer?.username ||
                    `User ${userId}`
                );

            },
            [
                viewers,
            ],
        );


    // ========================================================
    // REMOVE VIEWER PEER CONNECTION
    // ========================================================

    const removeViewerPeerConnection =
        useCallback(
            (
                connectionId,
            ) => {

                if (
                    !connectionId
                ) {

                    return;
                }


                const peerConnection =
                    peerConnectionsRef.current[
                        connectionId
                    ];


                if (
                    peerConnection
                ) {

                    try {
                        peerConnection.close();
                    } catch {}

                }


                delete
                    peerConnectionsRef.current[
                        connectionId
                    ];


                viewersRef.current.delete(
                    connectionId,
                );


                pendingViewerConnectionsRef.current.delete(
                    connectionId,
                );


                delete
                    iceQueueRef.current[
                        connectionId
                    ];


                delete
                    viewerConnectionsRef.current[
                        connectionId
                    ];


                if (
                    isBroadcaster
                ) {

                    setViewerCount(
                        viewersRef.current.size,
                    );

                }

            },
            [
                isBroadcaster,
            ],
        );


    // ========================================================
    // START CAMERA
    // ========================================================

    const startCamera =
        useCallback(
            async () => {

                if (
                    streamRef.current
                ) {

                    console.log(
                        "Camera already running",
                    );

                    return;
                }


                try {

                    console.log(
                        "Starting broadcaster camera...",
                    );


                    const mediaStream =
                        await navigator.mediaDevices.getUserMedia(
                            {
                                video: true,
                                audio: true,
                            },
                        );


                    streamRef.current =
                        mediaStream;

                    setStream(
                        mediaStream,
                    );


                    if (
                        localVideoRef.current
                    ) {

                        localVideoRef.current.srcObject =
                            mediaStream;

                    }


                    console.log(
                        "Camera started",
                    );

                } catch (error) {

                    console.error(
                        "Camera error:",
                        error,
                    );


                    toast.error(
                        "Unable to access camera or microphone.",
                    );

                }

            },
            [],
        );


    // ========================================================
    // START LIVE
    // ========================================================

    const handleGoLive =
        useCallback(
            async () => {

                console.log(
                    "GO LIVE CLICKED",
                );


                try {

                    setLoading(
                        true,
                    );


                    const response =
                        await liveService.startLive(
                            "My Live Stream",
                        );


                    console.log(
                        "START LIVE RESPONSE:",
                        response?.data,
                    );


                    const data =
                        response?.data;


                    const newSessionId =
                        data?.session_id ||
                        data?.id;


                    if (
                        !newSessionId
                    ) {

                        throw new Error(
                            "Live session ID missing from startLive response",
                        );

                    }


                    setSessionId(
                        newSessionId,
                    );


                    setSession({
                        ...data,
                        id: newSessionId,
                        is_live: true,
                    });


                    setIsLive(
                        true,
                    );


                    setIsBroadcaster(
                        true,
                    );

                } catch (error) {

                    console.error(
                        "LIVE START ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        error.message ||
                        "Unable to start live stream.",
                    );

                } finally {

                    setLoading(
                        false,
                    );

                }

            },
            [],
        );


    // ========================================================
    // CREATE BROADCASTER PEER CONNECTION
    // ========================================================

    const createPeerConnection =
        useCallback(
            (
                connectionId,
            ) => {

                if (
                    !stream ||
                    !isBroadcaster
                ) {

                    return null;
                }


                const existingConnection =
                    peerConnectionsRef.current[
                        connectionId
                    ];


                if (
                    existingConnection
                ) {

                    return existingConnection;
                }


                const peerConnection =
                    new RTCPeerConnection({
                        iceServers: [
                            {
                                urls:
                                    "stun:stun.l.google.com:19302",
                            },
                        ],
                    });


                // =================================================
                // ADD BROADCASTER TRACKS
                // =================================================

                stream
                    .getTracks()
                    .forEach(
                        (
                            track,
                        ) => {

                            peerConnection.addTrack(
                                track,
                                stream,
                            );

                        },
                    );


                // =================================================
                // ICE CANDIDATE
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
                            connectionId,
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
                            "Broadcaster peer state:",
                            connectionId,
                            state,
                        );


                        if (
                            [
                                "failed",
                                "closed",
                            ].includes(
                                state,
                            )
                        ) {

                            try {
                                peerConnection.close();
                            } catch {}


                            delete
                                peerConnectionsRef.current[
                                    connectionId
                                ];


                            viewersRef.current.delete(
                                connectionId,
                            );


                            delete
                                viewerConnectionsRef.current[
                                    connectionId
                                ];


                            setViewerCount(
                                viewersRef.current.size,
                            );

                        }

                    };


                peerConnectionsRef.current[
                    connectionId
                ] =
                    peerConnection;


                return peerConnection;

            },
            [
                stream,
                isBroadcaster,
            ],
        );


    // ========================================================
    // CREATE OFFER FOR NEW VIEWER
    // ========================================================

    const handleNewViewer =
        useCallback(
            async (
                connectionId,
                userId = null,
            ) => {

                if (
                    !connectionId
                ) {

                    console.warn(
                        "NEW VIEWER: connectionId missing",
                    );

                    return;
                }


                if (
                    userId
                ) {

                    viewerConnectionsRef.current[
                        connectionId
                    ] = userId;

                }


                if (
                    !stream ||
                    !isBroadcaster
                ) {

                    console.log(
                        "Viewer arrived before broadcaster stream was ready. Queueing:",
                        connectionId,
                    );


                    pendingViewerConnectionsRef.current.add(
                        connectionId,
                    );


                    return;
                }


                if (
                    !socket
                ) {

                    console.warn(
                        "NEW VIEWER: socket unavailable",
                    );


                    pendingViewerConnectionsRef.current.add(
                        connectionId,
                    );


                    return;
                }


                if (
                    peerConnectionsRef.current[
                        connectionId
                    ]
                ) {

                    return;
                }


                pendingViewerConnectionsRef.current.delete(
                    connectionId,
                );


                console.log(
                    "Creating offer for new viewer:",
                    connectionId,
                );


                viewersRef.current.add(
                    connectionId,
                );


                const peerConnection =
                    createPeerConnection(
                        connectionId,
                    );


                if (
                    !peerConnection
                ) {

                    pendingViewerConnectionsRef.current.add(
                        connectionId,
                    );


                    return;
                }


                try {

                    const offer =
                        await peerConnection.createOffer();


                    await peerConnection.setLocalDescription(
                        offer,
                    );


                    console.log(
                        "Sending offer to viewer:",
                        connectionId,
                    );


                    const sent =
                        sendLiveOffer(
                            connectionId,
                            offer,
                        );


                    if (
                        !sent
                    ) {

                        console.warn(
                            "Offer could not be sent. Viewer will remain pending:",
                            connectionId,
                        );


                        try {
                            peerConnection.close();
                        } catch {}


                        delete
                            peerConnectionsRef.current[
                                connectionId
                            ];


                        viewersRef.current.delete(
                            connectionId,
                        );


                        pendingViewerConnectionsRef.current.add(
                            connectionId,
                        );


                        return;
                    }


                    setViewerCount(
                        viewersRef.current.size,
                    );

                } catch (error) {

                    console.error(
                        "Offer creation error:",
                        error,
                    );


                    try {
                        peerConnection.close();
                    } catch {}


                    delete
                        peerConnectionsRef.current[
                            connectionId
                        ];


                    viewersRef.current.delete(
                        connectionId,
                    );


                    pendingViewerConnectionsRef.current.add(
                        connectionId,
                    );

                }

            },
            [
                socket,
                stream,
                isBroadcaster,
                createPeerConnection,
            ],
        );


    // ========================================================
    // PROCESS PENDING VIEWERS
    // ========================================================

    useEffect(
        () => {

            if (
                !socket ||
                !stream ||
                !isBroadcaster
            ) {

                return;
            }


            const pendingConnections =
                Array.from(
                    pendingViewerConnectionsRef.current,
                );


            if (
                pendingConnections.length === 0
            ) {

                return;
            }


            console.log(
                "Processing pending viewers:",
                pendingConnections,
            );


            pendingConnections.forEach(
                (
                    connectionId,
                ) => {

                    handleNewViewer(
                        connectionId,
                    );

                },
            );

        },
        [
            socket,
            stream,
            isBroadcaster,
            handleNewViewer,
        ],
    );


    // ========================================================
    // FLUSH ICE QUEUE
    // ========================================================

    const flushIceQueue =
        useCallback(
            async (
                connectionId,
                peerConnection,
            ) => {

                const queue =
                    iceQueueRef.current[
                        connectionId
                    ] || [];


                if (
                    queue.length === 0
                ) {

                    return;
                }


                console.log(
                    "Flushing ICE queue:",
                    connectionId,
                    queue.length,
                );


                for (
                    const candidate
                    of queue
                ) {

                    try {

                        await peerConnection.addIceCandidate(
                            new RTCIceCandidate(
                                candidate,
                            ),
                        );

                    } catch (error) {

                        console.error(
                            "ICE queue error:",
                            error,
                        );

                    }

                }


                iceQueueRef.current[
                    connectionId
                ] = [];

            },
            [],
        );


    // ========================================================
    // HANDLE ANSWER
    // ========================================================

    const handleAnswer =
        useCallback(
            async (
                data,
            ) => {

                const connectionId =
                    data?.connection_id;


                if (
                    !connectionId
                ) {

                    console.warn(
                        "ANSWER: connectionId missing",
                    );

                    return;
                }


                const peerConnection =
                    peerConnectionsRef.current[
                        connectionId
                    ];


                if (
                    !peerConnection
                ) {

                    console.warn(
                        "ANSWER: peer connection not found:",
                        connectionId,
                    );

                    return;
                }


                try {

                    console.log(
                        "Received answer from viewer:",
                        connectionId,
                    );


                    if (
                        peerConnection.signalingState !==
                        "have-local-offer"
                    ) {

                        console.warn(
                            "ANSWER: invalid signaling state:",
                            connectionId,
                            peerConnection.signalingState,
                        );

                        return;
                    }


                    await peerConnection.setRemoteDescription(
                        new RTCSessionDescription(
                            data.data,
                        ),
                    );


                    await flushIceQueue(
                        connectionId,
                        peerConnection,
                    );


                    console.log(
                        "Viewer answer applied:",
                        connectionId,
                    );

                } catch (error) {

                    console.error(
                        "Answer error:",
                        connectionId,
                        error,
                    );

                }

            },
            [
                flushIceQueue,
            ],
        );


    // ========================================================
    // SEND CHAT MESSAGE
    // ========================================================

    const handleSendMessage =
        useCallback(
            (
                message,
            ) => {

                if (
                    !sessionId ||
                    !message?.trim() ||
                    isChatDisabled
                ) {

                    return;
                }


                const sent =
                    sendLiveChatMessage(
                        message.trim(),
                    );


                if (
                    !sent
                ) {

                    console.error(
                        "SEND LIVE CHAT MESSAGE FAILED: WebSocket is not connected",
                    );


                    toast.error(
                        "Live chat is not connected. Please try again.",
                    );

                }

            },
            [
                sessionId,
                isChatDisabled,
            ],
        );


    // ========================================================
    // CAN MODERATE LIVE VIEWERS
    // ========================================================

    const canModerateLiveViewers =
        isBroadcaster ||
        isLiveAdmin;


    // ========================================================
    // MUTE VIEWER
    // ========================================================

    const handleMuteViewer =
        useCallback(
            async (
                userId,
            ) => {

                if (
                    !canModerateLiveViewers ||
                    !sessionId ||
                    !userId
                ) {

                    return;
                }


                const targetUsername =
                    getViewerUsername(
                        userId,
                    );


                try {

                    await liveService.muteLiveViewer(
                        sessionId,
                        userId,
                        null,
                    );


                    sendMuteLiveViewer(
                        userId,
                        null,
                    );


                    addSystemMessage(
                        "muted",
                        `${currentUsername} muted ${targetUsername}`,
                    );


                    await loadViewers();

                } catch (error) {

                    console.error(
                        "MUTE VIEWER ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        "Unable to mute viewer.",
                    );

                }

            },
            [
                canModerateLiveViewers,
                sessionId,
                getViewerUsername,
                currentUsername,
                addSystemMessage,
                loadViewers,
            ],
        );


    // ========================================================
    // UNMUTE VIEWER
    // ========================================================

    const handleUnmuteViewer =
        useCallback(
            async (
                userId,
            ) => {

                if (
                    !canModerateLiveViewers ||
                    !sessionId ||
                    !userId
                ) {

                    return;
                }


                const targetUsername =
                    getViewerUsername(
                        userId,
                    );


                try {

                    await liveService.unmuteLiveViewer(
                        sessionId,
                        userId,
                    );


                    sendUnmuteLiveViewer(
                        userId,
                    );


                    addSystemMessage(
                        "unmuted",
                        `${currentUsername} unmuted ${targetUsername}`,
                    );


                    await loadViewers();

                } catch (error) {

                    console.error(
                        "UNMUTE VIEWER ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        "Unable to unmute viewer.",
                    );

                }

            },
            [
                canModerateLiveViewers,
                sessionId,
                getViewerUsername,
                currentUsername,
                addSystemMessage,
                loadViewers,
            ],
        );


    // ========================================================
    // KICK VIEWER
    // ========================================================

    const handleKickViewer =
        useCallback(
            async (
                userId,
            ) => {

                if (
                    !canModerateLiveViewers ||
                    !sessionId ||
                    !userId
                ) {

                    return;
                }


                const targetUsername =
                    getViewerUsername(
                        userId,
                    );


                try {

                    await liveService.kickLiveViewer(
                        sessionId,
                        userId,
                    );


                    sendKickLiveViewer(
                        userId,
                    );


                    addSystemMessage(
                        "kicked",
                        `${currentUsername} kicked ${targetUsername} from the live`,
                    );


                    await loadViewers();
                    await loadModerators();

                } catch (error) {

                    console.error(
                        "KICK VIEWER ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        "Unable to kick viewer.",
                    );

                }

            },
            [
                canModerateLiveViewers,
                sessionId,
                getViewerUsername,
                currentUsername,
                addSystemMessage,
                loadViewers,
                loadModerators,
            ],
        );


    // ========================================================
    // BLOCK VIEWER
    // ========================================================

    const handleBlockViewer =
        useCallback(
            async (
                userId,
            ) => {

                if (
                    !isBroadcaster ||
                    !sessionId ||
                    !userId
                ) {

                    return;
                }


                const targetUsername =
                    getViewerUsername(
                        userId,
                    );


                try {

                    await liveService.blockLiveViewer(
                        sessionId,
                        userId,
                    );


                    sendBlockLiveViewer(
                        userId,
                    );


                    addSystemMessage(
                        "blocked",
                        `${currentUsername} removed ${targetUsername} from the live`,
                    );


                    await loadViewers();
                    await loadModerators();

                } catch (error) {

                    console.error(
                        "BLOCK VIEWER ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        "Unable to block viewer.",
                    );

                }

            },
            [
                isBroadcaster,
                sessionId,
                getViewerUsername,
                currentUsername,
                addSystemMessage,
                loadViewers,
                loadModerators,
            ],
        );


    // ========================================================
    // ASSIGN PERMANENT LIVE ADMIN
    // ========================================================

    const handleAssignModerator =
        useCallback(
            async (
                userId,
            ) => {

                if (
                    !isBroadcaster ||
                    !sessionId ||
                    !userId
                ) {

                    return;
                }


                try {

                    await liveService.assignLiveModerator(
                        sessionId,
                        userId,
                    );


                    await loadModerators();

                } catch (error) {

                    console.error(
                        "ASSIGN LIVE ADMIN ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        "Unable to assign live admin.",
                    );

                }

            },
            [
                isBroadcaster,
                sessionId,
                loadModerators,
            ],
        );


    // ========================================================
    // REMOVE PERMANENT LIVE ADMIN
    // ========================================================

    const handleRemoveModerator =
        useCallback(
            async (
                userId,
            ) => {

                if (
                    !isBroadcaster ||
                    !sessionId ||
                    !userId
                ) {

                    return;
                }


                try {

                    await liveService.removeLiveModerator(
                        sessionId,
                        userId,
                    );


                    await loadModerators();

                } catch (error) {

                    console.error(
                        "REMOVE LIVE ADMIN ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        "Unable to remove live admin.",
                    );

                }

            },
            [
                isBroadcaster,
                sessionId,
                loadModerators,
            ],
        );


    // ========================================================
    // STOP LIVE
    // ========================================================

    const handleStopLive =
        useCallback(
            async () => {

                try {

                    sendEndLiveStream();


                    if (
                        sessionId
                    ) {

                        try {

                            await liveService.endLive(
                                sessionId,
                            );

                        } catch (error) {

                            console.error(
                                "End live API error:",
                                error.response?.data ||
                                error.message,
                            );

                        }

                    }

                } finally {

                    Object.values(
                        peerConnectionsRef.current,
                    ).forEach(
                        (
                            peerConnection,
                        ) => {

                            try {
                                peerConnection.close();
                            } catch {}

                        },
                    );


                    peerConnectionsRef.current =
                        {};

                    viewersRef.current.clear();

                    viewerConnectionsRef.current =
                        {};

                    pendingViewerConnectionsRef.current.clear();

                    iceQueueRef.current =
                        {};


                    clearInterval(
                        heartbeatRef.current,
                    );

                    heartbeatRef.current =
                        null;


                    if (
                        streamRef.current
                    ) {

                        streamRef.current
                            .getTracks()
                            .forEach(
                                (
                                    track,
                                ) => {

                                    track.stop();

                                },
                            );

                        streamRef.current =
                            null;

                    }


                    Object.values(
                        systemMessageTimersRef.current,
                    ).forEach(
                        timer => {
                            clearTimeout(timer);
                        },
                    );

                    systemMessageTimersRef.current =
                        {};


                    setViewerCount(0);
                    setViewers([]);
                    setModerators([]);

                    setIsLive(false);
                    setIsBroadcaster(false);

                    setSessionId(null);
                    setSession(null);

                    setStream(null);

                    setMessages([]);
                    setIsChatDisabled(false);
                    setViewerJoined(false);

                    closeLiveSocket();

                    setSocket(null);

                }

            },
            [
                sessionId,
            ],
        );


    // ========================================================
    // PLATFORM MODERATION ACTION
    // ========================================================

    const handleApplyModerationAction =
        useCallback(
            async (
                data,
            ) => {

                if (
                    !isModerator ||
                    !sessionId ||
                    !data?.action
                ) {

                    return;
                }


                try {

                    setModerationLoading(
                        true,
                    );


                    await liveService.applyLiveModerationAction(
                        sessionId,
                        data.action,
                        data.reason,
                        data.note,
                        data.duration_minutes,
                    );


                    if (
                        data.action ===
                        "chat_restricted"
                    ) {

                        setIsChatDisabled(
                            true,
                        );

                    }


                    if (
                        data.action ===
                            "temporary_shutdown" ||
                        data.action ===
                        "permanent_termination"
                    ) {

                        await handleStopLive();

                    }

                } catch (error) {

                    console.error(
                        "LIVE MODERATION ERROR:",
                        error.response?.data ||
                        error.message,
                    );


                    toast.error(
                        error.response?.data?.error?.message ||
                        error.response?.data?.detail ||
                        error.message ||
                        "Live moderation action failed.",
                    );

                } finally {

                    setModerationLoading(
                        false,
                    );

                }

            },
            [
                isModerator,
                sessionId,
                handleStopLive,
            ],
        );


    // ========================================================
    // CLEAN BROADCASTER WEBRTC
    // ========================================================

    const cleanupWebRTC =
        useCallback(
            () => {

                Object.values(
                    peerConnectionsRef.current,
                ).forEach(
                    (
                        peerConnection,
                    ) => {

                        try {
                            peerConnection.close();
                        } catch {}

                    },
                );


                peerConnectionsRef.current =
                    {};

                viewersRef.current.clear();

                viewerConnectionsRef.current =
                    {};

                pendingViewerConnectionsRef.current.clear();

                iceQueueRef.current =
                    {};

            },
            [],
        );


    // ========================================================
    // VIEWER CALLBACKS
    // ========================================================

    const handleViewerJoinedChange =
        useCallback(
            (
                joined,
            ) => {

                console.log(
                    "VIEWER JOINED STATE:",
                    joined,
                );


                setViewerJoined(
                    Boolean(joined),
                );

            },
            [],
        );


    const handleViewerRemoteStreamChange =
        useCallback(
            (
                remoteStream,
            ) => {

                console.log(
                    "VIEWER REMOTE STREAM:",
                    remoteStream
                        ? "available"
                        : "not available",
                );

            },
            [],
        );


    const handleViewerCountChange =
        useCallback(
            (
                count,
            ) => {

                setViewerCount(
                    Number(count) || 0,
                );

            },
            [],
        );


    const handleViewerStreamEnded =
        useCallback(
            () => {

                console.log(
                    "VIEWER: stream ended",
                );


                setIsLive(false);
                setViewerJoined(false);
                setViewerCount(0);
                setViewers([]);
                setModerators([]);
                setMessages([]);
                setIsChatDisabled(false);
                setSessionId(null);
                setSession(null);
                setIsBroadcaster(false);

            },
            [],
        );


    const handleViewerForcedLeave =
        useCallback(
            (
                reason,
            ) => {

                console.warn(
                    "VIEWER FORCED LEAVE:",
                    reason,
                );


                setViewerJoined(
                    false,
                );


                if (
                    reason === "kicked"
                ) {

                    toast.error(
                        "You were removed from this live.",
                    );

                } else if (
                    reason === "blocked"
                ) {

                    toast.error(
                        "You were blocked from this live.",
                    );

                }

            },
            [],
        );


    const handleViewerChatDisabledChange =
        useCallback(
            (
                disabled,
            ) => {

                setIsChatDisabled(
                    Boolean(disabled),
                );

            },
            [],
        );


    // ========================================================
    // SOCKET MESSAGE HANDLER
    // ========================================================

    useEffect(
        () => {

            const handleMessage =
                async (
                    data,
                ) => {

                    if (
                        !data ||
                        !data.type
                    ) {

                        return;
                    }


                    // =================================================
                    // CHAT MESSAGE
                    // =================================================

                    if (
                        data.type ===
                        "message"
                    ) {

                        setMessages(
                            previous => {

                                const messageId =
                                    data?.id;


                                if (
                                    messageId ===
                                    undefined ||
                                    messageId ===
                                    null
                                ) {

                                    return [
                                        ...previous,
                                        data,
                                    ];

                                }


                                const alreadyExists =
                                    previous.some(
                                        message =>
                                            String(
                                                message?.id,
                                            ) ===
                                            String(
                                                messageId,
                                            ),
                                    );


                                if (
                                    alreadyExists
                                ) {

                                    return previous;

                                }


                                return [
                                    ...previous,
                                    data,
                                ];

                            },
                        );

                        return;
                    }


                    // =================================================
                    // CHAT ERROR
                    // =================================================

                    if (
                        data.type ===
                        "chat_error"
                    ) {

                        toast.error(
                            data.message ||
                            "Unable to send live chat message.",
                        );

                        return;
                    }


                    // =================================================
                    // CHAT RESTRICTED
                    // =================================================

                    if (
                        data.type ===
                        "chat_restricted"
                    ) {

                        setIsChatDisabled(
                            true,
                        );

                        return;
                    }


                    // =================================================
                    // VIEWER JOINED
                    // =================================================

                    if (
                        data.type ===
                        "viewer_joined"
                    ) {

                        const isCurrentUser =
                            Boolean(
                                data.user_id &&
                                currentUserId !== null &&
                                String(
                                    data.user_id,
                                ) ===
                                String(
                                    currentUserId,
                                ),
                            );


                        if (
                            !isCurrentUser
                        ) {

                            addSystemMessage(
                                "joined",
                                data.message ||
                                `${data.user_name || "Someone"} joined the live`,
                            );

                        }


                        if (
                            isBroadcaster
                        ) {

                            await loadViewers();
                            await loadModerators();

                        }


                        return;
                    }


                    // =================================================
                    // NEW VIEWER
                    // =================================================

                    if (
                        data.type ===
                        "new_viewer"
                    ) {

                        if (
                            !isBroadcaster
                        ) {

                            return;
                        }


                        console.log(
                            "LIVE NEW VIEWER:",
                            data.connection_id,
                        );


                        await handleNewViewer(
                            data.connection_id,
                            data.user_id,
                        );


                        await loadViewers();
                        await loadModerators();

                        return;
                    }


                    // =================================================
                    // VIEWER LEFT
                    // =================================================

                    if (
                        data.type ===
                        "viewer_left"
                    ) {

                        if (
                            !isBroadcaster
                        ) {

                            return;
                        }


                        const connectionId =
                            data.connection_id ||
                            Object.keys(
                                viewerConnectionsRef.current,
                            ).find(
                                id =>
                                    String(
                                        viewerConnectionsRef.current[
                                            id
                                        ],
                                    ) ===
                                    String(
                                        data.user_id,
                                    ),
                            );


                        if (
                            connectionId
                        ) {

                            removeViewerPeerConnection(
                                connectionId,
                            );

                        }


                        await loadViewers();
                        await loadModerators();

                        return;
                    }


                    // =================================================
                    // WEBRTC ANSWER
                    // =================================================

                    if (
                        data.type ===
                        "answer"
                    ) {

                        if (
                            !isBroadcaster
                        ) {

                            return;
                        }


                        await handleAnswer(
                            data,
                        );

                        return;
                    }


                    // =================================================
                    // WEBRTC ICE
                    // =================================================

                    if (
                        data.type ===
                        "ice_candidate"
                    ) {

                        if (
                            !isBroadcaster
                        ) {

                            return;
                        }


                        const connectionId =
                            data.connection_id;

                        const candidate =
                            data.data;


                        if (
                            !connectionId ||
                            !candidate
                        ) {

                            return;
                        }


                        const peerConnection =
                            peerConnectionsRef.current[
                                connectionId
                            ];


                        if (
                            peerConnection &&
                            peerConnection.remoteDescription
                        ) {

                            try {

                                await peerConnection.addIceCandidate(
                                    new RTCIceCandidate(
                                        candidate,
                                    ),
                                );

                            } catch (error) {

                                console.error(
                                    "ICE error:",
                                    error,
                                );

                            }

                            return;
                        }


                        if (
                            !iceQueueRef.current[
                                connectionId
                            ]
                        ) {

                            iceQueueRef.current[
                                connectionId
                            ] = [];

                        }


                        iceQueueRef.current[
                            connectionId
                        ].push(
                            candidate,
                        );

                        return;
                    }


                    // =================================================
                    // VIEWER COUNT
                    // =================================================

                    if (
                        data.type ===
                        "viewer_count"
                    ) {

                        setViewerCount(
                            Number(
                                data.count,
                            ) || 0,
                        );

                        return;
                    }


                    // =================================================
                    // VIEWER MUTED
                    // =================================================

                    if (
                        data.type ===
                        "viewer_muted"
                    ) {

                        const mutedUserId =
                            data.user_id;


                        setViewers(
                            previous =>
                                previous.map(
                                    viewer => {

                                        const viewerUserId =
                                            viewer?.user_info?.id;


                                        if (
                                            String(
                                                viewerUserId,
                                            ) ===
                                            String(
                                                mutedUserId,
                                            )
                                        ) {

                                            return {
                                                ...viewer,
                                                is_muted:
                                                    true,
                                            };

                                        }


                                        return viewer;

                                    },
                                ),
                        );

                        return;
                    }


                    // =================================================
                    // VIEWER UNMUTED
                    // =================================================

                    if (
                        data.type ===
                        "viewer_unmuted"
                    ) {

                        const unmutedUserId =
                            data.user_id;


                        setViewers(
                            previous =>
                                previous.map(
                                    viewer => {

                                        const viewerUserId =
                                            viewer?.user_info?.id;


                                        if (
                                            String(
                                                viewerUserId,
                                            ) ===
                                            String(
                                                unmutedUserId,
                                            )
                                        ) {

                                            return {
                                                ...viewer,
                                                is_muted:
                                                    false,
                                            };

                                        }


                                        return viewer;

                                    },
                                ),
                        );

                        return;
                    }


                    // =================================================
                    // VIEWER KICKED
                    // =================================================

                    if (
                        data.type ===
                        "viewer_kicked"
                    ) {

                        const kickedUserId =
                            data.user_id;


                        const connectionId =
                            Object.keys(
                                viewerConnectionsRef.current,
                            ).find(
                                id =>
                                    String(
                                        viewerConnectionsRef.current[
                                            id
                                        ],
                                    ) ===
                                    String(
                                        kickedUserId,
                                    ),
                            );


                        if (
                            connectionId &&
                            isBroadcaster
                        ) {

                            removeViewerPeerConnection(
                                connectionId,
                            );

                        }


                        setViewers(
                            previous =>
                                previous.filter(
                                    viewer =>
                                        String(
                                            viewer?.user_info?.id,
                                        ) !==
                                        String(
                                            kickedUserId,
                                        ),
                                ),
                        );


                        if (
                            isBroadcaster ||
                            isLiveAdmin
                        ) {

                            await loadViewers();
                            await loadModerators();

                        }

                        return;
                    }


                    // =================================================
                    // VIEWER BLOCKED
                    // =================================================

                    if (
                        data.type ===
                        "viewer_blocked"
                    ) {

                        const blockedUserId =
                            data.user_id;


                        const connectionId =
                            Object.keys(
                                viewerConnectionsRef.current,
                            ).find(
                                id =>
                                    String(
                                        viewerConnectionsRef.current[
                                            id
                                        ],
                                    ) ===
                                    String(
                                        blockedUserId,
                                    ),
                            );


                        if (
                            connectionId &&
                            isBroadcaster
                        ) {

                            removeViewerPeerConnection(
                                connectionId,
                            );

                        }


                        setViewers(
                            previous =>
                                previous.filter(
                                    viewer =>
                                        String(
                                            viewer?.user_info?.id,
                                        ) !==
                                        String(
                                            blockedUserId,
                                        ),
                                ),
                        );


                        if (
                            isBroadcaster ||
                            isLiveAdmin
                        ) {

                            await loadViewers();
                            await loadModerators();

                        }

                        return;
                    }


                    // =================================================
                    // MODERATOR ASSIGNED
                    // =================================================

                    if (
                        data.type ===
                        "moderator_assigned"
                    ) {

                        await loadModerators();

                        return;
                    }


                    // =================================================
                    // MODERATOR REMOVED
                    // =================================================

                    if (
                        data.type ===
                        "moderator_removed"
                    ) {

                        await loadModerators();

                        return;
                    }


                    // =================================================
                    // STREAM ENDED
                    // =================================================

                    if (
                        data.type ===
                        "stream_ended"
                    ) {

                        cleanupWebRTC();


                        clearInterval(
                            heartbeatRef.current,
                        );

                        heartbeatRef.current =
                            null;


                        if (
                            streamRef.current
                        ) {

                            streamRef.current
                                .getTracks()
                                .forEach(
                                    track => {
                                        track.stop();
                                    },
                                );


                            streamRef.current =
                                null;

                        }


                        setViewerCount(0);
                        setViewers([]);
                        setModerators([]);

                        setIsLive(false);
                        setIsBroadcaster(false);

                        setSessionId(null);
                        setSession(null);

                        setStream(null);

                        setMessages([]);
                        setIsChatDisabled(false);
                        setViewerJoined(false);

                        closeLiveSocket();

                        setSocket(null);

                        return;
                    }

                };


            addLiveListener(
                handleMessage,
            );


            return () => {

                removeLiveListener(
                    handleMessage,
                );

            };

        },
        [
            isBroadcaster,
            isLiveAdmin,
            currentUserId,
            handleNewViewer,
            handleAnswer,
            cleanupWebRTC,
            removeViewerPeerConnection,
            loadViewers,
            loadModerators,
            addSystemMessage,
        ],
    );


    // ========================================================
    // CONNECT BROADCASTER LIVE SOCKET
    // ========================================================

    useEffect(
        () => {

            if (
                !sessionId ||
                !isBroadcaster ||
                !stream
            ) {

                return;
            }


            console.log(
                "CONNECTING BROADCASTER LIVE SOCKET:",
                sessionId,
            );


            const socketInstance =
                getLiveSocket(
                    sessionId,
                );


            if (
                !socketInstance
            ) {

                console.error(
                    "Unable to create LIVE socket",
                );


                toast.error(
                    "Unable to connect to live chat.",
                );

                return;
            }


            setSocket(
                socketInstance,
            );


            return () => {

                closeLiveSocket();

                setSocket(
                    null,
                );

            };

        },
        [
            sessionId,
            isBroadcaster,
            stream,
        ],
    );


    // ========================================================
    // LOAD LIVE DATA
    // ========================================================

    useEffect(
        () => {

            if (
                !sessionId
            ) {

                return;
            }


            if (
                !isBroadcaster &&
                !viewerJoined
            ) {

                console.log(
                    "Waiting for viewer to join before loading live data...",
                );

                return;
            }


            loadModerators();
            loadMessages();
            loadViewers();

        },
        [
            sessionId,
            isBroadcaster,
            viewerJoined,
            loadViewers,
            loadModerators,
            loadMessages,
        ],
    );


    // ========================================================
    // HEARTBEAT
    // ========================================================

    useEffect(
        () => {

            if (
                !socket ||
                !isLive ||
                !isBroadcaster
            ) {

                return;
            }


            heartbeatRef.current =
                setInterval(
                    () => {

                        sendLiveHeartbeat();

                    },
                    5000,
                );


            return () => {

                clearInterval(
                    heartbeatRef.current,
                );

                heartbeatRef.current =
                    null;

            };

        },
        [
            socket,
            isLive,
            isBroadcaster,
        ],
    );


    // ========================================================
    // CAMERA VIDEO CONNECTION
    // ========================================================

    useEffect(
        () => {

            if (
                localVideoRef.current &&
                stream
            ) {

                localVideoRef.current.srcObject =
                    stream;

            }

        },
        [
            stream,
        ],
    );


    // ========================================================
    // START CAMERA WHEN BROADCASTING
    // ========================================================

    useEffect(
        () => {

            if (
                isLive &&
                isBroadcaster &&
                !stream &&
                !streamRef.current
            ) {

                startCamera();

            }

        },
        [
            isLive,
            isBroadcaster,
            stream,
            startCamera,
        ],
    );


    // ========================================================
    // MODERATOR CLICK
    // ========================================================

    const handleModeratorClick =
        useCallback(
            (
                moderator,
            ) => {

                console.log(
                    "Live admin clicked:",
                    moderator,
                );

            },
            [],
        );


    // ========================================================
    // CLEANUP
    // ========================================================

    useEffect(
        () => {

            return () => {

                clearInterval(
                    heartbeatRef.current,
                );


                Object.values(
                    systemMessageTimersRef.current,
                ).forEach(
                    timer => {
                        clearTimeout(timer);
                    },
                );


                systemMessageTimersRef.current =
                    {};


                cleanupWebRTC();


                if (
                    streamRef.current
                ) {

                    streamRef.current
                        .getTracks()
                        .forEach(
                            track => {
                                track.stop();
                            },
                        );


                    streamRef.current =
                        null;

                }


                closeLiveSocket();

            };

        },
        [
            cleanupWebRTC,
        ],
    );


    // ========================================================
    // RENDER
    // ========================================================

    return (

        <div className="live-page">

            <div className="live-container">


                {/* LIVE HEADER */}

                <LiveHeader
                    isLive={
                        isLive
                    }

                    title={
                        session?.title ||
                        "Live Streaming"
                    }

                    viewerCount={
                        viewerCount
                    }

                    sessionId={
                        sessionId
                    }

                    isBroadcaster={
                        isBroadcaster
                    }
                />


                {/* BROADCASTER VIDEO */}

                {isBroadcaster && (

                    <LiveVideo
                        isLive={
                            isLive
                        }

                        isBroadcaster={
                            isBroadcaster
                        }

                        localVideoRef={
                            localVideoRef
                        }

                        stream={
                            stream
                        }
                    />

                )}


                {/* BROADCASTER CONTROLS */}

                {isBroadcaster && (

                    <LiveControls
                        isLive={
                            isLive
                        }

                        isBroadcaster={
                            isBroadcaster
                        }

                        loading={
                            loading
                        }

                        onGoLive={
                            handleGoLive
                        }

                        onEndLive={
                            handleStopLive
                        }

                    />

                )}


                {/* VIEWER */}

                {!isBroadcaster &&
                    sessionId && (

                        <Viewer
                            sessionId={
                                sessionId
                            }

                            isLive={
                                isLive
                            }

                            onJoinedChange={
                                handleViewerJoinedChange
                            }

                            onRemoteStreamChange={
                                handleViewerRemoteStreamChange
                            }

                            onViewerCountChange={
                                handleViewerCountChange
                            }

                            onStreamEnded={
                                handleViewerStreamEnded
                            }

                            onForcedLeave={
                                handleViewerForcedLeave
                            }

                            onChatDisabledChange={
                                handleViewerChatDisabledChange
                            }

                        />

                    )}


                {/* LIVE CHAT */}

                {isLive && (

                    <LiveChat
                        messages={
                            messages
                        }

                        currentUserId={
                            currentUserId
                        }

                        onSendMessage={
                            handleSendMessage
                        }

                        isChatDisabled={
                            isChatDisabled
                        }

                    />

                )}


                {/* VIEWER LIST */}

                {isLive && (

                    <LiveViewerList
                        viewers={
                            viewers
                        }

                        viewerCount={
                            viewerCount
                        }

                        moderators={
                            moderators
                        }

                        isBroadcaster={
                            isBroadcaster
                        }

                        isModerator={
                            isLiveAdmin
                        }

                        onMuteViewer={
                            handleMuteViewer
                        }

                        onUnmuteViewer={
                            handleUnmuteViewer
                        }

                        onKickViewer={
                            handleKickViewer
                        }

                        onBlockViewer={
                            handleBlockViewer
                        }

                        onAssignModerator={
                            handleAssignModerator
                        }

                        onRemoveModerator={
                            handleRemoveModerator
                        }

                    />

                )}


                {/* ACTIVE LIVE ADMIN LIST */}

                {isLive &&
                    isBroadcaster && (

                        <LiveModeratorList
                            moderators={
                                moderators
                            }

                            isBroadcaster={
                                isBroadcaster
                            }

                            onModeratorClick={
                                handleModeratorClick
                            }

                        />

                    )}


                {/* PLATFORM MODERATION */}

                {isLive &&
                    isModerator && (

                        <LiveModeration
                            session={
                                session
                            }

                            isModerator={
                                isModerator
                            }

                            onApplyAction={
                                handleApplyModerationAction
                            }

                            loading={
                                moderationLoading
                            }

                        />

                    )}

            </div>

        </div>

    );

};


// ============================================================
// ACTIVE LIVE ADMIN HELPER
// ============================================================

const useMemoLiveAdmin = (
    moderators,
    currentUserId,
) => {

    if (
        !currentUserId ||
        !Array.isArray(moderators)
    ) {

        return false;
    }


    return moderators.some(
        moderator => {

            const moderatorUserId =
                moderator?.user_info?.id ??
                moderator?.user_id ??
                moderator?.user?.id ??
                moderator?.user ??
                null;


            if (
                !moderatorUserId
            ) {

                return false;
            }


            const isActive =
                moderator?.is_active !== false;


            const role =
                moderator?.role ??
                null;


            return (
                String(
                    moderatorUserId,
                ) ===
                String(
                    currentUserId,
                ) &&
                isActive &&
                (
                    !role ||
                    role ===
                    "broadcaster_admin"
                )
            );

        },
    );

};


export default Live;