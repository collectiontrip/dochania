import "./ModerationUserHistory.css";


const ModerationUserHistory = ({
    user,
    history = [],
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
            return "Unknown date";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown date";
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    };


    // ============================================================
    // USER DATA
    // ============================================================

    const username =
        user?.username ||
        "Unknown User";

    const userId =
        user?.id ||
        null;


    // ============================================================
    // HISTORY
    // ============================================================

    const hasHistory =
        Array.isArray(history) &&
        history.length > 0;


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section className="moderation-user-history">

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div className="moderation-user-history__header">

                <div>

                    <p className="moderation-user-history__eyebrow">
                        Moderation Record
                    </p>

                    <h2 className="moderation-user-history__title">
                        User History
                    </h2>

                </div>

                {hasHistory && (
                    <span className="moderation-user-history__count">

                        {history.length}{" "}

                        {history.length === 1
                            ? "Record"
                            : "Records"
                        }

                    </span>
                )}

            </div>


            {/* ====================================================
                USER SUMMARY
            ==================================================== */}

            <div className="moderation-user-history__user">

                <div className="moderation-user-history__avatar">

                    {username
                        .charAt(0)
                        .toUpperCase()
                    }

                </div>


                <div className="moderation-user-history__user-info">

                    <strong className="moderation-user-history__username">
                        {username}
                    </strong>


                    {userId && (
                        <span className="moderation-user-history__id">
                            User ID: {userId}
                        </span>
                    )}

                </div>

            </div>


            {/* ====================================================
                HISTORY
            ==================================================== */}

            {!hasHistory ? (

                <div className="moderation-user-history__empty">

                    <div className="moderation-user-history__empty-icon">
                        ✓
                    </div>


                    <div>

                        <h3>
                            No previous moderation history
                        </h3>

                        <p>
                            No previous moderation actions were found
                            for this user.
                        </p>

                    </div>

                </div>

            ) : (

                <div className="moderation-user-history__list">

                    {history.map((record, index) => {

                        if (
                            !record ||
                            typeof record !== "object"
                        ) {
                            return null;
                        }


                        // ====================================================
                        // EXACT MODERATION ACTION LOG FIELDS
                        // ====================================================

                        const actionTaken =
                            record.action_taken;

                        const oldDecision =
                            record.old_decision;

                        const newDecision =
                            record.new_decision;

                        const actionReason =
                            record.action_reason;

                        const note =
                            record.note;

                        const createdAt =
                            record.created_at;

                        const moderator =
                            record.moderator;

                        const moderatorName =
                            moderator?.username ||
                            "System";

                        const restrictionExpiresAt =
                            record.restriction_expires_at;

                        const suspensionExpiresAt =
                            record.suspension_expires_at;

                        const isPermanent =
                            record.is_permanent;


                        return (

                            <article
                                key={
                                    record.id ||
                                    `moderation-record-${index}`
                                }
                                className="moderation-user-history__record"
                            >

                                {/* ====================================================
                                    RECORD HEADER
                                ==================================================== */}

                                <div className="moderation-user-history__record-header">

                                    <div>

                                        <span className="moderation-user-history__record-label">
                                            Action
                                        </span>

                                        <h3 className="moderation-user-history__action">
                                            {formatValue(
                                                actionTaken
                                            )}
                                        </h3>

                                    </div>


                                    {newDecision && (
                                        <span className="moderation-user-history__status">
                                            {formatValue(
                                                newDecision
                                            )}
                                        </span>
                                    )}

                                </div>


                                {/* ====================================================
                                    RECORD META
                                ==================================================== */}

                                <div className="moderation-user-history__meta">

                                    <div className="moderation-user-history__meta-item">

                                        <span>
                                            Moderator
                                        </span>

                                        <strong>
                                            {moderatorName}
                                        </strong>

                                    </div>


                                    <div className="moderation-user-history__meta-item">

                                        <span>
                                            Date
                                        </span>

                                        <strong>
                                            {formatDate(
                                                createdAt
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                {/* ====================================================
                                    DECISION CHANGE
                                ==================================================== */}

                                {(oldDecision || newDecision) && (

                                    <div className="moderation-user-history__decision">

                                        <div className="moderation-user-history__decision-item">

                                            <span>
                                                Previous Decision
                                            </span>

                                            <strong>
                                                {formatValue(
                                                    oldDecision
                                                )}
                                            </strong>

                                        </div>


                                        <div className="moderation-user-history__decision-arrow">
                                            →
                                        </div>


                                        <div className="moderation-user-history__decision-item">

                                            <span>
                                                New Decision
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

                                    <div className="moderation-user-history__note">

                                        <span>
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

                                    <div className="moderation-user-history__note">

                                        <span>
                                            Moderator Note
                                        </span>

                                        <p>
                                            {note}
                                        </p>

                                    </div>

                                )}


                                {/* ====================================================
                                    RESTRICTION EXPIRY
                                ==================================================== */}

                                {restrictionExpiresAt && (

                                    <div className="moderation-user-history__meta">

                                        <div className="moderation-user-history__meta-item">

                                            <span>
                                                Restriction Expires
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    restrictionExpiresAt
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                )}


                                {/* ====================================================
                                    SUSPENSION EXPIRY
                                ==================================================== */}

                                {suspensionExpiresAt && (

                                    <div className="moderation-user-history__meta">

                                        <div className="moderation-user-history__meta-item">

                                            <span>
                                                Suspension Expires
                                            </span>

                                            <strong>
                                                {formatDate(
                                                    suspensionExpiresAt
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                )}


                                {/* ====================================================
                                    PERMANENT ACTION
                                ==================================================== */}

                                {isPermanent && (

                                    <div className="moderation-user-history__permanent">

                                        Permanent Action

                                    </div>

                                )}

                            </article>

                        );

                    })}

                </div>

            )}

        </section>

    );
};


export default ModerationUserHistory;
