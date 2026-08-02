import {
    memo,
    useState,
} from "react";

import "./CommentForm.css";

const CommentForm = ({
    placeholder = "Write a comment...",
    disabled = false,
    loading = false,
    onSubmit,
}) => {

    const [content, setContent] = useState("");

    const handleSubmit = (event) => {

        event.preventDefault();

        const value = content.trim();

        if (!value || loading || disabled) {
            return;
        }

        onSubmit?.(value);

        setContent("");
    };

    return (
        
        <form
            className="comment-form"
            onSubmit={handleSubmit}
        >
            
            <textarea
                className="comment-input"
                value={content}
                onChange={(event) =>
                    setContent(
                        event.target.value
                    )
                }
                placeholder={placeholder}
                rows={2}
                maxLength={5000}
                disabled={disabled || loading}
            />

            <button
                type="submit"
                className="comment-submit-button"
                disabled={
                    disabled ||
                    loading ||
                    !content.trim()
                }
            >
                {loading
                    ? "Posting..."
                    : "Post"
                }

            </button>

        </form>
    );
};

export default memo(
    CommentForm
);