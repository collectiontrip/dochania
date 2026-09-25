import {
    useEffect,
    useState,
} from "react";

import "./ModerationActionModal.css";


const MODERATION_ACTIONS = [
    {
        value: "none",
        label: "No Action",
        description: "Take no moderation action.",
    },
    {
        value: "warning",
        label: "Warning",
        description: "Issue a warning to the reported user.",
    },
    {
        value: "content_removed",
        label: "Remove Content",
        description: "Remove the reported content.",
    },
    {
        value: "account_restricted",
        label: "Restrict Account",
        description: "Restrict the reported user's account.",
    },
    {
        value: "account_suspended",
        label: "Suspend Account",
        description: "Suspend the reported user's account.",
    },
    {
        value: "account_banned",
        label: "Ban Account",
        description: "Permanently ban the reported user's account.",
    },
];


const ModerationActionModal = ({
    isOpen,
    moderationCase,
    onClose,
    onSubmit,
    loading = false,
    error = null,
}) => {

    // ============================================================
    // STATE
    // ============================================================

    const [actionTaken, setActionTaken] = useState("");
    const [actionReason, setActionReason] = useState("");
    const [note, setNote] = useState("");
    const [restrictionExpiresAt, setRestrictionExpiresAt] = useState("");
    const [suspensionExpiresAt, setSuspensionExpiresAt] = useState("");
    const [isPermanent, setIsPermanent] = useState(false);
    const [validationError, setValidationError] = useState("");


    // ============================================================
    // RESET FORM
    // ============================================================

    useEffect(() => {

        if (!isOpen) {
            return;
        }

        setActionTaken("");
        setActionReason("");
        setNote("");
        setRestrictionExpiresAt("");
        setSuspensionExpiresAt("");
        setIsPermanent(false);
        setValidationError("");

    }, [isOpen]);


    // ============================================================
    // HANDLERS
    // ============================================================

    const handleActionChange = (event) => {

        const value = event.target.value;

        setActionTaken(value);
        setValidationError("");

        if (value !== "account_restricted") {
            setRestrictionExpiresAt("");
        }

        if (value !== "account_suspended") {
            setSuspensionExpiresAt("");
        }

        if (value !== "account_banned") {
            setIsPermanent(false);
        }
    };


    const handleActionReasonChange = (event) => {
        setActionReason(event.target.value);
        setValidationError("");
    };


    const handleNoteChange = (event) => {
        setNote(event.target.value);
        setValidationError("");
    };


    const handleRestrictionExpiryChange = (event) => {
        setRestrictionExpiresAt(event.target.value);
        setValidationError("");
    };


    const handleSuspensionExpiryChange = (event) => {
        setSuspensionExpiresAt(event.target.value);
        setValidationError("");
    };


    const handlePermanentChange = (event) => {
        setIsPermanent(event.target.checked);
        setValidationError("");
    };


    // ============================================================
    // VALIDATION
    // ============================================================

    const validateForm = () => {

        if (!actionTaken) {
            return "Please select a moderation action.";
        }


        if (
            actionTaken === "account_restricted" &&
            !restrictionExpiresAt
        ) {
            return "Restriction expiry is required.";
        }


        if (
            actionTaken === "account_suspended" &&
            !suspensionExpiresAt
        ) {
            return "Suspension expiry is required.";
        }


        if (
            actionTaken === "account_banned" &&
            !isPermanent
        ) {
            return "Account ban must be permanent.";
        }


        if (
            restrictionExpiresAt &&
            new Date(restrictionExpiresAt) <= new Date()
        ) {
            return "Restriction expiry must be in the future.";
        }


        if (
            suspensionExpiresAt &&
            new Date(suspensionExpiresAt) <= new Date()
        ) {
            return "Suspension expiry must be in the future.";
        }


        if (
            isPermanent &&
            actionTaken !== "account_banned"
        ) {
            return "Permanent action is only valid for account ban.";
        }


        return "";
    };


    // ============================================================
    // SUBMIT
    // ============================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        if (loading) {
            return;
        }

        const formError = validateForm();

        if (formError) {
            setValidationError(formError);
            return;
        }


        const payload = {
            action_taken: actionTaken,
            action_reason: actionReason.trim(),
            restriction_expires_at:
                actionTaken === "account_restricted"
                    ? restrictionExpiresAt
                    : null,
            suspension_expires_at:
                actionTaken === "account_suspended"
                    ? suspensionExpiresAt
                    : null,
            is_permanent:
                actionTaken === "account_banned"
                    ? isPermanent
                    : false,
            note: note.trim(),
        };


        await onSubmit(payload);
    };


    // ============================================================
    // CLOSE
    // ============================================================

    const handleClose = () => {

        if (loading) {
            return;
        }

        if (typeof onClose === "function") {
            onClose();
        }
    };


    // ============================================================
    // GUARD
    // ============================================================

    if (!isOpen) {
        return null;
    }


    // ============================================================
    // DERIVED DATA
    // ============================================================

    const selectedAction = MODERATION_ACTIONS.find(
        (item) => item.value === actionTaken
    );


    const showRestrictionExpiry =
        actionTaken === "account_restricted";


    const showSuspensionExpiry =
        actionTaken === "account_suspended";


    const showPermanentOption =
        actionTaken === "account_banned";


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            className="moderation-action-modal-overlay"
            onMouseDown={handleClose}
        >

            <div
                className="moderation-action-modal"
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="moderation-action-modal__header">

                    <div>
                        <h2 className="moderation-action-modal__title">
                            Take Moderation Action
                        </h2>

                        <p className="moderation-action-modal__subtitle">
                            Select an action for this moderation case.
                        </p>
                    </div>


                    <button
                        type="button"
                        className="moderation-action-modal__close"
                        onClick={handleClose}
                        disabled={loading}
                        aria-label="Close moderation action modal"
                    >
                        ×
                    </button>

                </div>


                {/* ==================================================
                    CASE INFO
                ================================================== */}

                {moderationCase && (
                    <div className="moderation-action-modal__case">

                        <span className="moderation-action-modal__case-label">
                            Case
                        </span>

                        <span className="moderation-action-modal__case-id">
                            {moderationCase.id}
                        </span>

                    </div>
                )}


                {/* ==================================================
                    FORM
                ================================================== */}

                <form
                    className="moderation-action-modal__form"
                    onSubmit={handleSubmit}
                >

                    {/* ==================================================
                        ACTION
                    ================================================== */}

                    <div className="moderation-action-modal__field">

                        <label
                            htmlFor="moderation-action"
                            className="moderation-action-modal__label"
                        >
                            Moderation Action
                        </label>


                        <select
                            id="moderation-action"
                            className="moderation-action-modal__select"
                            value={actionTaken}
                            onChange={handleActionChange}
                            disabled={loading}
                            required
                        >

                            <option value="">
                                Select an action
                            </option>


                            {MODERATION_ACTIONS.map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}

                        </select>


                        {selectedAction && (
                            <p className="moderation-action-modal__description">
                                {selectedAction.description}
                            </p>
                        )}

                    </div>


                    {/* ==================================================
                        ACTION REASON
                    ================================================== */}

                    <div className="moderation-action-modal__field">

                        <label
                            htmlFor="moderation-action-reason"
                            className="moderation-action-modal__label"
                        >
                            Action Reason
                        </label>


                        <textarea
                            id="moderation-action-reason"
                            className="moderation-action-modal__textarea"
                            value={actionReason}
                            onChange={handleActionReasonChange}
                            disabled={loading}
                            placeholder="Explain why this moderation action is being taken..."
                            rows={4}
                        />

                    </div>


                    {/* ==================================================
                        RESTRICTION EXPIRY
                    ================================================== */}

                    {showRestrictionExpiry && (
                        <div className="moderation-action-modal__field">

                            <label
                                htmlFor="moderation-restriction-expires"
                                className="moderation-action-modal__label"
                            >
                                Restriction Expires
                            </label>


                            <input
                                id="moderation-restriction-expires"
                                type="datetime-local"
                                className="moderation-action-modal__input"
                                value={restrictionExpiresAt}
                                onChange={handleRestrictionExpiryChange}
                                disabled={loading}
                                required
                            />

                        </div>
                    )}


                    {/* ==================================================
                        SUSPENSION EXPIRY
                    ================================================== */}

                    {showSuspensionExpiry && (
                        <div className="moderation-action-modal__field">

                            <label
                                htmlFor="moderation-suspension-expires"
                                className="moderation-action-modal__label"
                            >
                                Suspension Expires
                            </label>


                            <input
                                id="moderation-suspension-expires"
                                type="datetime-local"
                                className="moderation-action-modal__input"
                                value={suspensionExpiresAt}
                                onChange={handleSuspensionExpiryChange}
                                disabled={loading}
                                required
                            />

                        </div>
                    )}


                    {/* ==================================================
                        PERMANENT BAN
                    ================================================== */}

                    {showPermanentOption && (
                        <label className="moderation-action-modal__checkbox">

                            <input
                                type="checkbox"
                                checked={isPermanent}
                                onChange={handlePermanentChange}
                                disabled={loading}
                            />

                            <span>
                                I confirm that this account ban is permanent.
                            </span>

                        </label>
                    )}


                    {/* ==================================================
                        MODERATOR NOTE
                    ================================================== */}

                    <div className="moderation-action-modal__field">

                        <label
                            htmlFor="moderation-action-note"
                            className="moderation-action-modal__label"
                        >
                            Moderator Note
                        </label>


                        <textarea
                            id="moderation-action-note"
                            className="moderation-action-modal__textarea"
                            value={note}
                            onChange={handleNoteChange}
                            disabled={loading}
                            placeholder="Add an internal note about this moderation decision..."
                            rows={5}
                        />

                    </div>


                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {(validationError || error) && (
                        <div className="moderation-action-modal__error">
                            {validationError || error}
                        </div>
                    )}


                    {/* ==================================================
                        FOOTER
                    ================================================== */}

                    <div className="moderation-action-modal__footer">

                        <button
                            type="button"
                            className={
                                "moderation-action-modal__button " +
                                "moderation-action-modal__button--secondary"
                            }
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            className={
                                "moderation-action-modal__button " +
                                "moderation-action-modal__button--primary"
                            }
                            disabled={!actionTaken || loading}
                        >
                            {loading
                                ? "Processing..."
                                : "Confirm Action"
                            }
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};


export default ModerationActionModal;
