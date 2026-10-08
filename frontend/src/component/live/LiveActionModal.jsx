import React, {
    useEffect,
    useState,
} from "react";

import "./LiveActionModal.css";

// LIVE ACTION MODAL

const LiveActionModal = ({
    isOpen = false,
    action = null,
    onClose = null,
    onSubmit = null,
    loading = false,
}) => {

    const [reason, setReason] =
        useState("");

    const [note, setNote] =
        useState("");

    const [durationMinutes, setDurationMinutes] =
        useState("");


    // RESET FORM

    useEffect(() => {

        if (!isOpen) {

            setReason("");
            setNote("");
            setDurationMinutes("");

        }

    }, [isOpen]);


    // HANDLE SUBMIT

    const handleSubmit = (event) => {

        event.preventDefault();

        if (!action) {
            return;
        }

        if (!reason) {
            return;
        }

        if (
            action === "temporary_shutdown"
            && (
                !durationMinutes
                || Number(durationMinutes) <= 0
            )
        ) {

            return;
        }

        if (onSubmit) {

            onSubmit({
                action,
                reason,
                note: note.trim(),
                duration_minutes:
                    action === "temporary_shutdown"
                        ? Number(durationMinutes)
                        : null,
            });

        }
    };


    // GET ACTION TITLE

    const getActionTitle = () => {

        switch (action) {

            case "warning":
                return "Warning";

            case "chat_restricted":
                return "Restrict Chat";

            case "temporary_shutdown":
                return "Temporary Shutdown";

            case "permanent_termination":
                return "Permanent Termination";

            default:
                return "Moderation Action";

        }
    };


    // GET ACTION DESCRIPTION

    const getActionDescription = () => {

        switch (action) {

            case "warning":
                return "Record a warning for this live.";

            case "chat_restricted":
                return "Restrict chat for this live.";

            case "temporary_shutdown":
                return "Temporarily shut down this live.";

            case "permanent_termination":
                return "Permanently terminate this live.";

            default:
                return "";

        }
    };


    // MODAL CLOSED

    if (!isOpen) {
        return null;
    }


    // MODAL

    return (

        <div className="live-action-modal-overlay">

            <div
                className="live-action-modal"
                role="dialog"
                aria-modal="true"
            >

                {/* MODAL HEADER */}

                <div className="live-action-modal-header">

                    <div>

                        <h2>
                            {getActionTitle()}
                        </h2>

                        <p>
                            {getActionDescription()}
                        </p>

                    </div>

                    <button
                        type="button"
                        className="live-action-modal-close"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>


                {/* MODAL FORM */}

                <form
                    className="live-action-modal-form"
                    onSubmit={handleSubmit}
                >

                    {/* REASON */}

                    <div className="live-action-modal-field">

                        <label htmlFor="live-action-reason">
                            Reason
                        </label>

                        <input
                            id="live-action-reason"
                            type="text"
                            value={reason}
                            onChange={(event) =>
                                setReason(
                                    event.target.value
                                )
                            }
                            placeholder="Enter moderation reason"
                            required
                            disabled={loading}
                        />

                    </div>


                    {/* DURATION */}

                    {action === "temporary_shutdown" && (

                        <div className="live-action-modal-field">

                            <label htmlFor="live-action-duration">
                                Duration (minutes)
                            </label>

                            <input
                                id="live-action-duration"
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(event) =>
                                    setDurationMinutes(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter duration"
                                required
                                disabled={loading}
                            />

                        </div>

                    )}


                    {/* NOTE */}

                    <div className="live-action-modal-field">

                        <label htmlFor="live-action-note">
                            Note
                        </label>

                        <textarea
                            id="live-action-note"
                            value={note}
                            onChange={(event) =>
                                setNote(
                                    event.target.value
                                )
                            }
                            placeholder="Add a moderator note"
                            rows="4"
                            disabled={loading}
                        />

                    </div>


                    {/* MODAL ACTIONS */}

                    <div className="live-action-modal-actions">

                        <button
                            type="button"
                            className="live-action-modal-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="live-action-modal-submit"
                            disabled={
                                loading
                                || !action
                                || !reason
                                || (
                                    action === "temporary_shutdown"
                                    && (
                                        !durationMinutes
                                        || Number(durationMinutes) <= 0
                                    )
                                )
                            }
                        >
                            {loading
                                ? "Applying..."
                                : "Apply Action"}
                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

};


export default LiveActionModal;
