import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import moderationService from "../../../services/moderationService";

import ModerationCaseHeader from "./ModerationCaseHeader";
import ModerationReportsPanel from "./ModerationReportsPanel";
import ModerationContentPanel from "./ModerationContentPannel"
import ModerationUserHistory from "./ModerationUserHistory";
import ModerationCaseTimeLine from "./ModerationCaseTimeline";
import ModerationActionModal from "./ModerationActionModal";

import "./ModerationCaseDetail.css";


const ModerationCaseDetail = () => {

    // ============================================================
    // ROUTER
    // ============================================================

    const { caseId } = useParams();

    const navigate = useNavigate();


    // ============================================================
    // STATE
    // ============================================================

    const [moderationCase, setModerationCase] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [actionModalOpen, setActionModalOpen] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);

    const [actionError, setActionError] = useState(null);


    // ============================================================
    // FETCH CASE
    // ============================================================

    const fetchCase = useCallback(
        async () => {

            if (!caseId) {
                setError("Moderation case ID is missing.");
                setLoading(false);
                return;
            }

            try {

                setLoading(true);
                setError(null);

                /*
                 * moderationService.getCase()
                 * already returns response.data.
                 */

                const caseData =
                    await moderationService.getCase(caseId);

                setModerationCase(caseData);

            } catch (requestError) {

                console.error(
                    "Failed to fetch moderation case:",
                    requestError
                );

                const message =
                    requestError?.response?.data?.detail ||
                    requestError?.response?.data?.message ||
                    "Failed to load moderation case.";

                setError(message);

            } finally {

                setLoading(false);

            }

        },
        [caseId]
    );


    // ============================================================
    // INITIAL LOAD
    // ============================================================

    useEffect(() => {

        fetchCase();

    }, [fetchCase]);


    // ============================================================
    // BACK HANDLER
    // ============================================================

    const handleBack = () => {

        navigate("/moderation");

    };


    // ============================================================
    // OPEN ACTION MODAL
    // ============================================================

    const handleOpenActionModal = () => {

        if (
            moderationCase?.decision === "resolved" ||
            moderationCase?.decision === "rejected"
        ) {
            return;
        }

        setActionError(null);
        setActionModalOpen(true);

    };


    // ============================================================
    // CLOSE ACTION MODAL
    // ============================================================

    const handleCloseActionModal = () => {

        if (actionLoading) {
            return;
        }

        setActionModalOpen(false);
        setActionError(null);

    };


    // ============================================================
    // SUBMIT ACTION
    // ============================================================

    const handleActionSubmit = async (payload) => {

        if (!caseId || !payload?.action_taken) {
            return;
        }

        try {

            setActionLoading(true);
            setActionError(null);

            /*
             * ModerationActionModal already creates the exact
             * ResolveModerationCaseSerializer payload:
             *
             * action_taken
             * action_reason
             * restriction_expires_at
             * suspension_expires_at
             * is_permanent
             * note
             */

            const caseData =
                await moderationService.resolveCase(
                    caseId,
                    payload
                );

            /*
             * resolveCase() also returns response.data
             * directly from moderationService.
             */

            setModerationCase(caseData);

            setActionModalOpen(false);

        } catch (requestError) {

            console.error(
                "Failed to resolve moderation case:",
                requestError
            );

            const responseData =
                requestError?.response?.data;

            let message =
                responseData?.detail ||
                responseData?.message ||
                "Failed to apply moderation action.";

            /*
             * DRF validation errors can sometimes be returned
             * as an object instead of detail/message.
             */

            if (
                typeof message === "object" &&
                message !== null
            ) {
                message = Object.entries(message)
                    .map(([field, messages]) => {

                        const values = Array.isArray(messages)
                            ? messages
                            : [messages];

                        return `${field}: ${values.join(", ")}`;

                    })
                    .join(" | ");
            }

            setActionError(message);

        } finally {

            setActionLoading(false);

        }

    };


    // ============================================================
    // LOADING STATE
    // ============================================================

    if (loading) {

        return (
            <main className="moderation-case-detail">

                <div className="moderation-case-detail__state">

                    <div className="moderation-case-detail__loader">
                    </div>

                    <h2>
                        Loading moderation case...
                    </h2>

                    <p>
                        Please wait while the case details are loaded.
                    </p>

                </div>

            </main>
        );
    }


    // ============================================================
    // ERROR STATE
    // ============================================================

    if (error) {

        return (
            <main className="moderation-case-detail">

                <div className="moderation-case-detail__state moderation-case-detail__state--error">

                    <div className="moderation-case-detail__state-icon">
                        !
                    </div>

                    <h2>
                        Unable to load case
                    </h2>

                    <p>
                        {error}
                    </p>

                    <div className="moderation-case-detail__state-actions">

                        <button
                            type="button"
                            onClick={fetchCase}
                        >
                            Try Again
                        </button>

                        <button
                            type="button"
                            onClick={handleBack}
                        >
                            Back to Cases
                        </button>

                    </div>

                </div>

            </main>
        );
    }


    // ============================================================
    // CASE NOT FOUND
    // ============================================================

    if (!moderationCase) {

        return (
            <main className="moderation-case-detail">

                <div className="moderation-case-detail__state">

                    <h2>
                        Case not found
                    </h2>

                    <p>
                        The requested moderation case could not be found.
                    </p>

                    <button
                        type="button"
                        onClick={handleBack}
                    >
                        Back to Cases
                    </button>

                </div>

            </main>
        );
    }


    // ============================================================
    // DERIVED DATA
    // ============================================================

    /*
     * Exact UserModerationCaseSerializer structure:
     *
     * moderationCase
     * ├── id
     * ├── report
     * │   └── reported_content
     * │       └── author
     * ├── assigned_to
     * ├── priority
     * ├── decision
     * ├── moderator_note
     * ├── started_at
     * ├── resolved_at
     * ├── created_at
     * ├── updated_at
     * └── action_logs
     */


    const report =
        moderationCase.report || null;


    const reports =
        report
            ? [report]
            : [];


    const content =
        report?.reported_content || null;


    const user =
        content?.author || null;


    const actionLogs =
        Array.isArray(moderationCase.action_logs)
            ? moderationCase.action_logs
            : [];


    const userHistory =
        actionLogs;


    const timeline =
        actionLogs;


    // ============================================================
    // ACTION STATE
    // ============================================================

    const caseClosed =
        moderationCase.decision === "resolved" ||
        moderationCase.decision === "rejected";


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <main className="moderation-case-detail">

            {/* ==================================================
                HEADER
            ================================================== */}

            <ModerationCaseHeader
                moderationCase={moderationCase}
                onBack={handleBack}
            />


            {/* ==================================================
                ACTION
            ================================================== */}

            {!caseClosed && (
                <div className="moderation-case-detail__actions">

                    <button
                        type="button"
                        className="moderation-case-detail__action-button"
                        onClick={handleOpenActionModal}
                        disabled={actionLoading}
                    >
                        Take Moderation Action
                    </button>

                </div>
            )}


            {/* ==================================================
                CONTENT
            ================================================== */}

            <div className="moderation-case-detail__content">

                <ModerationReportsPanel
                    reports={reports}
                />


                <ModerationContentPanel
                    content={content}
                />


                <ModerationUserHistory
                    user={user}
                    history={userHistory}
                />


                <ModerationCaseTimeLine
                    events={timeline}
                />

            </div>


            {/* ==================================================
                ACTION MODAL
            ================================================== */}

            <ModerationActionModal
                isOpen={actionModalOpen}
                moderationCase={moderationCase}
                onClose={handleCloseActionModal}
                onSubmit={handleActionSubmit}
                loading={actionLoading}
                error={actionError}
            />

        </main>
    );
};


export default ModerationCaseDetail;
