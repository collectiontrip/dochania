import { memo } from "react";

import {
    FiShare2,
} from "react-icons/fi";

import LikeButton from "../../like/LikeButton";
import CommentButton from "../../comment/commentButton";

import "./PostActions.css";

const PostActions = ({
    contentType = "post",
    objectId,

    isLiked = false,
    likeCount = 0,
    hideLikeCount = false,

    commentCount = 0,
    hideCommentCount = false,

    likeDisabled = false,
    commentDisabled = false,
    shareDisabled = false,

    onLikeChange = () => {},
    onLikeList = () => {},
    onComment = () => {},
    onShare = () => {},
}) => {

    return (
        <div className="post-actions">

            <LikeButton
                contentType={contentType}
                objectId={objectId}
                isLiked={isLiked}
                likeCount={likeCount}
                hideLikeCount={hideLikeCount}
                disabled={likeDisabled}
                onChange={onLikeChange}
                onLikeList={onLikeList}
            />

            <CommentButton
                commentCount={commentCount}
                hideCommentCount={hideCommentCount}
                disabled={commentDisabled}
                onClick={onComment}
            />

            <button
                type="button"
                className="post-action-btn"
                onClick={onShare}
                disabled={shareDisabled}
                aria-label="Share post"
                aria-disabled={shareDisabled}
                title="Share"
            >
                <FiShare2
                    className="post-action-icon"
                />

                <span>
                    Share
                </span>
            </button>

        </div>
    );
};

export default memo(PostActions);