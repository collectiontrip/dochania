import React from "react";

import "./LiveControls.css";

// ============================================================
// LIVE CONTROLS
// ============================================================

const LiveControls = ({
    isLive = false,
    isBroadcaster = false,
    isJoined = false,
    loading = false,
    onGoLive = null,
    onJoinLive = null,
    onLeaveLive = null,
    onEndLive = null,
}) => {

    // ========================================================
    // BROADCASTER CONTROLS
    // ========================================================

    if (isBroadcaster) {

        return (
            <div className="live-controls">

                {!isLive ? (

                    <button
                        type="button"
                        onClick={onGoLive}
                        disabled={
                            loading ||
                            !onGoLive
                        }
                    >
                        {loading
                            ? "Starting..."
                            : "🔴 Go Live"}
                    </button>

                ) : (

                    <button
                        type="button"
                        onClick={onEndLive}
                        disabled={
                            !onEndLive
                        }
                    >
                        🛑 End Live
                    </button>

                )}

            </div>
        );
    }


    // ========================================================
    // VIEWER CONTROLS
    // ========================================================

    if (!isJoined) {

        return (
            <div className="live-controls">

                <button
                    type="button"
                    onClick={onJoinLive}
                    disabled={
                        loading ||
                        !onJoinLive
                    }
                >
                    {loading
                        ? "Joining..."
                        : "▶ Join Live"}
                </button>

            </div>
        );
    }


    // ========================================================
    // JOINED VIEWER
    // ========================================================

    return (
        <div className="live-controls">

            <button
                type="button"
                onClick={onLeaveLive}
                disabled={
                    !onLeaveLive
                }
            >
                Leave Live
            </button>

        </div>
    );
};


export default LiveControls;
