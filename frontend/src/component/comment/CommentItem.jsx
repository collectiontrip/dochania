import {
    memo,
} from "react";

import "./CommentItem.css";


const CommentItem = ({
    comment,
}) => {

    if (!comment) {
        return null;
    }

    const user = comment.user;

    return (
        <article className="comment-item">

            <div className="comment-item-avatar">

                {user?.profile_picture ? (
                    <img
                        src={user.profile_picture}
                        alt={
                            user.username ||
                            "User"
                        }
                        className="comment-user-avatar"
                    />
                ): (
                  
                    <div 
                        className="comment-user-avatar comment-user-avatar-fallback"
                        aria-hidden="true"
                    >
                        {user?.username
                            ?.charAt(0)
                            ?.toUpperCase() || "U"
                        }

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
                        {user?.username ||
                            "User"}
                        
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
                            dateTime={
                                comment.created_at
                            }
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

            </div>

        </article>

    );

};


export default memo(
    CommentItem
);

