import ModerationStatusBadge
    from "./ModerationStatusBage";

import ModerationPriorityBadge
    from "./ModerationPriorityBage";

import "./ModerationCaseCard.css";


const ModerationCaseCard = ({
    moderationCase,
    onOpen,
}) => {


    // ============================================================
    // VALIDATION
    // ============================================================

    if (

        !moderationCase

        ||

        typeof moderationCase !==
        "object"

        ||

        Array.isArray(
            moderationCase,
        )

    ) {

        return null;

    }


    // ============================================================
    // SAFE VALUE
    // ============================================================

    const getValue = (
        ...values
    ) => {

        for (
            const value of values
        ) {

            if (

                value !== null

                &&

                value !== undefined

                &&

                value !== ""

            ) {

                return value;

            }

        }


        return null;

    };


    // ============================================================
    // FORMAT TEXT
    // ============================================================

    const formatText = (
        value,
    ) => {

        if (

            value === null

            ||

            value === undefined

            ||

            value === ""

        ) {

            return "—";

        }


        return String(
            value,
        )

            .trim()

            .replace(
                /[_-]+/g,
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


    // ============================================================
    // FORMAT DATE
    // ============================================================

    const formatDate = (
        value,
    ) => {

        if (
            !value
        ) {

            return "—";

        }


        const date =
            new Date(
                value,
            );


        if (
            Number.isNaN(
                date.getTime(),
            )
        ) {

            return "—";

        }


        try {

            return new Intl.DateTimeFormat(
                "en-IN",
                {

                    dateStyle:
                        "medium",

                    timeStyle:
                        "short",

                },
            ).format(
                date,
            );

        } catch {

            return date.toLocaleString(
                "en-IN",
            );

        }

    };


    // ============================================================
    // GET USERNAME
    // ============================================================

    const getUsername = (
        user,
    ) => {

        if (
            !user
        ) {

            return null;

        }


        if (
            typeof user ===
            "string"
            ||
            typeof user ===
            "number"
        ) {

            return String(
                user,
            );

        }


        if (
            typeof user !==
            "object"
            ||
            Array.isArray(
                user,
            )
        ) {

            return null;

        }


        return getValue(
            user.username,
        );

    };


    // ============================================================
    // REPORT
    // ============================================================

    const report =
        moderationCase.report
        &&
        typeof moderationCase.report ===
        "object"

            ?

        moderationCase.report

            :

        null;


    // ============================================================
    // REPORTED CONTENT
    // ============================================================

    const reportedContent =
        report?.reported_content
        &&
        typeof report.reported_content ===
        "object"

            ?

        report.reported_content

            :

        null;


    // ============================================================
    // CASE ID
    // ============================================================

    const caseId =
        getValue(
            moderationCase.id,
        );


    // ============================================================
    // CASE DECISION
    // ============================================================

    const decision =
        getValue(
            moderationCase.decision,
        );


    // ============================================================
    // REPORT STATUS
    // ============================================================

    const reportStatus =
        getValue(
            report?.status,
        );


    // ============================================================
    // REPORT REASON
    // ============================================================

    const reason =
        getValue(
            report?.reason_label,
            report?.reason,
        );


    // ============================================================
    // REPORT DESCRIPTION
    // ============================================================

    const description =
        getValue(
            report?.description,
        );


    // ============================================================
    // ASSIGNED MODERATOR
    // ============================================================

    const assignedModerator =
        moderationCase.assigned_to
        &&
        typeof moderationCase.assigned_to ===
        "object"

            ?

        moderationCase.assigned_to

            :

        null;


    const assignedModeratorName =
        getUsername(
            assignedModerator,
        );


    // ============================================================
    // REPORTER
    // ============================================================

    const reporterName =
        getUsername(
            report?.reporter,
        );


    // ============================================================
    // REPORTED USER
    // ============================================================

    /*
     * Backend ReportSerializer does not provide
     * a direct "reported_user" field.
     *
     * Reported user comes from:
     *
     * report.reported_content.author.username
     */

    const reportedUserName =
        getUsername(
            reportedContent?.author,
        );


    // ============================================================
    // PRIORITY
    // ============================================================

    const priority =
        getValue(
            moderationCase.priority,
        );


    // ============================================================
    // DATES
    // ============================================================

    const createdAt =
        getValue(
            moderationCase.created_at,
        );


    const updatedAt =
        getValue(
            moderationCase.updated_at,
        );


    const startedAt =
        getValue(
            moderationCase.started_at,
        );


    const resolvedAt =
        getValue(
            moderationCase.resolved_at,
        );


    // ============================================================
    // CASE CLOSED
    // ============================================================

    const isClosed =
        [
            "resolved",
            "rejected",
        ].includes(
            decision,
        );


    // ============================================================
    // ASSIGNMENT STATUS
    // ============================================================

    const isAssigned =
        Boolean(
            assignedModeratorName,
        );


    // ============================================================
    // CARD CLASS
    // ============================================================

    const cardClassName =
        [

            "moderation-case-card",

            isClosed
                ?
                "moderation-case-card-closed"
                :
                "",

            isAssigned
                ?
                "moderation-case-card-assigned"
                :
                "moderation-case-card-unassigned",

        ]

            .filter(
                Boolean,
            )

            .join(
                " ",
            );


    // ============================================================
    // OPEN CASE
    // ============================================================

    const handleOpen = () => {

        if (
            typeof onOpen !==
            "function"
        ) {

            return;

        }


        onOpen(
            moderationCase,
        );

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <article
            className={
                cardClassName
            }
        >


            {/* ==================================================
                CARD HEADER
            ================================================== */}

            <header
                className="moderation-case-card-header"
            >

                <div
                    className="moderation-case-card-title"
                >

                    <div>

                        <span
                            className="moderation-case-label"
                        >
                            Moderation Case
                        </span>


                        <h3>

                            {
                                caseId
                                    ?
                                    `#${caseId}`
                                    :
                                    "Unknown Case"
                            }

                        </h3>

                    </div>


                    {/* ==================================================
                        CASE DECISION
                    ================================================== */}

                    <div
                        className={
                            "moderation-case-decision " +
                            `moderation-case-decision-${decision || "pending"}`
                        }
                    >

                        <span
                            className="moderation-case-decision-indicator"
                            aria-hidden="true"
                        />

                        <span>
                            {
                                formatText(
                                    decision,
                                )
                            }
                        </span>

                    </div>

                </div>


                {/* ==================================================
                    PRIORITY
                ================================================== */}

                {
                    priority
                    && (

                        <ModerationPriorityBadge
                            priority={
                                priority
                            }
                        />

                    )
                }

            </header>


            {/* ==================================================
                CARD BODY
            ================================================== */}

            <section
                className="moderation-case-card-body"
            >


                {/* ==================================================
                    REPORT REASON
                ================================================== */}

                <div
                    className="moderation-case-info"
                >

                    <span>
                        Report Reason
                    </span>


                    <strong>

                        {
                            formatText(
                                reason,
                            )
                        }

                    </strong>

                </div>


                {/* ==================================================
                    DESCRIPTION
                ================================================== */}

                {
                    description
                    && (

                        <div
                            className="moderation-case-description"
                        >

                            <span>
                                Description
                            </span>


                            <p>
                                {
                                    description
                                }
                            </p>

                        </div>

                    )
                }


                {/* ==================================================
                    REPORTER
                ================================================== */}

                <div
                    className="moderation-case-info"
                >

                    <span>
                        Reported By
                    </span>


                    <strong>

                        {
                            reporterName
                            ||
                            "Unknown"
                        }

                    </strong>

                </div>


                {/* ==================================================
                    REPORTED USER
                ================================================== */}

                {
                    reportedUserName
                    && (

                        <div
                            className="moderation-case-info"
                        >

                            <span>
                                Reported User
                            </span>


                            <strong>

                                {
                                    reportedUserName
                                }

                            </strong>

                        </div>

                    )
                }


                {/* ==================================================
                    ASSIGNED MODERATOR
                ================================================== */}

                <div
                    className="moderation-case-info"
                >

                    <span>
                        Assigned To
                    </span>


                    <strong>

                        {
                            isAssigned
                                ?
                                assignedModeratorName
                                :
                                "Unassigned"
                        }

                    </strong>

                </div>


                {/* ==================================================
                    REPORT STATUS
                ================================================== */}

                {
                    reportStatus
                    && (

                        <div
                            className="moderation-case-info"
                        >

                            <span>
                                Report Status
                            </span>


                            <div
                                className="moderation-case-report-status"
                            >

                                <ModerationStatusBadge
                                    status={
                                        reportStatus
                                    }
                                />

                            </div>

                        </div>

                    )
                }

            </section>


            {/* ==================================================
                CARD FOOTER
            ================================================== */}

            <footer
                className="moderation-case-card-footer"
            >


                <div
                    className="moderation-case-dates"
                >


                    {/* ==================================================
                        CREATED
                    ================================================== */}

                    <span>

                        Created:

                        {" "}

                        <strong>

                            {
                                formatDate(
                                    createdAt,
                                )
                            }

                        </strong>

                    </span>


                    {/* ==================================================
                        STARTED
                    ================================================== */}

                    {
                        startedAt
                        && (

                            <span>

                                Started:

                                {" "}

                                <strong>

                                    {
                                        formatDate(
                                            startedAt,
                                        )
                                    }

                                </strong>

                            </span>

                        )
                    }


                    {/* ==================================================
                        UPDATED
                    ================================================== */}

                    {
                        updatedAt
                        && (

                            <span>

                                Updated:

                                {" "}

                                <strong>

                                    {
                                        formatDate(
                                            updatedAt,
                                        )
                                    }

                                </strong>

                            </span>

                        )
                    }


                    {/* ==================================================
                        RESOLVED
                    ================================================== */}

                    {
                        resolvedAt
                        && (

                            <span>

                                Resolved:

                                {" "}

                                <strong>

                                    {
                                        formatDate(
                                            resolvedAt,
                                        )
                                    }

                                </strong>

                            </span>

                        )
                    }

                </div>


                {/* ==================================================
                    VIEW DETAILS
                ================================================== */}

                {
                    typeof onOpen ===
                    "function"

                    && (

                        <button
                            type="button"
                            className="moderation-case-view-button"
                            onClick={
                                handleOpen
                            }
                            aria-label={
                                caseId
                                    ?
                                    `View moderation case ${caseId}`
                                    :
                                    "View moderation case details"
                            }
                        >

                            View Details

                        </button>

                    )
                }

            </footer>

        </article>

    );

};


export default ModerationCaseCard;
