import "./ReportStatusBadge.css";


const ReportStatusBadge = ({
    status,
}) => {

    // ============================================================
    // STATUS CONFIG
    // ============================================================

    const statusConfig = {

        pending: {
            label: "Pending",
            className:
                "report-status-badge "
                + "report-status-pending",
        },


        in_review: {
            label: "In Review",
            className:
                "report-status-badge "
                + "report-status-in-review",
        },


        resolved: {
            label: "Resolved",
            className:
                "report-status-badge "
                + "report-status-resolved",
        },


        rejected: {
            label: "Rejected",
            className:
                "report-status-badge "
                + "report-status-rejected",
        },

    };


    // ============================================================
    // STATUS
    // ============================================================

    const config =
        statusConfig[status] || {
            label: "Unknown",
            className:
                "report-status-badge "
                + "report-status-unknown",
        };


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <span
            className={
                config.className
            }
            aria-label={
                `Report status: ${config.label}`
            }
        >
            {
                config.label
            }
        </span>

    );
};


export default ReportStatusBadge;