import { useState } from "react";

import "./PostContent.css";

const MAX_LENGTH = 220;

const PostContent = ({ content = "" }) => {
    const [expanded, setExpanded] = useState(false);

    const text = (content ?? "").trim();

    if (!text) {
        return null;
    }

    const shouldTruncate =
        text.length > MAX_LENGTH;

    const displayContent =
        expanded || !shouldTruncate
            ? text
            : `${text.slice(0, MAX_LENGTH)}...`;

    const toggleExpanded = () => {
        setExpanded((prev) => !prev);
    };

    return (
        <div className="post-content">
            <p className="post-content__text">
                {displayContent}
            </p>

            {shouldTruncate && (
                <button
                    type="button"
                    className="post-content__toggle"
                    onClick={toggleExpanded}
                >
                    {expanded
                        ? "Show Less"
                        : "Read More"}
                </button>
            )}
        </div>
    );
};

export default PostContent;