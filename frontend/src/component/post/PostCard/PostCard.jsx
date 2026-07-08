import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostMedia from "./PostMedia";
import PostStats from "./PostStats";
import PostActions from "./PostActions";

import "./PostCard.css";

const PostCard = ({ post }) => {
    if (!post) {
        return null;
    }

    return (
        <article className="post-card">

            <PostHeader post={post} />

            {post.content && (
                <PostContent
                    content={post.content}
                />
            )}

            {post.media?.length > 0 && (
                <PostMedia
                    media={post.media}
                />
            )}

            <PostStats
                likeCount={post.like_count ?? 0}
                commentCount={post.comment_count ?? 0}
                shareCount={post.share_count ?? 0}
            />

            <PostActions
                isLiked={post.is_liked ?? false}
            />

        </article>
    );
};

export default PostCard;