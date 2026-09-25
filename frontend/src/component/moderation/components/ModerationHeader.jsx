
import "./ModerationHeader.css";


const ModerationCaseHeader = ({
    moderationCase,
    onBack,
}) => {


    // ============================================================
    // VALIDATION
    // ============================================================

    if (
        !moderationCase
        ||
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

    const formatDate = (
        date,
    ) => {

        if (
            !date
        ) {

            return "—";

        }


        const parsedDate =
            new Date(
                date,
            );


        if (
            Number.isNaN(
                parsedDate.getTime(),
            )
        ) {

            return "—";

        }


        return parsedDate.toLocaleString(
            undefined,
            {
                dateStyle: "medium",
                timeStyle: "short",
            },
        );

    };


    const normalizeLabel = (
        value,
    ) => {

        if (
            !value
            ||
            typeof value !== "string"
        ) {

            return null;

        }


        return value
            .replaceAll(
                "_",
                " ",
            )
            .replace(
                /\b\w/g,
                (
                    character,
                ) =>
                    character.toUpperCase(),
            );

    };


    const getAssignedUsername = () => {

        if (
            !assigned_to
            ||
            typeof assigned_to !== "object"
        ) {

            return "Unassigned";

        }


        return (
            assigned_to.username
            ||
            "Assigned"
        );

    };


    const normalizedPriority =
        normalizeLabel(
            priority,
        );


    const normalizedDecision =
        normalizeLabel(
            decision,
        );


    // ============================================================
    // HANDLERS
    // ============================================================

    const handleBack = () => {

        if (
            typeof onBack === "function"
        ) {

            onBack();

        }

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <header
            className="moderation-case-header"
        >

            {/* ====================================================
                TOP BAR
            ==================================================== */}

            <div
                className="moderation-case-header__top"
            >

                <button
                    type="button"
                    className="moderation-case-header__back-button"
                    onClick={
                        handleBack
                    }
                    aria-label="Go back to moderation cases"
                >

                    <span
                        className="moderation-case-header__back-icon"
                        aria-hidden="true"
                    >
                        ←
                    </span>

                    <span>
                        Back to Cases
                    </span>

                </button>


                {
                    (
                        normalizedPriority
                        ||
                        normalizedDecision
                    )
                    &&
                    (
                        <div
                            className="moderation-case-header__badges"
                        >

                            {
                                normalizedPriority
                                &&
                                (
                                    <span
                                        className={
                                            `moderation-case-header__badge ` +
                                            `moderation-case-header__badge--priority`
                                        }
                                    >

                                        {normalizedPriority}

                                    </span>
                                )
                            }


                            {
                                normalizedDecision
                                &&
                                (
                                    <span
                                        className={
                                            `moderation-case-header__badge ` +
                                            `moderation-case-header__badge--decision`
                                        }
                                    >

                                        {normalizedDecision}

                                    </span>
                                )
                            }

                        </div>
                    )
                }

            </div>


            {/* ====================================================
                MAIN CONTENT
            ==================================================== */}

            <div
                className="moderation-case-header__content"
            >

                {/* CASE INFORMATION */}

                <div
                    className="moderation-case-header__case-info"
                >

                    <p
                        className="moderation-case-header__eyebrow"
                    >
                        Moderation Case
                    </p>


                    <h1
                        className="moderation-case-header__title"
                    >
                        Case Details
                    </h1>


                    {
                        id
                        &&
                        (
                            <p
                                className="moderation-case-header__case-id"
                            >

                                Case ID:
                                {" "}
                                <span>
                                    {id}
                                </span>

                            </p>
                        )
                    }

                </div>


                {/* =================================================
                    META INFORMATION
                ================================================= */}

                <div
                    className="moderation-case-header__meta"
                >

                    {/* ASSIGNED TO */}

                    <div
                        className="moderation-case-header__meta-item"
                    >

                        <span
                            className="moderation-case-header__meta-label"
                        >
                            Assigned To
                        </span>


                        <strong
                            className="moderation-case-header__meta-value"
                        >

                            {getAssignedUsername()}

                        </strong>

                    </div>


                    {/* STARTED */}

                    <div
                        className="moderation-case-header__meta-item"
                    >

                        <span
                            className="moderation-case-header__meta-label"
                        >
                            Started
                        </span>


                        <strong
                            className="moderation-case-header__meta-value"
                        >

                            {
                                formatDate(
                                    started_at,
                                )
                            }

                        </strong>

                    </div>


                    {/* RESOLVED */}

                    <div
                        className="moderation-case-header__meta-item"
                    >

                        <span
                            className="moderation-case-header__meta-label"
                        >
                            Resolved
                        </span>


                        <strong
                            className="moderation-case-header__meta-value"
                        >

                            {
                                formatDate(
                                    resolved_at,
                                )
                            }

                        </strong>

                    </div>

                </div>

            </div>

        </header>

    );

};


export default ModerationCaseHeader;
