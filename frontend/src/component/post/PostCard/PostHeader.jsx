import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
    FiGlobe,
    FiUser,
    FiLock,
    FiCheckCircle,
    FiMoreHorizontal,
    FiEdit2,
    FiTrash2,
    FiFlag,
} from "react-icons/fi";

import "./PostHeader.css";

const visibilityIcons = {
    public: <FiGlobe />,
    followers: <FiUser />,
    private: <FiLock />,
};

const PostHeader = ({ post }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const author = post.author;

    const profileUrl = author
        ? `/profile/${author.username}`
        : "#";

    const avatarSrc =
        author?.profile_picture || "/default-avatar.png";

    const createdTime = formatDistanceToNowStrict(
        new Date(post.created_at),
        { addSuffix: true }
    );

    const isEdited =
        post.updated_at &&
        new Date(post.updated_at) >
            new Date(post.created_at);

    const toggleMenu = () => {
        setMenuOpen((prev) => !prev);
    };

    return (
        <header className="post-header">
            <div className="post-author">
                <Link
                    to={profileUrl}
                    className="post-avatar-link"
                >
                    <img
                        className="post-avatar"
                        src={avatarSrc}
                        alt={`${author?.username ?? "User"}'s profile`}
                    />
                </Link>

                <div className="post-author-info">
                    <div className="post-author-top">
                        <Link
                            to={profileUrl}
                            className="post-username"
                        >
                            {author?.username ?? "Unknown User"}
                        </Link>

                        {author?.is_verified && (
                            <FiCheckCircle className="verified-badge" />
                        )}
                    </div>

                    <div className="post-meta">
                        <span>{createdTime}</span>

                        <span className="dot">•</span>

                        <span
                            className="visibility-icon"
                            title={post.visibility}
                        >
                            {visibilityIcons[post.visibility] ?? (
                                <FiGlobe />
                            )}
                        </span>

                        {isEdited && (
                            <>
                                <span className="dot">•</span>
                                <span>Edited</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="post-menu-wrapper">
                <button
                    type="button"
                    className="post-menu-button"
                    onClick={toggleMenu}
                    aria-label="Post options"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                >
                    <FiMoreHorizontal />
                </button>

                {menuOpen && (
                    <div
                        className="post-dropdown"
                        role="menu"
                    >
                        <button
                            type="button"
                            role="menuitem"
                        >
                            <FiEdit2 />
                            Edit
                        </button>

                        <button
                            type="button"
                            role="menuitem"
                        >
                            <FiTrash2 />
                            Delete
                        </button>

                        <button
                            type="button"
                            role="menuitem"
                        >
                            <FiFlag />
                            Report
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default PostHeader;