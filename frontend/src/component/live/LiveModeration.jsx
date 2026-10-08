import React, {
    useState,
} from "react";

import LiveActionModal from "./LiveActionModal";

import "./LiveModeration.css";

const LiveModeration = ({
    session = null,
    isModerator = false,
    onApplyAction = null,
    loading = false,
}) => {

    const [selectedAction, setSelectedAction] =
        useState(null);

    const [isModalOpen, setIsModalOpen] =
        useState(false);


    // OPEN ACTION MODAL

    const openActionModal = (action) => {

        if (!isModerator) {
            return;
        }

        if (!session?.id) {
            return;
        }

        if (!session?.is_live) {
            return;
        }

        setSelectedAction(action);
        setIsModalOpen(true);
    };


    // CLOSE ACTION MODAL

    const closeActionModal = () => {

        if (loading) {
            return;
        }

        setIsModalOpen(false);
        setSelectedAction(null);
    };


    // SUBMIT MODERATION ACTION

    const handleSubmitAction = (data) => {

        if (!data?.action) {
            return;
        }

        if (!session?.id) {
            return;
        }

        if (onApplyAction) {

            onApplyAction({
                ...data,
                session_id: session.id,
            });

        }

    };


    // NO MODERATOR ACCESS

    if (!isModerator) {
        return null;
    }


    // NO SESSION

    if (!session) {
        return null;
    }


    // LIVE ENDED

    if (!session.is_live) {

        return (

            <div className="live-moderation">

                <div className="live-moderation-header">

                    <h3>
                        Live Moderation
                    </h3>

                </div>

                <div className="live-moderation-disabled">

                    <p>
                        This live session has ended.
                    </p>

                </div>

            </div>

        );
    }


    // LIVE MODERATION

    return (

        <div className="live-moderation">

            {/* MODERATION HEADER */}

            <div className="live-moderation-header">

                <div>

                    <h3>
                        Live Moderation
                    </h3>

                    <span>
                        Manage this live session
                    </span>

                </div>

            </div>


            {/* MODERATION ACTIONS */}

            <div className="live-moderation-actions">

                {/* WARNING */}

                <button
                    type="button"
                    className="live-moderation-action"
                    onClick={() =>
                        openActionModal(
                            "warning"
                        )
                    }
                    disabled={loading}
                >
                    <span>
                        ⚠️
                    </span>

                    <div>

                        <strong>
                            Warning
                        </strong>

                        <small>
                            Record a warning
                        </small>

                    </div>

                </button>


                {/* CHAT RESTRICTION */}

                <button
                    type="button"
                    className="live-moderation-action"
                    onClick={() =>
                        openActionModal(
                            "chat_restricted"
                        )
                    }
                    disabled={loading}
                >
                    <span>
                        🔇
                    </span>

                    <div>

                        <strong>
                            Restrict Chat
                        </strong>

                        <small>
                            Restrict live chat
                        </small>

                    </div>

                </button>


                {/* TEMPORARY SHUTDOWN */}

                <button
                    type="button"
                    className="live-moderation-action"
                    onClick={() =>
                        openActionModal(
                            "temporary_shutdown"
                        )
                    }
                    disabled={loading}
                >
                    <span>
                        ⏸️
                    </span>

                    <div>

                        <strong>
                            Temporary Shutdown
                        </strong>

                        <small>
                            Pause the live temporarily
                        </small>

                    </div>

                </button>


                {/* PERMANENT TERMINATION */}

                <button
                    type="button"
                    className="live-moderation-action live-moderation-action-danger"
                    onClick={() =>
                        openActionModal(
                            "permanent_termination"
                        )
                    }
                    disabled={loading}
                >
                    <span>
                        🛑
                    </span>

                    <div>

                        <strong>
                            Permanent Termination
                        </strong>

                        <small>
                            Permanently end this live
                        </small>

                    </div>

                </button>

            </div>


            {/* ACTION MODAL */}

            <LiveActionModal
                isOpen={isModalOpen}
                action={selectedAction}
                onClose={closeActionModal}
                onSubmit={handleSubmitAction}
                loading={loading}
            />

        </div>

    );

};


export default LiveModeration;
