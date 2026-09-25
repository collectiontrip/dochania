import "./ModerationStatusBage.css";


const STATUS_CONFIG = {
    pending: {
        label: "Pending",
        className: "pending",
    },

    in_review: {
        label: "In Review",
        className: "in-review",
    },

    resolved: {
        label: "Resolved",
        className: "resolved",
    },

    rejected: {
        label: "Rejected",
        className: "rejected",
    },
};


const normalizeStatus = (status) => {

    if (typeof status !== "string") {
        return "pending";
    }

    return status
        .trim()
        .toLowerCase()
        .replace(
            /[\s-]+/g,
            "_",
        );
};


const ModerationStatusBadge = ({
    status,
    className = "",
}) => {

    const normalizedStatus =
        normalizeStatus(status);

    const statusConfig =
        STATUS_CONFIG[normalizedStatus] || {
            label: "Unknown",
            className: "unknown",
        };

    const combinedClassName = [
        "moderation-status-badge",
        `moderation-status-badge--${statusConfig.className}`,
        className,
    ]
        .filter(Boolean)
        .join(" ");


    return (
        <span
            className={combinedClassName}
            role="status"
            aria-label={`Status: ${statusConfig.label}`}
        >
            <span
                className="moderation-status-badge__dot"
                aria-hidden="true"
            />

            <span className="moderation-status-badge__label">
                {statusConfig.label}
            </span>
        </span>
    );
};


export default ModerationStatusBadge;
