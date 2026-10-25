import {
    memo,
    useCallback,
    useEffect,
    useState,
} from "react";

import commentService from "../../services/commentService";
import CommentItem from "./CommentItem";

import "./CommentList.css";

const CommentList = ({
    postId,
}) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [content, setContent] = useState("");
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");
    const [nextUrl, setNextUrl] = useState(null);

    const loadComments = useCallback(
        async () => {
            if (!postId) {
                return;
            }

            try {
                setLoading(true);
                setError("");

                const response = await commentService.getComments({
                    content_type: "post",
                    object_id: postId,
                });

                const data = response.data;
                const results = Array.isArray(data)
                    ? data
                    : data?.results || [];

                setComments(results);

                setNextUrl(
                    Array.isArray(data)
                        ? null
                        : data?.next || null
                );
            } catch (error) {
                console.error(
                    "Failed to load comments:",
                    error
                );

                setError(
                    error?.response?.data?.detail ||
                    "Failed to load comments."
                );
            } finally {
                setLoading(false);
            }
        },
        [postId],
    );

    useEffect(() => {
        setComments([]);
        setNextUrl(null);
        setError("");
        setContent("");
        setFormError("");

        loadComments();
    }, [loadComments]);

    const handleCreateComment = async (event) => {
        event.preventDefault();

        const trimmedContent = content.trim();

        if (!localStorage.getItem("accessToken")) {
            setFormError("Please log in to comment.");
            return;
        }

        if (!trimmedContent) {
            setFormError("Comment cannot be empty.");
            return;
        }

        if (submitting) {
            return;
        }

        try {
            setSubmitting(true);
            setFormError("");

            await commentService.createComment({
                content_type: "post",
                object_id: postId,
                content: trimmedContent,
            });

            setContent("");
            await loadComments();
        } catch (error) {
            console.error(
                "Failed to create comment:",
                error
            );

            setFormError(
                error?.response?.data?.detail ||
                error?.response?.data?.content?.[0] ||
                "Failed to post comment. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleLoadMore = async () => {
        if (!nextUrl || loadingMore) {
            return;
        }

        try {
            setLoadingMore(true);
            setError("");

            const response = await commentService.getComments({
                content_type: "post",
                object_id: postId,
                page: getPageFromUrl(nextUrl),
            });

            const data = response.data;

            const results = Array.isArray(data)
                ? data
                : data?.results || [];

            setComments((previousComments) => [
                ...previousComments,
                ...results,
            ]);

            setNextUrl(
                Array.isArray(data)
                    ? null
                    : data?.next || null
            );
        } catch (error) {
            console.error(
                "Failed to load more comments:",
                error
            );

            setError(
                error?.response?.data?.detail ||
                "Failed to load more comments."
            );
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="comment-list">
                <CommentForm
                    content={content}
                    setContent={setContent}
                    submitting={submitting}
                    formError={formError}
                    setFormError={setFormError}
                    onSubmit={handleCreateComment}
                />

                <div className="comment-list-status">
                    Loading comments...
                </div>
            </div>
        );
    }

    return (
        <div className="comment-list">
            <CommentForm
                content={content}
                setContent={setContent}
                submitting={submitting}
                formError={formError}
                setFormError={setFormError}
                onSubmit={handleCreateComment}
            />

            {error && (
                <div className="comment-list-status comment-list-error">
                    {error}
                </div>
            )}

            {!comments.length ? (
                <div className="comment-list-status">
                    No comments yet. Be the first to comment!
                </div>
            ) : (
                comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                    />
                ))
            )}

            {nextUrl && (
                <button
                    type="button"
                    className="comment-load-more"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                >
                    {loadingMore ? "Loading..." : "Load more"}
                </button>
            )}
        </div>
    );
};

const CommentForm = ({
    content,
    setContent,
    submitting,
    formError,
    setFormError,
    onSubmit,
}) => {
    return (
        <form
            className="comment-create-form"
            onSubmit={onSubmit}
        >
            <textarea
                className="comment-create-input"
                value={content}
                onChange={(event) => {
                    setContent(event.target.value);

                    if (formError) {
                        setFormError("");
                    }
                }}
                placeholder="Write a comment..."
                rows={3}
                maxLength={5000}
                aria-label="Write a comment"
                required
            />

            {formError && (
                <p
                    className="comment-inline-error"
                    role="alert"
                >
                    {formError}
                </p>
            )}

            <div className="comment-create-actions">
                <button
                    type="submit"
                    className="comment-create-submit"
                    disabled={submitting || !content.trim()}
                >
                    {submitting ? "Posting..." : "Post comment"}
                </button>
            </div>
        </form>
    );
};

const getPageFromUrl = (url) => {
    if (!url) {
        return null;
    }

    try {
        const parsedUrl = new URL(url);

        return parsedUrl.searchParams.get("page") || 1;
    } catch {
        return 1;
    }
};

export default memo(CommentList);
