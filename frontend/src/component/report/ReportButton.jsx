import { useEffect, useState } from "react";

import reportService from "../../services/reportService";


function ReportButton({
    contentType,
    objectId,
    className = "",
}) {

    const [isOpen, setIsOpen] = useState(false);

    const [reasons, setReasons] = useState([]);

    const [reason, setReason] = useState("");

    const [description, setDescription] = useState("");

    const [loadingReasons, setLoadingReasons] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");

    const [submitted, setSubmitted] = useState(false);


    // ============================================================
    // ERROR HANDLER
    // ============================================================

    const getErrorMessage = (
        error,
        fallback = "Something went wrong.",
    ) => {
        const data = error?.response?.data;

        if (
            typeof data?.detail === "string"
        ) {
            return data.detail;
        }

        if (
            typeof data === "string"
        ) {
            return data;
        }

        if (
            data
            && typeof data === "object"
        ) {
            const values = Object.values(data);

            for (const value of values) {

                if (Array.isArray(value)) {

                    const message = value.find(
                        (item) =>
                            typeof item === "string",
                    );

                    if (message) {
                        return message;
                    }
                }

                if (
                    typeof value === "string"
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

        if (
            !isOpen
            || reason.length > 0
        ) {
            return;
        }

        let isMounted = true;

        const loadReasons = async () => {

            setLoadingReasons(true);
            setError("");

            try {

                const data = 
                    await reportService.getReportReasons();

                if (!isMounted) {
                    return;
                }

                setReasons(
                    Array.isArray(data)
                        ? data
                        : [],
                );
                
            } catch (error) {

                if (!isMounted) {
                    return;
                }

                setError(
                    getErrorMessage(
                        error,
                        "Unable to load report reasons.",
                    ),
                );

            } finally {

                if (isMounted) {
                    setLoadingReasons(false);
                }
            }

        };

        loadReasons();

        return () => {
            isMounted = false;
        };
        
    }, [
        isOpen,
        reason.length,
    ]);
}