import React from "react";

import "./LiveHeader.css";

// ============================================================
// LIVE HEADER
// ============================================================

const LiveHeader = ({
    isLive = false,
    title = "Live Stream",
    viewerCount = 0,
    sessionId = null,
    isBroadcaster = false,
}) => {

    return (

        <div className="live-header">

            {/* LIVE TITLE */}

            <div className="live-header-title">

                <h2>
                    {title}
                </h2>

                {isLive && (
                    <span className="live-status">
                        🔴 LIVE
                    </span>
                )}

            </div>


            {/* LIVE INFORMATION */}

            {isLive && (

                <div className="live-header-info">

                    {/* VIEWER COUNT */}

                    <span className="live-viewer-count">
                        👀 {viewerCount}{" "}
                        {viewerCount === 1
                            ? "Viewer"
                            : "Viewers"}
                    </span>


                    {/* SESSION ID */}

                    {isBroadcaster &&
                        sessionId && (

                            <span className="live-session-id">
                                Session: {sessionId}
                            </span>

                        )}

                </div>

            )}

        </div>
    );
};


export default LiveHeader;
