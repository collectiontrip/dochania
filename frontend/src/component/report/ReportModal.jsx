import {
    useEffect,
    useState,
} from "react";


import reportService from "../../services/reportService";


import "./ReportModal.css";


// ============================================================
// REPORT MODAL
// ============================================================

const ReportModal = ({
    isOpen,
    contentType,
    objectId,
    onClose,
}) => {

    const [
        reasons,
        setReasons,
    ] = useState([]);


    const [
        reason,
        setReason,
    ] = useState("");


    const [
        description,
        setDescription,
    ] = useState("");


    const [
        loadingReasons,
        setLoadingReasons,
    ] = useState(false);


    const [
        submitting,
        setSubmitting,
    ] = useState(false);


    const [
        error,
        setError,
    ] = useState("");


    const [
        submitted,
        setSubmitted,
    ] = useState(false);


    // ============================================================
    // ERROR HANDLER
    // ============================================================

    const getErrorMessage = (
        error,
        fallback = "Something went wrong.",
    ) => {

        const data =
            error?.response?.data;


        if (
            typeof data?.detail ===
            "string"
        ) {

            return data.detail;

        }


        if (
            typeof data ===
            "string"
        ) {

            return data;

        }


        if (
            data &&
            typeof data ===
            "object"
        ) {

            const values =
                Object.values(data);


            for (
                const value
                of values
            ) {

                if (
                    Array.isArray(
                        value,
                    )
                ) {

                    const message =
                        value.find(
                            (item) =>
                                typeof item ===
                                "string",
                        );


                    if (message) {

                        return message;

                    }

                }


                if (
                    typeof value ===
                    "string"
                ) {

                    return value;

                }

            }

        }


        return fallback;
    };


    // ============================================================
    // LOAD REPORT REASONS
    // ============================================================

    useEffect(() => {

        // --------------------------------------------------------
        // DO NOT LOAD WHEN MODAL IS CLOSED
        // --------------------------------------------------------

        if (!isOpen) {

            return;

        }


        let isMounted = true;


        const loadReasons = async () => {

            setLoadingReasons(
                true,
            );

            setError("");


            try {

                const data =
                    await reportService.getReportReasons();


                if (!isMounted) {

                    return;

                }


                setReasons(
                    Array.isArray(
                        data,
                    )
                        ? data
                        : [],
                );

            }

            catch (error) {

                if (!isMounted) {

                    return;

                }


                setError(
                    getErrorMessage(
                        error,
                        "Unable to load report reasons.",
                    ),
                );

            }

            finally {

                if (isMounted) {

                    setLoadingReasons(
                        false,
                    );

                }

            }

        };


        loadReasons();


        return () => {

            isMounted = false;

        };

    }, [isOpen]);


    // ============================================================
    // RESET FORM WHEN MODAL OPENS
    // ============================================================

    useEffect(() => {

        if (!isOpen) {

            return;

        }


        setSubmitted(false);

        setReason("");

        setDescription("");

        setError("");

    }, [isOpen]);


    // ============================================================
    // CLOSE MODAL
    // ============================================================

    const handleClose = () => {

        if (submitting) {

            return;

        }


        onClose();

    };


    // ============================================================
    // REASON CHANGE
    // ============================================================

    const handleReasonChange = (
        event,
    ) => {

        setReason(
            event.target.value,
        );

        setError("");

    };


    // ============================================================
    // DESCRIPTION CHANGE
    // ============================================================

    const handleDescriptionChange = (
        event,
    ) => {

        setDescription(
            event.target.value,
        );

        setError("");

    };


    // ============================================================
    // SUBMIT REPORT
    // ============================================================

    const handleSubmit = async (
        event,
    ) => {

        event.preventDefault();

        setError("");


        // --------------------------------------------------------
        // CONTENT TYPE VALIDATION
        // --------------------------------------------------------

        if (!contentType) {

            setError(
                "Content type is missing.",
            );

            return;

        }


        // --------------------------------------------------------
        // OBJECT ID VALIDATION
        // --------------------------------------------------------

        if (!objectId) {

            setError(
                "Content ID is missing.",
            );

            return;

        }


        // --------------------------------------------------------
        // REASON VALIDATION
        // --------------------------------------------------------

        if (!reason) {

            setError(
                "Please select a reason.",
            );

            return;

        }


        setSubmitting(
            true,
        );


        try {

            await reportService.createReport({
                contentType,
                objectId,
                reason,
                description,
            });


            setSubmitted(
                true,
            );

            setReason("");

            setDescription("");

        }

        catch (error) {

            setError(
                getErrorMessage(
                    error,
                    "Unable to submit report. "
                    + "Please try again.",
                ),
            );

        }

        finally {

            setSubmitting(
                false,
            );

        }

    };


    // ============================================================
    // MODAL CLOSED
    // ============================================================

    if (!isOpen) {

        return null;

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div
            className="report-modal-overlay"
            role="presentation"
            onClick={
                handleClose
            }
        >

            <div
                className="report-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-modal-title"
                onClick={(
                    event,
                ) => {

                    event.stopPropagation();

                }}
            >

                {
                    submitted ? (

                        // ==================================================
                        // SUCCESS
                        // ==================================================

                        <div
                            className={
                                "report-modal-success"
                            }
                        >

                            <h2>
                                Report submitted
                            </h2>


                            <p>
                                Thanks for reporting
                                this content.
                            </p>


                            <p>
                                Our moderation team
                                will review your report.
                            </p>


                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                            >
                                Done
                            </button>

                        </div>

                    ) : (

                        // ==================================================
                        // FORM
                        // ==================================================

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            noValidate
                        >

                            {/* ==================================================
                                HEADER
                            ================================================== */}

                            <div
                                className={
                                    "report-modal-header"
                                }
                            >

                                <h2
                                    id={
                                        "report-modal-title"
                                    }
                                >
                                    Report Content
                                </h2>


                                <button
                                    type="button"
                                    onClick={
                                        handleClose
                                    }
                                    disabled={
                                        submitting
                                    }
                                    aria-label={
                                        "Close report dialog"
                                    }
                                >
                                    ×
                                </button>

                            </div>


                            {/* ==================================================
                                BODY
                            ================================================== */}

                            <div
                                className={
                                    "report-modal-body"
                                }
                            >

                                {/* ------------------------------------------------
                                    REASON
                                ------------------------------------------------ */}

                                <label
                                    htmlFor={
                                        "report-reason"
                                    }
                                >
                                    Why are you
                                    reporting this?
                                </label>


                                <select
                                    id={
                                        "report-reason"
                                    }
                                    value={
                                        reason
                                    }
                                    onChange={
                                        handleReasonChange
                                    }
                                    disabled={
                                        loadingReasons ||
                                        submitting
                                    }
                                    required
                                >

                                    <option
                                        value=""
                                    >
                                        {
                                            loadingReasons
                                                ? "Loading reasons..."
                                                : "Select a reason"
                                        }
                                    </option>


                                    {
                                        reasons.map(
                                            (item) => (

                                                <option
                                                    key={
                                                        item.value
                                                    }
                                                    value={
                                                        item.value
                                                    }
                                                >
                                                    {
                                                        item.label
                                                    }
                                                </option>

                                            ),
                                        )
                                    }

                                </select>


                                {/* ------------------------------------------------
                                    DESCRIPTION
                                ------------------------------------------------ */}

                                <label
                                    htmlFor={
                                        "report-description"
                                    }
                                >
                                    Additional details

                                    <span>
                                        {" "}
                                        (optional)
                                    </span>
                                </label>


                                <textarea
                                    id={
                                        "report-description"
                                    }
                                    value={
                                        description
                                    }
                                    onChange={
                                        handleDescriptionChange
                                    }
                                    placeholder={
                                        "Tell us more about the issue..."
                                    }
                                    maxLength={
                                        2000
                                    }
                                    rows={
                                        5
                                    }
                                    disabled={
                                        submitting
                                    }
                                />


                                {/* ------------------------------------------------
                                    CHARACTER COUNT
                                ------------------------------------------------ */}

                                <div
                                    className={
                                        "report-character-count"
                                    }
                                    aria-live={
                                        "polite"
                                    }
                                >
                                    {
                                        description.length
                                    }
                                    /2000
                                </div>


                                {/* ------------------------------------------------
                                    ERROR
                                ------------------------------------------------ */}

                                {
                                    error && (

                                        <div
                                            className={
                                                "report-error"
                                            }
                                            role={
                                                "alert"
                                            }
                                        >
                                            {
                                                error
                                            }
                                        </div>

                                    )
                                }

                            </div>


                            {/* ==================================================
                                FOOTER
                            ================================================== */}

                            <div
                                className={
                                    "report-modal-footer"
                                }
                            >

                                <button
                                    type="button"
                                    onClick={
                                        handleClose
                                    }
                                    disabled={
                                        submitting
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    disabled={
                                        loadingReasons ||
                                        submitting ||
                                        !reason
                                    }
                                >
                                    {
                                        submitting
                                            ? "Submitting..."
                                            : "Submit Report"
                                    }
                                </button>

                            </div>

                        </form>

                    )
                }

            </div>

        </div>

    );

};


export default ReportModal;