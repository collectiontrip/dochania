import React, {
    useEffect,
    useState,
} from "react";


import {
    useNavigate,
} from "react-router-dom";


import liveService from "../../services/liveService";


import "./LiveStreams.css";



const LiveStreams = () => {

    const navigate = useNavigate();


    const [streams, setStreams] =
        useState([]);


    const [loading, setLoading] =
        useState(true);


    const [error, setError] =
        useState("");



    // ============================================================
    // LOAD LIVE STREAMS
    // ============================================================

    useEffect(() => {

        let isMounted = true;


        const loadLiveStreams = async () => {

            try {

                setLoading(true);

                setError("");


                const response =
                    await liveService.getLiveStreams();


                if (!isMounted) {
                    return;
                }


                const data =
                    response?.data;


                if (Array.isArray(data)) {

                    setStreams(data);

                } else if (
                    Array.isArray(data?.results)
                ) {

                    setStreams(data.results);

                } else {

                    setStreams([]);

                }

            } catch (err) {

                console.error(
                    "Unable to load live streams:",
                    err,
                );


                if (!isMounted) {
                    return;
                }


                setError(
                    err?.response?.data?.detail ||
                    "Unable to load live streams.",
                );

            } finally {

                if (isMounted) {

                    setLoading(false);

                }

            }

        };


        loadLiveStreams();


        return () => {

            isMounted = false;

        };

    }, []);



    // ============================================================
    // OPEN LIVE STREAM
    // ============================================================

    const handleOpenStream = (
        sessionId,
    ) => {

        if (!sessionId) {
            return;
        }


        navigate(
            `/live/${sessionId}`,
        );

    };



    // ============================================================
    // IMAGE ERROR HANDLER
    // ============================================================

    const handleImageError = (
        event,
    ) => {

        if (
            event.currentTarget.src.endsWith(
                "/default-avatar.png",
            )
        ) {
            return;
        }


        event.currentTarget.onerror =
            null;


        event.currentTarget.src =
            "/default-avatar.png";

    };



    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="live-streams">

                <div className="live-streams-header">

                    <div>

                        <span className="live-streams-badge">

                            ● LIVE NOW

                        </span>


                        <h1>

                            Watch Live

                        </h1>


                        <p>

                            Finding live streams...

                        </p>

                    </div>

                </div>


                <div className="live-streams-loading">

                    <div className="live-streams-spinner" />

                    <span>

                        Loading live streams...

                    </span>

                </div>

            </div>

        );

    }



    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (

            <div className="live-streams">

                <div className="live-streams-header">

                    <div>

                        <span className="live-streams-badge">

                            ● LIVE NOW

                        </span>


                        <h1>

                            Watch Live

                        </h1>

                    </div>

                </div>


                <div className="live-streams-error">

                    <div className="live-streams-error-icon">

                        ⚠️

                    </div>


                    <h2>

                        Unable to load live streams

                    </h2>


                    <p>

                        {error}

                    </p>


                    <button
                        type="button"
                        onClick={() =>
                            window.location.reload()
                        }
                    >

                        Try Again

                    </button>

                </div>

            </div>

        );

    }



    // ============================================================
    // EMPTY STATE
    // ============================================================

    if (streams.length === 0) {

        return (

            <div className="live-streams">

                <div className="live-streams-header">

                    <div>

                        <span className="live-streams-badge">

                            ● LIVE NOW

                        </span>


                        <h1>

                            Watch Live

                        </h1>


                        <p>

                            Discover people who are live
                            right now.

                        </p>

                    </div>

                </div>


                <div className="live-streams-empty">

                    <div className="live-streams-empty-icon">

                        📺

                    </div>


                    <h2>

                        No one is live right now

                    </h2>


                    <p>

                        Check back later to watch a
                        live stream.

                    </p>


                    <button
                        type="button"
                        onClick={() =>
                            navigate("/live")
                        }
                    >

                        Go Live

                    </button>

                </div>

            </div>

        );

    }



    // ============================================================
    // LIVE STREAM LIST
    // ============================================================

    return (

        <div className="live-streams">

            {/* ================================================== */}
            {/* HEADER */}
            {/* ================================================== */}

            <div className="live-streams-header">

                <div>

                    <span className="live-streams-badge">

                        ● LIVE NOW

                    </span>


                    <h1>

                        Watch Live

                    </h1>


                    <p>

                        Discover live streams happening
                        right now.

                    </p>

                </div>


                <div className="live-streams-count">

                    {streams.length}


                    <span>

                        {streams.length === 1
                            ? " stream"
                            : " streams"}

                    </span>

                </div>

            </div>



            {/* ================================================== */}
            {/* STREAM GRID */}
            {/* ================================================== */}

            <div className="live-streams-grid">

                {streams.map((stream) => {

                    const sessionId =
                        stream?.id;


                    const streamer =
                        stream?.streamer_info ||
                        {};


                    const streamerName =
                        stream?.streamer_name ||
                        streamer?.username ||
                        "Unknown streamer";


                    const fullName =
                        streamer?.full_name ||
                        streamerName;


                    const profileImage =
                        streamer?.profile_picture ||
                        "/default-avatar.png";


                    const isVerified =
                        Boolean(
                            streamer?.is_verified,
                        );


                    const title =
                        stream?.title?.trim() ||
                        "Live Stream";


                    const viewersCount =
                        Number(
                            stream?.viewers_count || 0,
                        );


                    return (

                        <article
                            key={sessionId}
                            className="live-stream-card"
                            onClick={() =>
                                handleOpenStream(
                                    sessionId,
                                )
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {

                                if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                ) {

                                    event.preventDefault();

                                    handleOpenStream(
                                        sessionId,
                                    );

                                }

                            }}
                        >

                            {/* ================================== */}
                            {/* LIVE PREVIEW */}
                            {/* ================================== */}

                            <div className="live-stream-preview">

                                <img
                                    src={profileImage}
                                    alt={`${streamerName} profile`}
                                    className="live-stream-preview-image"
                                    onError={
                                        handleImageError
                                    }
                                />


                                <div className="live-stream-preview-overlay" />


                                {/* LIVE BADGE */}

                                <div className="live-stream-live-label">

                                    <span>
                                        ●
                                    </span>

                                    LIVE

                                </div>


                                {/* VIEWER COUNT */}

                                <div className="live-stream-viewers">

                                    <span>
                                        👁️
                                    </span>

                                    {viewersCount}

                                </div>


                                {/* PLAY INDICATOR */}

                                <div className="live-stream-play">

                                    ▶

                                </div>

                            </div>



                            {/* ================================== */}
                            {/* STREAM INFORMATION */}
                            {/* ================================== */}

                            <div className="live-stream-info">

                                {/* STREAMER AVATAR */}

                                <div className="live-stream-avatar-wrapper">

                                    <img
                                        src={profileImage}
                                        alt={`${streamerName} avatar`}
                                        className="live-stream-avatar"
                                        onError={
                                            handleImageError
                                        }
                                    />

                                </div>



                                {/* DETAILS */}

                                <div className="live-stream-details">

                                    <h2
                                        title={title}
                                    >

                                        {title}

                                    </h2>


                                    <p>

                                        @{streamerName}


                                        {isVerified && (

                                            <span
                                                className="live-stream-verified"
                                                title="Verified"
                                            >

                                                ✓

                                            </span>

                                        )}

                                    </p>


                                    {fullName !==
                                        streamerName && (

                                        <span className="live-stream-full-name">

                                            {fullName}

                                        </span>

                                    )}


                                    <span className="live-stream-viewer-text">

                                        {viewersCount}{" "}

                                        {viewersCount === 1
                                            ? "viewer"
                                            : "viewers"}

                                    </span>

                                </div>

                            </div>

                        </article>

                    );

                })}

            </div>

        </div>

    );

};



export default LiveStreams;