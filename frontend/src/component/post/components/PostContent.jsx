import { useLayoutEffect, useRef } from "react";

import "./PostContent.css";

const MAX_CONTENT_LENGTH = 5000;

const PostContent = ({
    value = "",
    onChange,
    error,
    disabled = false,
}) => {

    const textareaRef = useRef(null);

    useLayoutEffect(() => {

        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        textarea.style.height = "auto";
        textarea.style.overflowY = "hidden";
        textarea.style.height = `${textarea.scrollHeight}px`;

    }, [value]);

    const handleChange = (event) => {

        if (typeof onChange !== "function") {
            return;
        }

        onChange(event.target.value);

    };

    const characterCount = value.length;

    const isNearLimit =
        characterCount >= MAX_CONTENT_LENGTH * 0.9;

    return (
        <section
            className="post-content"
            aria-labelledby="post-content-heading"
        >
            <div className="post-content__header">

                <h3
                    id="post-content-heading"
                    className="post-content__title"
                >
                    Post Content
                </h3>

                <p className="post-content__subtitle">
                    Share your thoughts, updates, or ideas with your audience.
                </p>

            </div>

            <div className="post-content__body">

                <textarea
                    ref={textareaRef}
                    className={
                        error
                            ? "post-content__textarea post-content__textarea--error"
                            : "post-content__textarea"
                    }
                    value={value}
                    onChange={handleChange}
                    placeholder="What's on your mind?"
                    disabled={disabled}
                    maxLength={MAX_CONTENT_LENGTH}
                    rows={4}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error
                            ? "post-content-counter post-content-error"
                            : "post-content-counter"
                    }
                />

                <div className="post-content__footer">

                    <span
                        id="post-content-counter"
                        aria-live="polite"
                        className={
                            isNearLimit
                                ? "post-content__counter post-content__counter--warning"
                                : "post-content__counter"
                        }
                    >
                        {characterCount} / {MAX_CONTENT_LENGTH}
                    </span>

                </div>

                {error && (
                    <p
                        id="post-content-error"
                        className="post-content__error"
                        role="alert"
                    >
                        {error}
                    </p>
                )}

            </div>
        </section>
    );
};

export default PostContent;