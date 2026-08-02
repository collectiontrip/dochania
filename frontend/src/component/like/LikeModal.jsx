import {
    useEffect,
} from "react";

import {
    FiX,
} from "react-icons/fi";

import "./LikeModal.css";

const LikeModal = ({
    isOpen = false,
    title = "Likes",
    onClose,
    children,
}) => {

    useEffect(() => {

        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event) => {

            if (event.key === "Escape") {
                onClose?.();
            }

        };

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        document.body.style.overflow = "hidden";

        return () => {

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );

            document.body.style.overflow = "";

        };

    }, [
        isOpen,
        onClose,
    ]);

    if (!isOpen) {
        return null;
    }

    return (

        <div
            className="like-modal-overlay"
            onClick={onClose}
        >

            <div
                className="like-modal"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >

                <div className="like-modal-header">

                    <h2>
                        {title}
                    </h2>

                    <button
                        type="button"
                        className="like-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <FiX />
                    </button>

                </div>

                <div className="like-modal-body">

                    {children}

                </div>

            </div>

        </div>

    );

};

export default LikeModal;