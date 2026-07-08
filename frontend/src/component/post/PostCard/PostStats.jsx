import { FaHeart } from "react-icons/fa";

import "./PostStats.css";

const PostStats = ({
    likeCount = 0,
    commentCount = 0,
    shareCount = 0,
}) => {
    return (
        <div className="post-stats">

            <div className="post-stats-left">

                <FaHeart className="post-like-icon" />

                <span className="post-like-count">
                    {likeCount}
                </span>

            </div>

            <div className="post-stats-right">

                <span className="post-stat-item">
                    {commentCount}{" "}
                    {commentCount === 1 ? "Comment" : "Comments"}
                </span>

                <span className="post-stat-separator">
                    •
                </span>

                <span className="post-stat-item">
                    {shareCount}{" "}
                    {shareCount === 1 ? "Share" : "Shares"}
                </span>

            </div>

        </div>
    );
};

export default PostStats;