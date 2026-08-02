import {
    memo,
    useEffect,
} from "react";
import { createPortal } from "react-dom";

import {
    FiX,
} from "react-icons/fi";

import CommentForm from "./CommentForm";

import "./CommentModal.css";

const CommentModal = ({
    isOpen = false,
    title = "Comments",
    onClose,
    onSubmit,
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

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };

    }, [
        isOpen,
        onClose,
    ]);

    if (!isOpen) {
        return null;
    }

    return createPortal (
        <div
            className="comment-modal-overlay"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="comment-modal"
                onClick={(event) =>
                    event.stopPropagation()
                }
                role="dialog"
                aria-modal="true"
                aria-labelledby="comment-modal-title"
            >
                <header className="comment-modal-header">

                    <h3
                        id="comment-modal-title"
                        className="comment-modal-title"
                    >
                        {title}
                    </h3>

                    <button
                        type="button"
                        className="comment-modal-close"
                        onClick={onClose}
                        aria-label="Close comments"
                        title="Close"
                    >
                        <FiX />
                    </button>

                </header>

                <div className="comment-modal-body">

                    <CommentForm
                        onSubmit={onSubmit}
                    />

                    {children}

                </div>

            </div>
        </div>,
        document.body
    );
};

export default memo(
    CommentModal
);