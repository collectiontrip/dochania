
import {
    useCallback,
    useMemo,
} from "react";

import "./ModerationFilters.css";


const DEFAULT_FILTERS = {
    search: "",
    status: "all",
    assignment: "all",
    reason: "all",
    priority: "all",
};


const ModerationFilters = ({
    filters = {},
    onChange,
    onClear,
}) => {


    // ============================================================
    // NORMALIZE FILTERS
    // ============================================================

    const normalizedFilters = useMemo(
        () => {

            if (
                !filters
                ||
                typeof filters !==
                "object"
                ||
                Array.isArray(filters)
            ) {

                return {
                    ...DEFAULT_FILTERS,
                };

            }


            return {

                search:
                    typeof filters.search ===
                    "string"
                        ? filters.search
                        : "",

                status:
                    typeof filters.status ===
                    "string"
                        ? filters.status
                        : "all",

                assignment:
                    typeof filters.assignment ===
                    "string"
                        ? filters.assignment
                        : "all",

                reason:
                    typeof filters.reason ===
                    "string"
                        ? filters.reason
                        : "all",

                priority:
                    typeof filters.priority ===
                    "string"
                        ? filters.priority
                        : "all",

            };

        },
        [
            filters,
        ],
    );


    // ============================================================
    // STATUS OPTIONS
    // ============================================================

    const statusOptions = [
        {
            value: "all",
            label: "All Statuses",
        },

        {
            value: "pending",
            label: "Pending",
        },

        {
            value: "in_review",
            label: "In Review",
        },

        {
            value: "resolved",
            label: "Resolved",
        },

        {
            value: "rejected",
            label: "Rejected",
        },
    ];


    // ============================================================
    // ASSIGNMENT OPTIONS
    // ============================================================

    const assignmentOptions = [
        {
            value: "all",
            label: "All Cases",
        },

        {
            value: "assigned",
            label: "Assigned",
        },

        {
            value: "unassigned",
            label: "Unassigned",
        },
    ];


    // ============================================================
    // REASON OPTIONS
    // ============================================================

    const reasonOptions = [
        {
            value: "all",
            label: "All Reasons",
        },

        {
            value: "spam",
            label: "Spam",
        },

        {
            value: "harassment",
            label: "Harassment",
        },

        {
            value: "hate_speech",
            label: "Hate Speech",
        },

        {
            value: "violence",
            label: "Violence",
        },

        {
            value: "nudity",
            label: "Nudity",
        },

        {
            value: "scam",
            label: "Scam",
        },

        {
            value: "copyright",
            label: "Copyright",
        },

        {
            value: "false_information",
            label: "False Information",
        },

        {
            value: "self_harm",
            label: "Self Harm",
        },

        {
            value: "impersonation",
            label: "Impersonation",
        },

        {
            value: "other",
            label: "Other",
        },
    ];


    // ============================================================
    // PRIORITY OPTIONS
    // ============================================================

    const priorityOptions = [
        {
            value: "all",
            label: "All Priorities",
        },

        {
            value: "low",
            label: "Low",
        },

        {
            value: "medium",
            label: "Medium",
        },

        {
            value: "high",
            label: "High",
        },

        {
            value: "urgent",
            label: "Urgent",
        },
    ];


    // ============================================================
    // CHANGE HANDLER
    // ============================================================

    const handleFilterChange = useCallback(
        (
            field,
            value,
        ) => {

            if (
                typeof onChange !==
                "function"
            ) {

                return;

            }


            onChange(
                {
                    ...normalizedFilters,
                    [field]:
                        value,
                },
            );

        },
        [
            normalizedFilters,
            onChange,
        ],
    );


    // ============================================================
    // CLEAR HANDLER
    // ============================================================

    const handleClear = useCallback(
        () => {

            if (
                typeof onClear ===
                "function"
            ) {

                onClear();

                return;

            }


            if (
                typeof onChange !==
                "function"
            ) {

                return;

            }


            onChange(
                {
                    ...DEFAULT_FILTERS,
                },
            );

        },
        [
            onChange,
            onClear,
        ],
    );


    // ============================================================
    // ACTIVE FILTER CHECK
    // ============================================================

    const hasActiveFilters =

        normalizedFilters.search.trim()
        !== ""

        ||

        normalizedFilters.status !==
        "all"

        ||

        normalizedFilters.assignment !==
        "all"

        ||

        normalizedFilters.reason !==
        "all"

        ||

        normalizedFilters.priority !==
        "all";


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <section
            className="moderation-filters"
            aria-label="Moderation case filters"
        >

            {/* ==================================================
                SEARCH
            ================================================== */}

            <div
                className="moderation-filters__search"
            >

                <label
                    htmlFor="moderation-case-search"
                    className="moderation-filters__label"
                >
                    Search Cases
                </label>


                <input
                    id="moderation-case-search"
                    type="search"
                    value={
                        normalizedFilters.search
                    }
                    onChange={
                        (
                            event,
                        ) =>
                            handleFilterChange(
                                "search",
                                event.target.value,
                            )
                    }
                    placeholder="Search by case ID, report ID, or username"
                    autoComplete="off"
                    className="moderation-filters__input"
                />

            </div>


            {/* ==================================================
                STATUS
            ================================================== */}

            <div
                className="moderation-filters__field"
            >

                <label
                    htmlFor="moderation-status-filter"
                    className="moderation-filters__label"
                >
                    Status
                </label>


                <select
                    id="moderation-status-filter"
                    value={
                        normalizedFilters.status
                    }
                    onChange={
                        (
                            event,
                        ) =>
                            handleFilterChange(
                                "status",
                                event.target.value,
                            )
                    }
                    className="moderation-filters__select"
                >

                    {
                        statusOptions.map(
                            (
                                option,
                            ) => (

                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>

                            ),
                        )
                    }

                </select>

            </div>


            {/* ==================================================
                ASSIGNMENT
            ================================================== */}

            <div
                className="moderation-filters__field"
            >

                <label
                    htmlFor="moderation-assignment-filter"
                    className="moderation-filters__label"
                >
                    Assignment
                </label>


                <select
                    id="moderation-assignment-filter"
                    value={
                        normalizedFilters.assignment
                    }
                    onChange={
                        (
                            event,
                        ) =>
                            handleFilterChange(
                                "assignment",
                                event.target.value,
                            )
                    }
                    className="moderation-filters__select"
                >

                    {
                        assignmentOptions.map(
                            (
                                option,
                            ) => (

                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>

                            ),
                        )
                    }

                </select>

            </div>


            {/* ==================================================
                REASON
            ================================================== */}

            <div
                className="moderation-filters__field"
            >

                <label
                    htmlFor="moderation-reason-filter"
                    className="moderation-filters__label"
                >
                    Reason
                </label>


                <select
                    id="moderation-reason-filter"
                    value={
                        normalizedFilters.reason
                    }
                    onChange={
                        (
                            event,
                        ) =>
                            handleFilterChange(
                                "reason",
                                event.target.value,
                            )
                    }
                    className="moderation-filters__select"
                >

                    {
                        reasonOptions.map(
                            (
                                option,
                            ) => (

                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>

                            ),
                        )
                    }

                </select>

            </div>


            {/* ==================================================
                PRIORITY
            ================================================== */}

            <div
                className="moderation-filters__field"
            >

                <label
                    htmlFor="moderation-priority-filter"
                    className="moderation-filters__label"
                >
                    Priority
                </label>


                <select
                    id="moderation-priority-filter"
                    value={
                        normalizedFilters.priority
                    }
                    onChange={
                        (
                            event,
                        ) =>
                            handleFilterChange(
                                "priority",
                                event.target.value,
                            )
                    }
                    className="moderation-filters__select"
                >

                    {
                        priorityOptions.map(
                            (
                                option,
                            ) => (

                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>

                            ),
                        )
                    }

                </select>

            </div>


            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div
                className="moderation-filters__actions"
            >

                <button
                    type="button"
                    onClick={
                        handleClear
                    }
                    disabled={
                        !hasActiveFilters
                    }
                    className="moderation-filters__clear"
                >
                    Clear Filters
                </button>

            </div>

        </section>
    );
};


export default ModerationFilters;
