import React from "react";

import "./LiveActionModal.css";
// LIVE VIDEO

const LiveVideo = ({
    isLive = false,
    isBroadcaster = false,
    localVideoRef = null,
    remoteVideoRef = null,
    stream = null,
    remoteStream = null,
}) => {

    // NO LIVE STREAM

    if (!isLive) {

        return (

            <div className="live-video-container">

                <div className="live-video-placeholder">

                    <span>
                        🔴
                    </span>

                    <p>
                        Live stream is not active
                    </p>

                </div>

            </div>
        );
    }

    // BROADCASTER VIDEO

    if (isBroadcaster) {

        return (
            <div className="live-video-container">

                <video 
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="live-video"
                />

                {!stream && (
                    <div className="live-video-placeholder">

                        <span>
                            🎥
                        </span>

                        <p>
                            Starting camera ...
                        </p>

                    </div>
                )}

            </div>
        );
    }

    // VIEWER VIDEO

    return (
        <div className="live-video-container">

            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="live-video"
            />

            {!remoteStream && (
                <div className="live-video-placeholder">

                    <span>
                        📺
                    </span>

                    <p>
                        Connecting to live stream... 
                    </p>

                </div>
            )}

        </div>
    );
};

export default LiveVideo;