import {
    useState,
} from "react";


import ReportModal from "./ReportModal";


import "./ReportButton.css";


const ReportButton = ({
    contentType,
    objectId,
    className = "",
}) => {

    const [isOpen, setIsOpen] =
        useState(false);


    // ============================================================
    // OPEN MODAL
    // ============================================================

    const handleOpenReport = () => {

        setIsOpen(true);

    };


    // ============================================================
    // CLOSE MODAL
    // ============================================================

    const handleCloseReport = () => {

        setIsOpen(false);

    };


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <>

            <button
                type="button"
                className={
                    `report-button ${className}`.trim()
                }
                onClick={
                    handleOpenReport
                }
                aria-label="Report content"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                Report
            </button>


            <ReportModal
                isOpen={isOpen}
                contentType={
                    contentType
                }
                objectId={
                    objectId
                }
                onClose={
                    handleCloseReport
                }
            />

        </>
    );

};


export default ReportButton;