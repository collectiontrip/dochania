import {
    useEffect,
} from "react";


import "./ReportDetail.css";


const ReportDetail = ({
    report,
    isOpen,
    onClose,
}) => {

    // ============================================================
    // CLOSE ON ESCAPE
    // ============================================================

    useEffect(() => {

        if (!isOpen) {
            return;
        }


        const handleKeyDown = (event) => {

            if (event.key === "Escape") {

                onClose();

            }

        };


        document.addEventListener(
            "keydown",
            handleKeyDown,
        );


        return () => {

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );

        };

    }, [
        isOpen,
        onClose,
    ]);


    // ============================================================
    // BODY SCROLL LOCK
    // ============================================================

    useEffect(() => {

        if (!isOpen) {
            return;
        }


        const previousOverflow =
            document.body.style.overflow;


        document.body.style.overflow =
            "hidden";


        return () => {

            document.body.style.overflow =
                previousOverflow;

        };

    }, [isOpen]);


    // ============================================================
    // CLOSE
    // ============================================================

    const handleOverlayClick = (
        event,
    ) => {

        if (
            event.target ===
            event.currentTarget
        ) {

            onClose();

        }

    };


    // ============================================================
    // GUARD
    // ============================================================

    if (
        !isOpen ||
        !report
    ) {

        return null;

    }


    // ============================================================
    // REPORT DATA
    // ============================================================

    const reason =
        report.reason_label ||
        report.reason_display ||
        report.reason ||
        "Unknown";


    const status =
        report.status_label ||
        report.status_display ||
        report.status ||
        "Unknown";


    const description =
        report.description ||
        "No description provided.";


    const actionTaken =
        report.action_taken_label ||
        report.action_taken_display ||
        report.action_taken ||
        "None";


    const createdAt =
        report.created_at
            ? new Date(
                report.created_at,
            ).toLocaleString()
            : "Unknown";


    const updatedAt =
        report.updated_at
            ? new Date(
                report.updated_at,
            ).toLocaleString()
            : null;


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div
            className="report-detail-overlay"
            onClick={
                handleOverlayClick
            }
            role="presentation"
        >

            <div
                className="report-detail"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-detail-title"
            >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <header
                    className="report-detail-header"
                >

                    <div>

                        <h2
                            id="report-detail-title"
                        >
                            Report Details
                        </h2>

                        <p>
                            Review the details of your submitted report.
                        </p>

                    </div>


                    <button
                        type="button"
                        className="report-detail-close"
                        onClick={onClose}
                        aria-label="Close report details"
                    >
                        ×
                    </button>

                </header>


                {/* ==================================================
                    CONTENT
                ================================================== */}

                <div
                    className="report-detail-content"
                >

                    {/* ==================================================
                        STATUS
                    ================================================== */}

                    <div
                        className="report-detail-section"
                    >

                        <div
                            className="report-detail-field"
                        >

                            <span>
                                Status
                            </span>

                            <strong
                                className={
                                    `report-detail-status report-detail-status-${report.status || "unknown"}`
                                }
                            >
                                {status}
                            </strong>

                        </div>


                        <div
                            className="report-detail-field"
                        >

                            <span>
                                Reason
                            </span>

                            <strong>
                                {reason}
                            </strong>

                        </div>

                    </div>


                    {/* ==================================================
                        DESCRIPTION
                    ================================================== */}

                    <div
                        className="report-detail-section"
                    >

                        <h3>
                            Description
                        </h3>


                        <p
                            className="report-detail-description"
                        >
                            {description}
                        </p>

                    </div>


                    {/* ==================================================
                        ACTION
                    ================================================== */}

                    <div
                        className="report-detail-section"
                    >

                        <div
                            className="report-detail-field"
                        >

                            <span>
                                Action Taken
                            </span>

                            <strong>
                                {actionTaken}
                            </strong>

                        </div>

                    </div>


                    {/* ==================================================
                        DATES
                    ================================================== */}

                    <div
                        className="report-detail-section"
                    >

                        <div
                            className="report-detail-field"
                        >

                            <span>
                                Submitted
                            </span>

                            <strong>
                                {createdAt}
                            </strong>

                        </div>


                        {updatedAt && (

                            <div
                                className="report-detail-field"
                            >

                                <span>
                                    Last Updated
                                </span>

                                <strong>
                                    {updatedAt}
                                </strong>

                            </div>

                        )}

                    </div>


                    {/* ==================================================
                        REPORT ID
                    ================================================== */}

                    {report.id && (

                        <div
                            className="report-detail-section"
                        >

                            <div
                                className="report-detail-field report-detail-id"
                            >

                                <span>
                                    Report ID
                                </span>

                                <code>
                                    {report.id}
                                </code>

                            </div>

                        </div>

                    )}

                </div>


                {/* ==================================================
                    FOOTER
                ================================================== */}

                <footer
                    className="report-detail-footer"
                >

                    <button
                        type="button"
                        className="report-detail-close-button"
                        onClick={onClose}
                    >
                        Close
                    </button>

                </footer>

            </div>

        </div>

    );

};


export default ReportDetail;