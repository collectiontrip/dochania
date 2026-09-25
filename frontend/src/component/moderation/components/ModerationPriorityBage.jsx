import "./ModerationPriorityBage.css";


/* ============================================================
   PRIORITY CONFIGURATION
   ============================================================ */

const PRIORITY_CONFIG = {
    low: {
        label: "Low",
        className: "low",
    },

    medium: {
        label: "Medium",
        className: "medium",
    },

    high: {
        label: "High",
        className: "high",
    },

    urgent: {
        label: "Urgent",
        className: "urgent",
    },
};


/* ============================================================
   NORMALIZE PRIORITY
   ============================================================ */

const normalizePriority = (
    priority,
) => {

    if (
        typeof priority !==
        "string"
    ) {

        return "medium";

    }


    const normalized =
        priority
            .trim()
            .toLowerCase()
            .replace(
                /[\s-]+/g,
                "_",
            );


    if (
        !normalized
        ||
        !PRIORITY_CONFIG[
            normalized
        ]
    ) {

        return "medium";

    }


    return normalized;
};


/* ============================================================
   MODERATION PRIORITY BADGE
   ============================================================ */

const ModerationPriorityBadge = ({
    priority,
    className = "",
}) => {

    const normalizedPriority =
        normalizePriority(
            priority,
        );


    const priorityConfig =
        PRIORITY_CONFIG[
            normalizedPriority
        ];


    const combinedClassName = [
        "moderation-priority-badge",
        `moderation-priority-badge--${priorityConfig.className}`,
        className,
    ]
        .filter(Boolean)
        .join(" ");


    return (
        <span
            className={
                combinedClassName
            }
            role="status"
            aria-label={
                `Priority: ${priorityConfig.label}`
            }
        >

            {/* ==================================================
                PRIORITY INDICATOR
            ================================================== */}

            <span
                className="moderation-priority-badge__indicator"
                aria-hidden="true"
            />


            {/* ==================================================
                PRIORITY LABEL
            ================================================== */}

            <span
                className="moderation-priority-badge__label"
            >
                {
                    priorityConfig.label
                }
            </span>

        </span>
    );
};


export default ModerationPriorityBadge;
