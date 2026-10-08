import React, {
    useState,
} from "react";

import "./LiveModeratorList.css";


// ============================================================
// LIVE MODERATOR LIST
// ============================================================

const LiveModeratorList = ({
    moderators = [],

    isBroadcaster = false,

    onModeratorClick = null,
}) => {

    const [
        activeModeratorId,
        setActiveModeratorId,
    ] = useState(null);


    // GET MODERATOR ID

    const getModeratorId = (
        moderator,
    ) => {

        return (
            moderator?.user_info?.id ??
            moderator?.user_id ??
            moderator?.user?.id ??
            null
        );

    };


    // GET MODERATOR NAME

    const getModeratorName = (
        moderator,
    ) => {

        return (
            moderator?.user_info?.full_name ||
            moderator?.user_info?.username ||
            moderator?.user_name ||
            "Live Admin"
        );

    };


    // GET MODERATOR USERNAME

    const getUsername = (
        moderator,
    ) => {

        return (
            moderator?.user_info?.username ||
            moderator?.user_name ||
            ""
        );

    };


    // GET PROFILE PICTURE

    const getProfilePicture = (
        moderator,
    ) => {

        return (
            moderator?.user_info?.profile_picture ||
            null
        );

    };


    // GET MODERATOR ROLE

    const getRole = (
        moderator,
    ) => {

        return (
            moderator?.role ||
            "Live Admin"
        );

    };


    // GET ONLINE STATUS

    const isOnline = (
        moderator,
    ) => {

        return (
            moderator?.user_info?.is_online === true
        );

    };


    // GET VERIFIED STATUS

    const isVerified = (
        moderator,
    ) => {

        return (
            moderator?.user_info?.is_verified === true
        );

    };


    // GET ACTIVE STATUS

    const isModeratorActive = (
        moderator,
    ) => {

        return (
            moderator?.is_active !== false
        );

    };


    // HANDLE MODERATOR CLICK

    const handleModeratorClick = (
        moderator,
    ) => {

        if (
            !isBroadcaster
        ) {

            return;
        }


        const moderatorId =
            getModeratorId(
                moderator,
            );


        if (
            !moderatorId
        ) {

            return;
        }


        setActiveModeratorId(
            currentId =>
                String(
                    currentId,
                ) ===
                String(
                    moderatorId,
                )
                    ? null
                    : moderatorId,
        );


        if (
            onModeratorClick
        ) {

            onModeratorClick(
                moderator,
            );

        }

    };


    // HIDE MODERATOR LIST FROM NON-BROADCASTER

    if (
        !isBroadcaster
    ) {

        return null;

    }


    // EMPTY MODERATOR LIST

    if (
        !moderators.length
    ) {

        return (

            <div className="live-moderator-list">

                <div className="live-moderator-header">

                    <h3>
                        Live Admins
                    </h3>

                    <span>
                        0
                    </span>

                </div>


                <div className="live-moderator-empty">

                    <span>
                        🛡️
                    </span>

                    <p>
                        No live admins active
                    </p>

                </div>

            </div>

        );

    }


    // MODERATOR LIST

    return (

        <div className="live-moderator-list">

            {/* MODERATOR HEADER */}

            <div className="live-moderator-header">

                <div>

                    <h3>
                        Live Admins
                    </h3>

                    <span>
                        Currently active in this live
                    </span>

                </div>

                <strong>
                    {moderators.length}
                </strong>

            </div>


            {/* MODERATOR ITEMS */}

            <div className="live-moderator-items">

                {moderators.map(
                    (
                        moderator,
                    ) => {

                        const moderatorId =
                            getModeratorId(
                                moderator,
                            );

                        const moderatorName =
                            getModeratorName(
                                moderator,
                            );

                        const username =
                            getUsername(
                                moderator,
                            );

                        const profilePicture =
                            getProfilePicture(
                                moderator,
                            );

                        const role =
                            getRole(
                                moderator,
                            );

                        const online =
                            isOnline(
                                moderator,
                            );

                        const verified =
                            isVerified(
                                moderator,
                            );

                        const active =
                            isModeratorActive(
                                moderator,
                            );

                        const selected =
                            String(
                                activeModeratorId,
                            ) ===
                            String(
                                moderatorId,
                            );


                        return (

                            <button
                                key={
                                    moderatorId
                                }
                                type="button"
                                className={
                                    selected
                                        ? "live-moderator-item live-moderator-item-active"
                                        : "live-moderator-item"
                                }
                                onClick={() =>
                                    handleModeratorClick(
                                        moderator,
                                    )
                                }
                            >

                                {/* PROFILE PICTURE */}

                                <div className="live-moderator-avatar">

                                    {profilePicture ? (

                                        <img
                                            src={
                                                profilePicture
                                            }
                                            alt={
                                                moderatorName
                                            }
                                        />

                                    ) : (

                                        <span>
                                            {moderatorName
                                                .charAt(
                                                    0,
                                                )
                                                .toUpperCase()}
                                        </span>

                                    )}


                                    {/* ONLINE INDICATOR */}

                                    {online && (

                                        <span
                                            className="live-moderator-online"
                                            aria-label="Online"
                                        />

                                    )}

                                </div>


                                {/* MODERATOR INFORMATION */}

                                <div className="live-moderator-info">

                                    <div className="live-moderator-name">

                                        <strong>
                                            {
                                                moderatorName
                                            }
                                        </strong>


                                        {/* VERIFIED */}

                                        {verified && (

                                            <span
                                                className="live-moderator-verified"
                                                aria-label="Verified"
                                            >
                                                ✓
                                            </span>

                                        )}

                                    </div>


                                    {/* USERNAME */}

                                    {username && (

                                        <span className="live-moderator-username">
                                            @{username}
                                        </span>

                                    )}


                                    {/* ROLE */}

                                    <span className="live-moderator-role">
                                        {role}
                                    </span>

                                </div>


                                {/* STATUS */}

                                <div className="live-moderator-status">

                                    {active ? (

                                        <span>
                                            Active
                                        </span>

                                    ) : (

                                        <span>
                                            Inactive
                                        </span>

                                    )}

                                </div>

                            </button>

                        );

                    },
                )}

            </div>

        </div>

    );

};


export default LiveModeratorList;