import {
    useEffect,
    useState,
} from "react";


import reportService from "../../services/reportService";


import "./ReportEvidenceUpload.css";


const MAX_FILES = 5;


const ReportEvidenceUpload = ({
    reportId,
    onUploaded,
    disabled = false,
    className = "",
}) => {

    const [files, setFiles] =
        useState([]);

    const [isUploading, setIsUploading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");


    // ============================================================
    // CLEANUP OBJECT URLS
    // ============================================================

    useEffect(() => {

        return () => {

            files.forEach(
                (item) => {

                    if (item.preview) {

                        URL.revokeObjectURL(
                            item.preview,
                        );

                    }

                },
            );

        };

    }, [files]);


    // ============================================================
    // FILE SELECT
    // ============================================================

    const handleFileChange = (
        event,
    ) => {

        const selectedFiles =
            Array.from(
                event.target.files || [],
            );


        if (!selectedFiles.length) {
            return;
        }


        setError("");
        setSuccess("");


        const remainingSlots =
            MAX_FILES -
            files.length;


        if (remainingSlots <= 0) {

            setError(
                "Maximum 5 evidence files are allowed.",
            );


            event.target.value = "";

            return;
        }


        const filesToAdd =
            selectedFiles.slice(
                0,
                remainingSlots,
            );


        if (
            selectedFiles.length >
            remainingSlots
        ) {

            setError(
                `You can upload maximum ${MAX_FILES} evidence files.`,
            );

        }


        const newFiles =
            filesToAdd.map(
                (file) => ({

                    id:
                        crypto.randomUUID(),

                    file,

                    evidenceType:
                        file.type.startsWith(
                            "image/",
                        )
                            ? "image"
                            : "file",

                    preview:
                        file.type.startsWith(
                            "image/",
                        )
                            ? URL.createObjectURL(
                                file,
                            )
                            : null,

                }),
            );


        setFiles(
            (previous) => [
                ...previous,
                ...newFiles,
            ],
        );


        event.target.value = "";
    };


    // ============================================================
    // REMOVE FILE
    // ============================================================

    const handleRemove = (
        id,
    ) => {

        setFiles(
            (previous) => {

                const item =
                    previous.find(
                        (file) =>
                            file.id === id,
                    );


                if (item?.preview) {

                    URL.revokeObjectURL(
                        item.preview,
                    );

                }


                return previous.filter(
                    (file) =>
                        file.id !== id,
                );

            },
        );


        setError("");
        setSuccess("");
    };


    // ============================================================
    // UPLOAD
    // ============================================================

    const handleUpload = async () => {

        if (!reportId) {

            setError(
                "Report ID is required.",
            );

            return;
        }


        if (!files.length) {

            setError(
                "Please select at least one evidence file.",
            );

            return;
        }


        setIsUploading(true);

        setError("");
        setSuccess("");


        try {

            const uploadedEvidence =
                await reportService.uploadEvidenceFiles(
                    reportId,
                    files.map(
                        (item) => ({

                            file:
                                item.file,

                            evidenceType:
                                item.evidenceType,

                        }),
                    ),
                );


            setFiles([]);


            setSuccess(
                "Evidence uploaded successfully.",
            );


            if (onUploaded) {

                onUploaded(
                    uploadedEvidence,
                );

            }

        }

        catch (err) {

            const message =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to upload evidence.";


            setError(
                message,
            );

        }

        finally {

            setIsUploading(
                false,
            );

        }

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div
            className={
                `report-evidence-upload ${className}`
            }
        >

            <div
                className={
                    "report-evidence-upload__header"
                }
            >

                <h3>
                    Add Evidence
                </h3>


                <span>
                    {
                        files.length
                    }/
                    {
                        MAX_FILES
                    }
                </span>

            </div>


            {/* ==================================================
                FILE INPUT
            ================================================== */}

            <label
                className={
                    "report-evidence-upload__picker"
                }
            >

                <span>
                    Select Evidence
                </span>


                <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    onChange={
                        handleFileChange
                    }
                    disabled={
                        disabled ||
                        isUploading ||
                        files.length >=
                            MAX_FILES
                    }
                />

            </label>


            {/* ==================================================
                SELECTED FILES
            ================================================== */}

            {
                files.length > 0 && (

                    <div
                        className={
                            "report-evidence-upload__list"
                        }
                    >

                        {
                            files.map(
                                (item) => (

                                    <div
                                        key={
                                            item.id
                                        }
                                        className={
                                            "report-evidence-upload__item"
                                        }
                                    >

                                        {
                                            item.preview ? (

                                                <img
                                                    src={
                                                        item.preview
                                                    }
                                                    alt={
                                                        item.file.name
                                                    }
                                                    className={
                                                        "report-evidence-upload__preview"
                                                    }
                                                />

                                            ) : (

                                                <div
                                                    className={
                                                        "report-evidence-upload__file"
                                                    }
                                                >
                                                    {
                                                        item.file.name
                                                    }
                                                </div>

                                            )
                                        }


                                        <div
                                            className={
                                                "report-evidence-upload__info"
                                            }
                                        >

                                            <span>
                                                {
                                                    item.file.name
                                                }
                                            </span>


                                            <small>

                                                {
                                                    (
                                                        item.file.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(
                                                        2,
                                                    )
                                                }{" "}
                                                MB

                                            </small>

                                        </div>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemove(
                                                    item.id,
                                                )
                                            }
                                            disabled={
                                                disabled ||
                                                isUploading
                                            }
                                        >
                                            Remove
                                        </button>

                                    </div>

                                ),
                            )
                        }

                    </div>

                )
            }


            {/* ==================================================
                ERROR
            ================================================== */}

            {
                error && (

                    <p
                        className={
                            "report-evidence-upload__error"
                        }
                    >
                        {
                            error
                        }
                    </p>

                )
            }


            {/* ==================================================
                SUCCESS
            ================================================== */}

            {
                success && (

                    <p
                        className={
                            "report-evidence-upload__success"
                        }
                    >
                        {
                            success
                        }
                    </p>

                )
            }


            {/* ==================================================
                UPLOAD BUTTON
            ================================================== */}

            <button
                type="button"
                onClick={
                    handleUpload
                }
                disabled={
                    disabled ||
                    isUploading ||
                    !files.length ||
                    !reportId
                }
                className={
                    "report-evidence-upload__button"
                }
            >

                {
                    isUploading
                        ? "Uploading..."
                        : "Upload Evidence"
                }

            </button>

        </div>
    );
};


export default ReportEvidenceUpload;