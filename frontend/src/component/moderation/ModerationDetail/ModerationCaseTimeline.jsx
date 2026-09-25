import "./ModerationCaseTimeline.css";


const ModerationCaseTimeLine = ({
    events = [],
}) => {

    // ============================================================
    // HELPERS
    // ============================================================

    const formatValue = (value) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Not available";
        }

        return String(value)
            .replaceAll("_", " ")
            .replace(/\b\w/g, (character) =>
                character.toUpperCase()
            );
    };


    const formatDate = (value) => {

        if (!value) {
            return "Unknown time";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown time";
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    };


    // ============================================================
    // EMPTY STATE
    // ============================================================

    if (
        !Array.isArray(events) ||
        events.length === 0
    ) {
        return (
            <section className="moderation-case-timeline">

                <div className="moderation-case-timeline__header">

                    <div>

                        <p className="moderation-case-timeline__eyebrow">
                            Case Activity
                        </p>

                        <h2 className="moderation-case-timeline__title">
                            Timeline
                        </h2>

                    </div>

                </div>


                <div className="moderation-case-timeline__empty">

                    <span className="moderation-case-timeline__empty-icon">
                        ○
                    </span>

                    <p>
                        No timeline activity yet.
                    </p>

                </div>

            </section>
        );
    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section className="moderation-case-timeline">

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="moderation-case-timeline__header">

                <div>

                    <p className="moderation-case-timeline__eyebrow">
                        Case Activity
                    </p>

                    <h2 className="moderation-case-timeline__title">
                        Timeline
                    </h2>

                </div>


                <span className="moderation-case-timeline__count">

                    {events.length}{" "}

                    {events.length === 1
                        ? "Event"
                        : "Events"
                    }

                </span>

            </div>


            {/* ====================================================
                TIMELINE
            ==================================================== */}

            <div className="moderation-case-timeline__list">

                {events.map((event, index) => {

                    if (
                        !event ||
                        typeof event !== "object"
                    ) {
                        return null;
                    }


                    // ====================================================
                    // EXACT MODERATION ACTION LOG FIELDS
                    // ====================================================

                    const actionTaken =
                        event.action_taken;

                    const oldDecision =
                        event.old_decision;

                    const newDecision =
                        event.new_decision;

                    const actionReason =
                        event.action_reason;

                    const note =
                        event.note;

                    const createdAt =
                        event.created_at;

                    const moderator =
                        event.moderator;

                    const moderatorName =
                        moderator?.username ||
                        "System";

                    const restrictionExpiresAt =
                        event.restriction_expires_at;

                    const suspensionExpiresAt =
                        event.suspension_expires_at;

                    const isPermanent =
                        event.is_permanent;

                    const isLast =
                        index === events.length - 1;


                    return (

                        <div
                            key={
                                event.id ||
                                `timeline-event-${index}`
                            }

                            className={
                                `moderation-case-timeline__item ` +
                                `${isLast
                                    ? "moderation-case-timeline__item--last"
                                    : ""
                                }`
                            }
                        >

                            {/* ====================================================
                                TIMELINE RAIL
                            ==================================================== */}

                            <div className="moderation-case-timeline__rail">

                                <span className="moderation-case-timeline__dot">
                                </span>

                            </div>


                            {/* ====================================================
                                EVENT CONTENT
                            ==================================================== */}

                            <div className="moderation-case-timeline__content">

                                <div className="moderation-case-timeline__event-header">

                                    <div>

                                        <span className="moderation-case-timeline__event-label">
                                            Action
                                        </span>

                                        <h3 className="moderation-case-timeline__event-title">
                                            {formatValue(
                                                actionTaken
                                            )}
                                        </h3>

                                    </div>


                                    <time className="moderation-case-timeline__date">

                                        {formatDate(
                                            createdAt
                                        )}

                                    </time>

                                </div>


                                {/* ====================================================
                                    DECISION CHANGE
                                ==================================================== */}

                                {(oldDecision || newDecision) && (

                                    <div className="moderation-case-timeline__decision">

                                        <div className="moderation-case-timeline__decision-item">

                                            <span>
                                                Previous
                                            </span>

                                            <strong>
                                                {formatValue(
                                                    oldDecision
                                                )}
                                            </strong>

                                        </div>


                                        <span className="moderation-case-timeline__decision-arrow">
                                            →
                                        </span>


                                        <div className="moderation-case-timeline__decision-item">

                                            <span>
                                                New
                                            </span>

                                            <strong>
                                                {formatValue(
                                                    newDecision
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                )}


                                {/* ====================================================
                                    ACTION REASON
                                ==================================================== */}

                                {actionReason && (

                                    <div className="moderation-case-timeline__description">

                                        <span className="moderation-case-timeline__description-label">
                                            Action Reason
                                        </span>

                                        <p>
                                            {actionReason}
                                        </p>

                                    </div>

                                )}


                                {/* ====================================================
                                    MODERATOR NOTE
                                ==================================================== */}

                                {note && (

                                    <div className="moderation-case-timeline__description">

                                        <span className="moderation-case-timeline__description-label">
                                            Moderator Note
                                        </span>

                                        <p>
                                            {note}
                                        </p>

                                    </div>

                                )}


                                {/* ====================================================
                                    ACTOR
                                ==================================================== */}

                                <div className="moderation-case-timeline__actor">

                                    <span>
                                        By
                                    </span>

                                    <strong>
                                        {moderatorName}
                                    </strong>

                                </div>


                                {/* ====================================================
                                    ADDITIONAL ACTION DETAILS
                                ==================================================== */}

                                {(restrictionExpiresAt ||
                                    suspensionExpiresAt ||
                                    isPermanent) && (

                                    <div className="moderation-case-timeline__details">

                                        {restrictionExpiresAt && (

                                            <div className="moderation-case-timeline__detail">

                                                <span>
                                                    Restriction Expires
                                                </span>

                                                <strong>
                                                    {formatDate(
                                                        restrictionExpiresAt
                                                    )}
                                                </strong>

                                            </div>

                                        )}


                                        {suspensionExpiresAt && (

                                            <div className="moderation-case-timeline__detail">

                                                <span>
                                                    Suspension Expires
                                                </span>

                                                <strong>
                                                    {formatDate(
                                                        suspensionExpiresAt
                                                    )}
                                                </strong>

                                            </div>

                                        )}


                                        {isPermanent && (

                                            <div className="moderation-case-timeline__permanent">

                                                Permanent Action

                                            </div>

                                        )}

                                    </div>

                                )}

                            </div>

                        </div>

                    );
                })}

            </div>

        </section>
    );
};


export default ModerationCaseTimeLine;
