import "./ModerationCaseHeader.css";


const ModerationCaseHeader = ({
    moderationCase,
    onBack,
}) => {

    // ============================================================
    // GUARD
    // ============================================================

    if (
        !moderationCase ||
        typeof moderationCase !== "object"
    ) {
        return null;
    }


    // ============================================================
    // DATA
    // ============================================================

    const {
        id,
        priority,
        decision,
        assigned_to,
        started_at,
        resolved_at,
    } = moderationCase;


    // ============================================================
    // HELPERS
    // ============================================================

    const formatLabel = (value) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Not available";
        }

        return String(value)
            .replaceAll("_", " ")
            .replace(
                /\b\w/g,
                (character) => character.toUpperCase()
            );
    };


    const formatDate = (value) => {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    };


    const assignedModerator =
        assigned_to?.username || "Unassigned";


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <header className="moderation-case-header">

            {/* ==================================================
                TOP
            ================================================== */}

            <div className="moderation-case-header__top">

                <button
                    type="button"
                    className="moderation-case-header__back"
                    onClick={onBack}
                >
                    <span aria-hidden="true">
                        ←
                    </span>

                    <span>
                        Back to cases
                    </span>
                </button>

            </div>


            {/* ==================================================
                MAIN
            ================================================== */}

            <div className="moderation-case-header__main">

                {/* ==================================================
                    IDENTITY
                ================================================== */}

                <div className="moderation-case-header__identity">

                    <div className="moderation-case-header__case-label">
                        Moderation Case
                    </div>

                    <h1 className="moderation-case-header__title">
                        Case #{id}
                    </h1>

                </div>


                {/* ==================================================
                    META
                ================================================== */}

                <div className="moderation-case-header__meta">

                    {/* ==================================================
                        DECISION
                    ================================================== */}

                    <div className="moderation-case-header__badge-group">

                        <span className="moderation-case-header__meta-label">
                            Decision
                        </span>

                        <span
                            className={
                                "moderation-case-header__badge " +
                                `moderation-case-header__badge--decision-${decision || "pending"}`
                            }
                        >
                            {formatLabel(decision || "pending")}
                        </span>

                    </div>


                    {/* ==================================================
                        PRIORITY
                    ================================================== */}

                    <div className="moderation-case-header__badge-group">

                        <span className="moderation-case-header__meta-label">
                            Priority
                        </span>

                        <span
                            className={
                                "moderation-case-header__badge " +
                                `moderation-case-header__badge--priority-${priority || "medium"}`
                            }
                        >
                            {formatLabel(priority || "medium")}
                        </span>

                    </div>


                    {/* ==================================================
                        ASSIGNED MODERATOR
                    ================================================== */}

                    <div className="moderation-case-header__badge-group">

                        <span className="moderation-case-header__meta-label">
                            Assigned To
                        </span>

                        <span className="moderation-case-header__badge">
                            {assignedModerator}
                        </span>

                    </div>


                    {/* ==================================================
                        STARTED
                    ================================================== */}

                    {started_at && (
                        <div className="moderation-case-header__badge-group">

                            <span className="moderation-case-header__meta-label">
                                Started
                            </span>

                            <span className="moderation-case-header__badge">
                                {formatDate(started_at)}
                            </span>

                        </div>
                    )}


                    {/* ==================================================
                        RESOLVED
                    ================================================== */}

                    {resolved_at && (
                        <div className="moderation-case-header__badge-group">

                            <span className="moderation-case-header__meta-label">
                                Resolved
                            </span>

                            <span className="moderation-case-header__badge">
                                {formatDate(resolved_at)}
                            </span>

                        </div>
                    )}

                </div>

            </div>

        </header>
    );
};


export default ModerationCaseHeader;
