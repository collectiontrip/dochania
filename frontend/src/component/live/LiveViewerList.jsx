import React, {
    useEffect,
    useRef,
    useState,
} from "react";


// ============================================================
// LIVE VIEWER LIST
// ============================================================

const LiveViewerList = ({
    viewers = [],
    viewerCount = 0,

    moderators = [],

    isBroadcaster = false,
    isModerator = false,

    onMuteViewer = null,
    onUnmuteViewer = null,
    onKickViewer = null,
    onBlockViewer = null,

    onAssignModerator = null,
    onRemoveModerator = null,
}) => {

    const [
        activeViewerId,
        setActiveViewerId,
    ] = useState(null);

    const menuRef =
        useRef(null);


    // ========================================================
    // CLOSE MENU ON OUTSIDE CLICK
    // ========================================================

    useEffect(
        () => {

            const handleOutsideClick =
                (event) => {

                    if (
                        menuRef.current &&
                        !menuRef.current.contains(
                            event.target,
                        )
                    ) {

                        setActiveViewerId(
                            null,
                        );

                    }

                };


            document.addEventListener(
                "mousedown",
                handleOutsideClick,
            );


            return () => {

                document.removeEventListener(
                    "mousedown",
                    handleOutsideClick,
                );

            };

        },
        [],
    );


    // ========================================================
    // GET VIEWER ID
    // ========================================================

    const getViewerId =
        (viewer) => {

            return (
                viewer?.user_info?.id ??
                viewer?.user_id ??
                viewer?.user?.id ??
                null
            );

        };


    // ========================================================
    // GET VIEWER DISPLAY NAME
    // ========================================================

    const getViewerName =
        (viewer) => {

            return (
                viewer?.user_info?.full_name ||
                viewer?.user_info?.username ||
                viewer?.username ||
                "Viewer"
            );

        };


    // ========================================================
    // GET VIEWER USERNAME
    // ========================================================

    const getUsername =
        (viewer) => {

            const username =
                viewer?.user_info?.username ||
                viewer?.username ||
                "";


            if (!username) {
                return "";
            }


            return `@${username}`;

        };


    // ========================================================
    // GET VIEWER PROFILE PICTURE
    // ========================================================

    const getViewerAvatar =
        (viewer) => {

            return (
                viewer?.user_info?.profile_picture ||
                viewer?.profile_picture ||
                null
            );

        };


    // ========================================================
    // GET MUTED STATE
    // ========================================================

    const isViewerMuted =
        (viewer) => {

            return viewer?.is_muted === true;

        };


    // ========================================================
    // CHECK LIVE ADMIN
    // ========================================================

    const isLiveAdmin =
        (viewer) => {

            const viewerId =
                getViewerId(
                    viewer,
                );


            if (!viewerId) {
                return false;
            }


            if (!Array.isArray(moderators)) {
                return false;
            }


            return moderators.some(
                (moderator) => {

                    const moderatorUserId =
                        moderator?.user_info?.id ??
                        moderator?.user_id ??
                        moderator?.user?.id ??
                        null;


                    if (!moderatorUserId) {
                        return false;
                    }


                    const role =
                        moderator?.role ??
                        null;


                    const isActive =
                        moderator?.is_active !== false;


                    return (
                        String(
                            moderatorUserId,
                        ) ===
                        String(
                            viewerId,
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


    // ========================================================
    // CAN MODERATE VIEWER
    // ========================================================

    const canModerateViewer =
        () => {

            return (
                isBroadcaster ||
                isModerator
            );

        };


    // ========================================================
    // HANDLE VIEWER CLICK
    // ========================================================

    const handleViewerClick =
        (viewer) => {

            if (
                !canModerateViewer()
            ) {

                return;
            }


            const viewerId =
                getViewerId(
                    viewer,
                );


            if (!viewerId) {
                return;
            }


            setActiveViewerId(
                (currentId) => {

                    return (
                        String(
                            currentId,
                        ) ===
                        String(
                            viewerId,
                        )
                    )
                        ? null
                        : viewerId;

                },
            );

        };


    // ========================================================
    // HANDLE MUTE
    // ========================================================

    const handleMute =
        (viewer) => {

            const viewerId =
                getViewerId(
                    viewer,
                );


            if (
                !viewerId ||
                !onMuteViewer
            ) {

                return;
            }


            onMuteViewer(
                viewerId,
            );


            setActiveViewerId(
                null,
            );

        };


    // ========================================================
    // HANDLE UNMUTE
    // ========================================================

    const handleUnmute =
        (viewer) => {

            const viewerId =
                getViewerId(
                    viewer,
                );


            if (
                !viewerId ||
                !onUnmuteViewer
            ) {

                return;
            }


            onUnmuteViewer(
                viewerId,
            );


            setActiveViewerId(
                null,
            );

        };


    // ========================================================
    // HANDLE KICK
    // ========================================================

    const handleKick =
        (viewer) => {

            const viewerId =
                getViewerId(
                    viewer,
                );


            if (
                !viewerId ||
                !onKickViewer
            ) {

                return;
            }


            onKickViewer(
                viewerId,
            );


            setActiveViewerId(
                null,
            );

        };


    // ========================================================
    // HANDLE BLOCK
    // ========================================================

    const handleBlock =
        (viewer) => {

            if (
                !isBroadcaster
            ) {

                return;
            }


            const viewerId =
                getViewerId(
                    viewer,
                );


            if (
                !viewerId ||
                !onBlockViewer
            ) {

                return;
            }


            onBlockViewer(
                viewerId,
            );


            setActiveViewerId(
                null,
            );

        };


    // ========================================================
    // HANDLE ASSIGN LIVE ADMIN
    // ========================================================

    const handleAssignModerator =
        (viewer) => {

            if (
                !isBroadcaster
            ) {

                return;
            }


            const viewerId =
                getViewerId(
                    viewer,
                );


            if (
                !viewerId ||
                !onAssignModerator
            ) {

                return;
            }


            onAssignModerator(
                viewerId,
            );


            setActiveViewerId(
                null,
            );

        };


    // ========================================================
    // HANDLE REMOVE LIVE ADMIN
    // ========================================================

    const handleRemoveModerator =
        (viewer) => {

            if (
                !isBroadcaster
            ) {

                return;
            }


            const viewerId =
                getViewerId(
                    viewer,
                );


            if (
                !viewerId ||
                !onRemoveModerator
            ) {

                return;
            }


            onRemoveModerator(
                viewerId,
            );


            setActiveViewerId(
                null,
            );

        };


    // ========================================================
    // EMPTY VIEWER LIST
    // ========================================================

    if (
        !viewers.length
    ) {

        return (

            <div className="live-viewer-list">

                <div className="live-viewer-header">

                    <h3>
                        Viewers
                    </h3>

                    <span>
                        {viewerCount || 0}
                    </span>

                </div>


                <div className="live-viewer-empty">

                    <span>
                        👀
                    </span>

                    <p>
                        No viewers yet
                    </p>

                </div>

            </div>

        );

    }


    // ========================================================
    // VIEWER LIST
    // ========================================================

    return (

        <div className="live-viewer-list">

            {/* VIEWER HEADER */}

            <div className="live-viewer-header">

                <h3>
                    Viewers
                </h3>

                <span>
                    {viewerCount || viewers.length}
                </span>

            </div>


            {/* VIEWER ITEMS */}

            <div className="live-viewer-items">

                {viewers.map(
                    (viewer) => {

                        const viewerId =
                            getViewerId(
                                viewer,
                            );


                        const viewerName =
                            getViewerName(
                                viewer,
                            );


                        const username =
                            getUsername(
                                viewer,
                            );


                        const avatar =
                            getViewerAvatar(
                                viewer,
                            );


                        const muted =
                            isViewerMuted(
                                viewer,
                            );


                        const liveAdmin =
                            isLiveAdmin(
                                viewer,
                            );


                        const isActive =
                            String(
                                activeViewerId,
                            ) ===
                            String(
                                viewerId,
                            );


                        const isCurrentBroadcaster =
                            isBroadcaster &&
                            viewer?.is_broadcaster === true;


                        const canManageThisViewer =
                            canModerateViewer() &&
                            !isCurrentBroadcaster &&
                            viewerId !== null;


                        return (

                            <div
                                key={viewerId}
                                className="live-viewer-item"
                                ref={
                                    isActive
                                        ? menuRef
                                        : null
                                }
                            >

                                {/* VIEWER PROFILE */}

                                <button
                                    type="button"
                                    className="live-viewer-profile"
                                    onClick={() =>
                                        handleViewerClick(
                                            viewer,
                                        )
                                    }
                                >

                                    {/* DP */}

                                    <div className="live-viewer-avatar">

                                        {avatar ? (

                                            <img
                                                src={avatar}
                                                alt={
                                                    viewerName
                                                }
                                            />

                                        ) : (

                                            <span>
                                                {viewerName
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </span>

                                        )}

                                    </div>


                                    {/* NAME */}

                                    <div className="live-viewer-info">

                                        <strong>
                                            {viewerName}
                                        </strong>


                                        {username && (

                                            <span>
                                                {username}
                                            </span>

                                        )}


                                        {liveAdmin && (

                                            <small>
                                                👑 Live Admin
                                            </small>

                                        )}

                                    </div>

                                </button>


                                {/* MODERATION MENU */}

                                {isActive &&
                                    canManageThisViewer && (

                                    <div className="live-viewer-menu">

                                        {/* MUTE / UNMUTE */}

                                        {muted ? (

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleUnmute(
                                                        viewer,
                                                    )
                                                }
                                                disabled={
                                                    !onUnmuteViewer
                                                }
                                            >
                                                🔊 Unmute
                                            </button>

                                        ) : (

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleMute(
                                                        viewer,
                                                    )
                                                }
                                                disabled={
                                                    !onMuteViewer
                                                }
                                            >
                                                🔇 Mute
                                            </button>

                                        )}


                                        {/* KICK */}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleKick(
                                                    viewer,
                                                )
                                            }
                                            disabled={
                                                !onKickViewer
                                            }
                                        >
                                            🚫 Kick
                                        </button>


                                        {/* BLOCK */}

                                        {isBroadcaster && (

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleBlock(
                                                        viewer,
                                                    )
                                                }
                                                disabled={
                                                    !onBlockViewer
                                                }
                                            >
                                                🚷 Block
                                            </button>

                                        )}


                                        {/* LIVE ADMIN */}

                                        {isBroadcaster && (

                                            liveAdmin ? (

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveModerator(
                                                            viewer,
                                                        )
                                                    }
                                                    disabled={
                                                        !onRemoveModerator
                                                    }
                                                >
                                                    👑 De-assign Live Admin
                                                </button>

                                            ) : (

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleAssignModerator(
                                                            viewer,
                                                        )
                                                    }
                                                    disabled={
                                                        !onAssignModerator
                                                    }
                                                >
                                                    👑 Assign Live Admin
                                                </button>

                                            )

                                        )}

                                    </div>

                                )}

                            </div>

                        );

                    },
                )}

            </div>

        </div>

    );

};


export default LiveViewerList;