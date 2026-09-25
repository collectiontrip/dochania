
import "./ModerationReportsPanel.css";


const ModerationReportsPanel = ({
    reports = [],
}) => {


    // ============================================================
    // HELPERS
    // ============================================================

    const formatValue = (
        value,
    ) => {

        if (
            value === null
            ||
            value === undefined
            ||
            value === ""
        ) {

            return "Not provided";

        }


        return String(value)
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


    const formatDate = (
        value,
    ) => {

        if (
            !value
        ) {

            return "Unknown date";

        }


        const date = new Date(
            value,
        );


        if (
            Number.isNaN(
                date.getTime(),
            )
        ) {

            return "Unknown date";

        }


        return new Intl.DateTimeFormat(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short",
            },
        ).format(date);

    };


    // ============================================================
    // EMPTY STATE
    // ============================================================

    if (
        !Array.isArray(reports)
        ||
        reports.length === 0
    ) {

        return (

            <section
                className="moderation-reports-panel"
            >

                <div
                    className="moderation-reports-panel__header"
                >

                    <div>

                        <p
                            className="moderation-reports-panel__eyebrow"
                        >
                            User Reports
                        </p>


                        <h2
                            className="moderation-reports-panel__title"
                        >
                            Reports
                        </h2>

                    </div>


                    <span
                        className="moderation-reports-panel__count"
                    >
                        0 Reports
                    </span>

                </div>


                <div
                    className="moderation-reports-panel__empty"
                >

                    <div
                        className="moderation-reports-panel__empty-icon"
                        aria-hidden="true"
                    >
                        ✓
                    </div>


                    <div>

                        <h3>
                            No reports available
                        </h3>


                        <p>
                            There are currently no report
                            details associated with this case.
                        </p>

                    </div>

                </div>

            </section>

        );

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <section
            className="moderation-reports-panel"
        >

            {/* ====================================================
                HEADER
            ==================================================== */}

            <div
                className="moderation-reports-panel__header"
            >

                <div>

                    <p
                        className="moderation-reports-panel__eyebrow"
                    >
                        User Reports
                    </p>


                    <h2
                        className="moderation-reports-panel__title"
                    >
                        Reports
                    </h2>

                </div>


                <span
                    className="moderation-reports-panel__count"
                >

                    {reports.length}{" "}

                    {
                        reports.length === 1
                            ? "Report"
                            : "Reports"
                    }

                </span>

            </div>


            {/* ====================================================
                REPORT LIST
            ==================================================== */}

            <div
                className="moderation-reports-panel__list"
            >

                {
                    reports.map(
                        (
                            report,
                            index,
                        ) => {

                            if (
                                !report
                                ||
                                typeof report !== "object"
                            ) {

                                return null;

                            }


                            const reporter =
                                report.reporter ||
                                "Unknown User";


                            const reason =
                                report.reason;


                            const reasonLabel =
                                report.reason_label;


                            const status =
                                report.status;


                            const description =
                                report.description;


                            const createdAt =
                                report.created_at;


                            const evidence =
                                Array.isArray(
                                    report.evidence,
                                )
                                    ? report.evidence
                                    : [];


                            return (

                                <article
                                    key={
                                        report.id ||
                                        `report-${index}`
                                    }
                                    className="moderation-reports-panel__report"
                                >

                                    {/* ====================================
                                        REPORT HEADER
                                    ==================================== */}

                                    <div
                                        className="moderation-reports-panel__report-header"
                                    >

                                        <div
                                            className="moderation-reports-panel__report-number"
                                        >

                                            <span
                                                className="moderation-reports-panel__report-index"
                                            >
                                                #{index + 1}
                                            </span>


                                            <span
                                                className="moderation-reports-panel__reason"
                                            >

                                                {
                                                    formatValue(
                                                        reasonLabel ||
                                                        reason,
                                                    )
                                                }

                                            </span>

                                        </div>


                                        <span
                                            className={
                                                `moderation-reports-panel__status ` +
                                                `moderation-reports-panel__status--${status || "pending"}`
                                            }
                                        >

                                            {
                                                formatValue(
                                                    status,
                                                )
                                            }

                                        </span>

                                    </div>


                                    {/* ====================================
                                        REPORT META
                                    ==================================== */}

                                    <div
                                        className="moderation-reports-panel__meta"
                                    >

                                        <div
                                            className="moderation-reports-panel__meta-item"
                                        >

                                            <span
                                                className="moderation-reports-panel__meta-label"
                                            >
                                                Reporter
                                            </span>


                                            <strong>
                                                {reporter}
                                            </strong>

                                        </div>


                                        <div
                                            className="moderation-reports-panel__meta-item"
                                        >

                                            <span
                                                className="moderation-reports-panel__meta-label"
                                            >
                                                Reported
                                            </span>


                                            <strong>
                                                {
                                                    formatDate(
                                                        createdAt,
                                                    )
                                                }
                                            </strong>

                                        </div>

                                    </div>


                                    {/* ====================================
                                        DESCRIPTION
                                    ==================================== */}

                                    {
                                        description
                                        &&
                                        (
                                            <div
                                                className="moderation-reports-panel__description"
                                            >

                                                <span
                                                    className="moderation-reports-panel__description-label"
                                                >
                                                    Report Details
                                                </span>


                                                <p>
                                                    {description}
                                                </p>

                                            </div>
                                        )
                                    }


                                    {/* ====================================
                                        EVIDENCE
                                    ==================================== */}

                                    {
                                        evidence.length > 0
                                        &&
                                        (
                                            <div
                                                className="moderation-reports-panel__evidence"
                                            >

                                                <span
                                                    className="moderation-reports-panel__evidence-label"
                                                >
                                                    Evidence
                                                </span>


                                                <div
                                                    className="moderation-reports-panel__evidence-list"
                                                >

                                                    {
                                                        evidence.map(
                                                            (
                                                                item,
                                                                evidenceIndex,
                                                            ) => {

                                                                if (
                                                                    !item
                                                                    ||
                                                                    typeof item !== "object"
                                                                    ||
                                                                    !item.file
                                                                ) {

                                                                    return null;

                                                                }


                                                                return (

                                                                    <a
                                                                        key={
                                                                            item.id ||
                                                                            `evidence-${evidenceIndex}`
                                                                        }
                                                                        href={item.file}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="moderation-reports-panel__evidence-item"
                                                                    >

                                                                        Evidence{" "}
                                                                        {evidenceIndex + 1}

                                                                    </a>

                                                                );

                                                            },
                                                        )
                                                    }

                                                </div>

                                            </div>
                                        )
                                    }

                                </article>

                            );

                        },
                    )
                }

            </div>

        </section>

    );

};


export default ModerationReportsPanel;

