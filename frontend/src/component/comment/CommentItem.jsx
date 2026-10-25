
import {
    memo,
    useCallback,
    useEffect,
    useState,
} from "react";

import commentService from "../../services/commentService";
import likeService from "../../services/likesServices";

import "./CommentItem.css";

const getResults = (data) => {
    if (Array.isArray(data)) {
        return data;
    }

    return data?.results || [];
};

const CommentNode = ({
    comment,
    depth = 0,
}) => {
    const [likesCount, setLikesCount] = useState(
        comment?.likes_count || 0
    );

    const [isLiked, setIsLiked] = useState(
        Boolean(comment?.is_liked)
    );

    const [likeLoading, setLikeLoading] = useState(false);
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [replyLoading, setReplyLoading] = useState(false);
    const [repliesOpen, setRepliesOpen] = useState(false);
    const [replies, setReplies] = useState([]);
    const [repliesLoading, setRepliesLoading] = useState(false);
    const [repliesLoaded, setRepliesLoaded] = useState(false);
    const [error, setError] = useState("");

    const user = comment?.user;

    useEffect(() => {
        setLikesCount(comment?.likes_count || 0);
        setIsLiked(Boolean(comment?.is_liked));
    }, [
        comment?.id,
        comment?.likes_count,
        comment?.is_liked,
    ]);

    const isAuthenticated = useCallback(() => {
        return Boolean(
            localStorage.getItem("accessToken")
        );
    }, []);

    const handleLike = async () => {
        if (!isAuthenticated()) {
            setError("Please log in to like comments.");
            return;
        }

        if (likeLoading) {
            return;
        }

        const previousLiked = isLiked;
        const previousCount = likesCount;

        setLikeLoading(true);
        setError("");

        setIsLiked(!previousLiked);
        setLikesCount(
            Math.max(
                0,
                previousCount + (previousLiked ? -1 : 1)
            )
        );

        try {
            if (previousLiked) {
                await likeService.deleteLike(
                    "comment",
                    comment.id
                );
            } else {
                await likeService.createLike(
                    "comment",
                    comment.id
                );
            }
        } catch (err) {
            setIsLiked(previousLiked);
            setLikesCount(previousCount);

            setError(
                err?.response?.data?.detail ||
                "Unable to update like. Please try again."
            );
        } finally {
            setLikeLoading(false);
        }
    };

    const loadReplies = async () => {
        if (repliesLoading || repliesLoaded) {
            return;
        }

        setRepliesLoading(true);
        setError("");

        try {
            const response = await commentService.getReplies(
                comment.id
            );

            setReplies(getResults(response.data));
            setRepliesLoaded(true);
        } catch (err) {
            setError(
                err?.response?.data?.detail ||
                "Unable to load replies."
            );
        } finally {
            setRepliesLoading(false);
        }
    };

    const handleToggleReplies = async () => {
        const nextOpen = !repliesOpen;

        setRepliesOpen(nextOpen);

        if (
            nextOpen &&
            !repliesLoaded
        ) {
            await loadReplies();
        }
    };

    const handleCreateReply = async (event) => {
        event.preventDefault();

        const content = replyText.trim();

        if (!isAuthenticated()) {
            setError("Please log in to reply.");
            return;
        }

        if (!content || replyLoading) {
            return;
        }

        setReplyLoading(true);
        setError("");

        try {
            const response = await commentService.createComment({
                content_type: "comment",
                object_id: comment.id,
                parent: comment.id,
                content,
            });

            const newReply = {
                ...response.data,
                parent: comment.id,
                likes_count: response.data?.likes_count || 0,
                replies_count: response.data?.replies_count || 0,
                is_liked: Boolean(response.data?.is_liked),
            };

            setReplies((previous) => [
                ...previous,
                newReply,
            ]);

            setRepliesLoaded(true);
            setRepliesOpen(true);
            setReplyOpen(false);
            setReplyText("");
        } catch (err) {
            setError(
                err?.response?.data?.detail ||
                err?.response?.data?.content?.[0] ||
                err?.response?.data?.parent?.[0] ||
                "Unable to create reply. Please try again."
            );
        } finally {
            setReplyLoading(false);
        }
    };

    if (!comment) {
        return null;
    }

    return (
        <article
            className={`comment-item ${depth > 0 ? "comment-item-reply" : ""}`}
        >
            <div className="comment-item-avatar">
                {user?.profile_picture ? (
                    <img
                        src={user.profile_picture}
                        alt={user.username || "User"}
                        className="comment-user-avatar"
                    />
                ) : (
                    <div
                        className="comment-user-avatar comment-user-avatar-fallback"
                        aria-hidden="true"
                    >
                        {user?.username?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                )}

                {user?.is_online && (
                    <span
                        className="comment-online-indicator"
                        aria-label="Online"
                    />
                )}
            </div>

            <div className="comment-item-main">
                <div className="comment-item-header">
                    <span className="comment-author">
                        {user?.username || "User"}
                    </span>

                    {user?.is_verified && (
                        <span
                            className="comment-verified"
                            title="Verified"
                            aria-label="Verified user"
                        >
                            ✓
                        </span>
                    )}
                </div>

                <div className="comment-item-content">
                    {comment.content}
                </div>

                <div className="comment-item-footer">
                    {comment.created_at && (
                        <time
                            dateTime={comment.created_at}
                            className="comment-date"
                        >
                            {new Date(
                                comment.created_at
                            ).toLocaleString()}
                        </time>
                    )}

                    {comment.is_edited && (
                        <span className="comment-edited">
                            Edited
                        </span>
                    )}
                </div>

                <div className="comment-item-actions">
                    <button
                        type="button"
                        className={`comment-action-button ${isLiked ? "is-liked" : ""}`}
                        onClick={handleLike}
                        disabled={likeLoading}
                        aria-pressed={isLiked}
                    >
                        {isLiked ? "♥ Liked" : "♡ Like"}
                        {" "}
                        ({likesCount})
                    </button>

                    <button
                        type="button"
                        className="comment-action-button"
                        onClick={() => {
                            setReplyOpen((previous) => !previous);
                            setError("");
                        }}
                    >
                        Reply
                    </button>

                    {(comment.replies_count > 0 || replies.length > 0) && (
                        <button
                            type="button"
                            className="comment-action-button"
                            onClick={handleToggleReplies}
                        >
                            {repliesOpen ? "Hide replies" : "View replies"}
                            {" "}
                            ({Math.max(
                                comment.replies_count || 0,
                                replies.length
                            )})
                        </button>
                    )}
                </div>

                {replyOpen && (
                    <form
                        className="comment-reply-form"
                        onSubmit={handleCreateReply}
                    >
                        <textarea
                            value={replyText}
                            onChange={(event) => {
                                setReplyText(event.target.value);
                            }}
                            placeholder={`Reply to ${user?.username || "this comment"}...`}
                            rows={2}
                            maxLength={5000}
                            required
                        />

                        <div className="comment-reply-form-actions">
                            <button
                                type="button"
                                className="comment-action-button"
                                onClick={() => {
                                    setReplyOpen(false);
                                    setReplyText("");
                                }}
                                disabled={replyLoading}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="comment-reply-submit"
                                disabled={
                                    replyLoading ||
                                    !replyText.trim()
                                }
                            >
                                {replyLoading ? "Sending..." : "Send reply"}
                            </button>
                        </div>
                    </form>
                )}

                {error && (
                    <p className="comment-inline-error" role="alert">
                        {error}
                    </p>
                )}

                {repliesOpen && (
                    <div className="comment-nested-replies">
                        {repliesLoading ? (
                            <p className="comment-replies-status">
                                Loading replies...
                            </p>
                        ) : replies.length > 0 ? (
                            replies.map((reply) => (
                                <CommentNode
                                    key={reply.id}
                                    comment={reply}
                                    depth={depth + 1}
                                />
                            ))
                        ) : (
                            <p className="comment-replies-status">
                                No replies yet.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
};

const CommentItem = ({ comment }) => {
    if (!comment) {
        return null;
    }

    return (
        <CommentNode
            comment={comment}
        />
    );
};

export default memo(CommentItem);
