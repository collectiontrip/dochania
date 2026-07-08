import { memo } from "react";

import {
    FiHeart,
    FiMessageCircle,
    FiShare2,
} from "react-icons/fi";

import {
    FaHeart,
} from "react-icons/fa";

import "./PostActions.css";

const PostActions = ({
    isLiked = false,

    likeDisabled = false,
    commentDisabled = false,
    shareDisabled = false,

    onLike = () => {},
    onComment = () => {},
    onShare = () => {},
}) => {
    return (
        <div className="post-actions">

            <button
                type="button"
                className={`post-action-btn ${
                    isLiked ? "liked" : ""
                }`}
                onClick={onLike}
                disabled={likeDisabled}
                aria-label={isLiked ? "Unlike post" : "Like post"}
                aria-pressed={isLiked}
                aria-disabled={likeDisabled}
                title={isLiked ? "Unlike" : "Like"}
            >
                {isLiked ? (
                    <FaHeart className="post-action-icon" />
                ) : (
                    <FiHeart className="post-action-icon" />
                )}

                <span>Like</span>
            </button>

            <button
                type="button"
                className="post-action-btn"
                onClick={onComment}
                disabled={commentDisabled}
                aria-label="View comments"
                aria-disabled={commentDisabled}
                title="Comment"
            >
                <FiMessageCircle className="post-action-icon" />

                <span>Comment</span>
            </button>

            <button
                type="button"
                className="post-action-btn"
                onClick={onShare}
                disabled={shareDisabled}
                aria-label="Share post"
                aria-disabled={shareDisabled}
                title="Share"
            >
                <FiShare2 className="post-action-icon" />

                <span>Share</span>
            </button>

        </div>
    );
};

export default memo(PostActions);