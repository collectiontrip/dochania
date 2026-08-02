import { memo } from "react";

import {
    FiMessageCircle,
} from "react-icons/fi";

const CommentButton = ({
    commentCount = 0,
    hideCommentCount = false,
    disabled = false,
    onClick,
}) => {

    return (
        <button
            type="button"
            className="comment-button"
            onClick={onClick}
            disabled={disabled}
            aria-label="View comments"
            aria-disabled={disabled}
            title="Comments"
        >
            <FiMessageCircle
                className="comment-icon"
            />

            {!hideCommentCount && (
                <span className="comment-count">
                    {commentCount}
                </span>
            )}
        </button>
    );
};

export default memo(
    CommentButton
);