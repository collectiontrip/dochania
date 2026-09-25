import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import moderationService
    from "./../../../services/moderationService";

import "./ModerationStats.css";


const ModerationStats = () => {


    // ============================================================
    // STATE
    // ============================================================

    const [
        stats,
        setStats,
    ] = useState(null);


    const [
        isLoading,
        setIsLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    // ============================================================
    // REFS
    // ============================================================

    const isMountedRef =
        useRef(true);


    // ============================================================
    // MOUNT / UNMOUNT
    // ============================================================

    useEffect(() => {

        isMountedRef.current =
            true;


        return () => {

            isMountedRef.current =
                false;

        };

    }, []);


    // ============================================================
    // FETCH STATS
    // ============================================================

    const fetchStats = useCallback(
        async () => {

            if (
                !isMountedRef.current
            ) {

                return;

            }


            setIsLoading(
                true,
            );


            setError("");


            try {

                const data =
                    await moderationService.getStats();


                // ------------------------------------------------
                // VALIDATE RESPONSE
                // ------------------------------------------------

                if (

                    !data

                    ||

                    typeof data !==
                    "object"

                    ||

                    Array.isArray(
                        data,
                    )

                ) {

                    throw new Error(
                        "Invalid moderation statistics response.",
                    );

                }


                // ------------------------------------------------
                // UPDATE STATE
                // ------------------------------------------------

                if (
                    isMountedRef.current
                ) {

                    setStats(
                        data,
                    );

                }

            } catch (err) {

                console.error(
                    "Failed to fetch moderation statistics:",
                    err,
                );


                if (
                    !isMountedRef.current
                ) {

                    return;

                }


                setStats(
                    null,
                );


                let errorMessage =

                    err?.response?.data?.detail

                    ||

                    err?.response?.data?.message

                    ||

                    err?.message

                    ||

                    "Unable to load moderation statistics.";


                // ------------------------------------------------
                // HANDLE OBJECT ERROR RESPONSE
                // ------------------------------------------------

                if (
                    typeof errorMessage ===
                    "object"

                    &&

                    errorMessage !==
                    null
                ) {

                    errorMessage =
                        Object.entries(
                            errorMessage,
                        )
                            .map(
                                (
                                    [
                                        field,
                                        messages,
                                    ],
                                ) => {

                                    const values =
                                        Array.isArray(
                                            messages,
                                        )

                                            ? messages

                                            : [
                                                messages,
                                            ];


                                    return (
                                        `${field}: ${values.join(", ")}`
                                    );

                                },
                            )
                            .join(
                                " | ",
                            );

                }


                setError(
                    errorMessage,
                );

            } finally {

                if (
                    isMountedRef.current
                ) {

                    setIsLoading(
                        false,
                    );

                }

            }

        },
        [],
    );


    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {

        fetchStats();

    }, [

        fetchStats,

    ]);


    // ============================================================
    // NORMALIZE STATS
    // ============================================================

    const normalizedStats =
        useMemo(
            () => {

                const getNumber = (
                    value,
                ) => {

                    const number =
                        Number(
                            value,
                        );


                    return Number.isFinite(
                        number,
                    )

                        ? number

                        : 0;

                };


                return {

                    // ------------------------------------------------
                    // EXACT BACKEND FIELD: total
                    // ------------------------------------------------

                    total:
                        getNumber(
                            stats?.total,
                        ),


                    // ------------------------------------------------
                    // EXACT BACKEND FIELD: pending
                    // ------------------------------------------------

                    pending:
                        getNumber(
                            stats?.pending,
                        ),


                    // ------------------------------------------------
                    // EXACT BACKEND FIELD: in_progress
                    // ------------------------------------------------

                    inProgress:
                        getNumber(
                            stats?.in_progress,
                        ),


                    // ------------------------------------------------
                    // EXACT BACKEND FIELD: resolved
                    // ------------------------------------------------

                    resolved:
                        getNumber(
                            stats?.resolved,
                        ),


                    // ------------------------------------------------
                    // EXACT BACKEND FIELD: assigned
                    // ------------------------------------------------

                    assigned:
                        getNumber(
                            stats?.assigned,
                        ),


                    // ------------------------------------------------
                    // EXACT BACKEND FIELD: unassigned
                    // ------------------------------------------------

                    unassigned:
                        getNumber(
                            stats?.unassigned,
                        ),

                };

            },
            [
                stats,
            ],
        );


    // ============================================================
    // STAT DEFINITIONS
    // ============================================================

    const statItems = useMemo(
        () => [

            {
                key:
                    "total",

                label:
                    "Total Cases",

                value:
                    normalizedStats.total,

                description:
                    "All visible moderation cases",

            },


            {
                key:
                    "pending",

                label:
                    "Pending",

                value:
                    normalizedStats.pending,

                description:
                    "Cases waiting for review",

            },


            {
                key:
                    "in-progress",

                label:
                    "In Progress",

                value:
                    normalizedStats.inProgress,

                description:
                    "Cases currently being reviewed",

            },


            {
                key:
                    "resolved",

                label:
                    "Resolved",

                value:
                    normalizedStats.resolved,

                description:
                    "Cases with a completed review",

            },


            {
                key:
                    "assigned",

                label:
                    "Assigned",

                value:
                    normalizedStats.assigned,

                description:
                    "Cases assigned to a moderator",

            },


            {
                key:
                    "unassigned",

                label:
                    "Unassigned",

                value:
                    normalizedStats.unassigned,

                description:
                    "Cases waiting for assignment",

            },

        ],
        [
            normalizedStats,
        ],
    );


    // ============================================================
    // LOADING STATE
    // ============================================================

    if (
        isLoading
    ) {

        return (

            <section
                className="moderation-stats"
                aria-label="Moderation statistics"
                aria-busy="true"
            >

                <div
                    className="moderation-stats__grid"
                >

                    {
                        statItems.map(
                            (
                                stat,
                            ) => (

                                <article
                                    key={
                                        stat.key
                                    }
                                    className={
                                        `moderation-stat-card moderation-stat-card--${stat.key}`
                                    }
                                    aria-hidden="true"
                                >

                                    <div
                                        className="moderation-stat-card__content"
                                    >

                                        <span
                                            className="moderation-stat-card__label"
                                        >
                                            {
                                                stat.label
                                            }
                                        </span>


                                        <strong
                                            className="moderation-stat-card__value"
                                        >
                                            —
                                        </strong>


                                        <span
                                            className="moderation-stat-card__description"
                                        >
                                            Loading statistics...
                                        </span>

                                    </div>

                                </article>

                            ),
                        )
                    }

                </div>

            </section>

        );

    }


    // ============================================================
    // ERROR STATE
    // ============================================================

    if (
        error
    ) {

        return (

            <section
                className="moderation-stats"
                aria-label="Moderation statistics"
            >

                <div
                    className="moderation-stats__error"
                    role="alert"
                >

                    <p>
                        {
                            error
                        }
                    </p>


                    <button
                        type="button"
                        onClick={
                            fetchStats
                        }
                        disabled={
                            isLoading
                        }
                    >
                        Retry
                    </button>

                </div>

            </section>

        );

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section
            className="moderation-stats"
            aria-label="Moderation statistics"
        >

            <div
                className="moderation-stats__grid"
            >

                {
                    statItems.map(
                        (
                            stat,
                        ) => (

                            <article
                                key={
                                    stat.key
                                }
                                className={
                                    `moderation-stat-card moderation-stat-card--${stat.key}`
                                }
                            >

                                <div
                                    className="moderation-stat-card__content"
                                >

                                    <span
                                        className="moderation-stat-card__label"
                                    >
                                        {
                                            stat.label
                                        }
                                    </span>


                                    <strong
                                        className="moderation-stat-card__value"
                                        aria-label={
                                            `${stat.label}: ${stat.value}`
                                        }
                                    >
                                        {
                                            stat.value
                                        }
                                    </strong>


                                    <span
                                        className="moderation-stat-card__description"
                                    >
                                        {
                                            stat.description
                                        }
                                    </span>

                                </div>

                            </article>

                        ),
                    )
                }

            </div>

        </section>

    );

};


export default ModerationStats;
