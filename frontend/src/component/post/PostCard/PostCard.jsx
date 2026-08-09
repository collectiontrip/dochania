import {
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostMedia from "./PostMedia";
import PostStats from "./PostStats";
import PostActions from "./PostActions";


import CommentModal from "../../comment/CommentModal";
import LikeModal from "../../like/LikeModal";
import LikeList from "../../like/LikeList";

import commentService from "../../../services/commentService";

import "./PostCard.css";

const PostCard = ({ post }) => {
    const navigate = useNavigate();

    const [isCommentOpen, setIsCommentOpen] =
        useState(false);

    const [isLikeOpen, setIsLikeOpen] =
        useState(false);

    const [commentLoading, setCommentLoading] =
        useState(false);
    
    

    if (!post) {
        return null;
    }

    const handleOpenComments = () => {
        setIsCommentOpen(true);
    };

    const handleCloseComments = () => {
        setIsCommentOpen(false);
    };

    const handleOpenLikes = () => {
        setIsLikeOpen(true);
    };

    const handleCloseLikes = () => {
        setIsLikeOpen(false);
    };

    const handleOpenPostDetail = () => {

        navigate(
            `/posts/${post.id}`
        );

    };

    const handleCreateComment = async (
        content,
    ) => {

        const payload = {
            content_type: "post",
            object_id: post.id,
            content,
        };

        console.log(
            "========== COMMENT REQUEST =========="
        );

        console.log(
            "Payload:",
            payload,
        );

        console.log(
            "Post ID:",
            post.id,
        );

        console.log(
            "Content:",
            content,
        );

        try {

            setCommentLoading(true);

            const response =
                await commentService.createComment(
                    payload,
                );

            console.log(
                "========== COMMENT SUCCESS =========="
            );

            console.log(
                response.data,
            );

            return response.data;

        }

        catch (error) {

            console.log(
                "========== COMMENT ERROR =========="
            );

            console.log(
                "Status:",
                error.response?.status,
            );

            console.log(
                "Response:",
                error.response?.data,
            );

            console.dir(
                error.response?.data,
            );

            console.log(
                "content_type error:",
                error.response?.data?.content_type,
            );

            console.log(
                "object_id error:",
                error.response?.data?.object_id,
            );

            console.log(
                "detail:",
                error.response?.data?.detail,
            );

            console.log(
                "Complete Error:",
                error,
            );

            return null;

        }

        finally {

            setCommentLoading(false);

        }

    };

    return (
        <>
            <article className="post-card">

                <PostHeader
                    post={post}
                />

                {
                    post.content && (
                        <div
                            onClick={handleOpenPostDetail}
                            className="post-card-clickable"
                        >

                            <PostContent
                                content={post.content}
                            />

                        </div>
                    )
                }

                {
                    post.media?.length > 0 && (
                        <div
                            onClick={handleOpenPostDetail}
                            className="post-card-clickable"
                        >

                            <PostMedia
                                media={post.media}
                            />

                        </div>
                    )
                }

                <PostStats
                    likeCount={
                        post.like_count ?? 0
                    }
                    commentCount={
                        post.comment_count ?? 0
                    }
                    shareCount={
                        post.share_count ?? 0
                    }
                />

                <PostActions
                    contentType="post"
                    objectId={post.id}
                    isLiked={
                        post.is_liked ?? false
                    }
                    likeCount={
                        post.like_count ?? 0
                    }
                    hideLikeCount={
                        post.hide_like_count ?? false
                    }
                    commentCount={
                        post.comment_count ?? 0
                    }
                    onLikeList={
                        handleOpenLikes
                    }
                    onComment={
                        handleOpenComments
                    }
                />

            </article>

            <CommentModal
                isOpen={isCommentOpen}
                title="Comments"
                onClose={
                    handleCloseComments
                }
                onSubmit={
                    handleCreateComment
                }
                loading={
                    commentLoading
                }
            />

            <LikeModal
                isOpen={isLikeOpen}
                title="Likes"
                onClose={
                    handleCloseLikes
                }
            >
                <LikeList
                    contentType="post"
                    objectId={post.id}
                />
            </LikeModal>

        </>
    );
};

export default PostCard;