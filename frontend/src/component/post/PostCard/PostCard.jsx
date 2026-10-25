
import {
    useEffect,
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
import postService from "../../../services/postService";
import subscriptionService from "../../../services/subscriptionService";

import "./PostCard.css";

const getErrorMessage = (error) => {
    const data = error?.response?.data;

    if (typeof data?.detail === "string") {
        return data.detail;
    }

    if (typeof data?.message === "string") {
        return data.message;
    }

    if (typeof data === "string") {
        return data;
    }

    if (error?.response?.status === 400) {
        return "Purchase failed. Check your coin balance and try again.";
    }

    if (error?.response?.status === 403) {
        return "You do not have permission to unlock this post.";
    }

    if (error?.response?.status === 404) {
        return "This post could not be found.";
    }

    return "Something went wrong. Please try again.";
};

const PostCard = ({ post }) => {
    const navigate = useNavigate();

    const [displayPost, setDisplayPost] = useState(post);

    const [isCommentOpen, setIsCommentOpen] =
        useState(false);

    const [isLikeOpen, setIsLikeOpen] =
        useState(false);

    const [commentLoading, setCommentLoading] =
        useState(false);

    const [purchaseLoading, setPurchaseLoading] =
        useState(false);

    const [purchaseError, setPurchaseError] =
        useState("");

    const [purchaseMessage, setPurchaseMessage] =
        useState("");

    useEffect(() => {
        setDisplayPost(post);
        setPurchaseError("");
        setPurchaseMessage("");
    }, [post]);

    if (!displayPost) {
        return null;
    }

    const isPaidPost =
        displayPost.access_type === "paid";

    const isUnlocked =
        displayPost.is_unlocked === true;

    const coinPrice = Number(displayPost.coins);

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
        navigate(`/posts/${displayPost.id}`);
    };

    const handleUnlockPost = async () => {
        if (
            purchaseLoading ||
            !isPaidPost ||
            isUnlocked ||
            !Number.isFinite(coinPrice) ||
            coinPrice <= 0
        ) {
            return;
        }

        setPurchaseLoading(true);
        setPurchaseError("");
        setPurchaseMessage("");

        let purchaseSucceeded = false;

        try {
            await subscriptionService.purchasePaidPost(
                displayPost.id
            );

            purchaseSucceeded = true;

            const response = await postService.getPost(
                displayPost.id
            );

            const refreshedPost = response.data;

            if (refreshedPost.is_unlocked !== true) {
                setPurchaseMessage(
                    "Purchase completed, but access is not confirmed yet. Reopen the post to check."
                );
                return;
            }

            setDisplayPost(refreshedPost);

            setPurchaseMessage(
                "Post unlocked successfully!"
            );
        } catch (error) {
            console.error(
                "Paid post unlock failed:",
                error.response?.data || error
            );

            if (purchaseSucceeded) {
                setPurchaseMessage(
                    "Purchase completed. Reopen the post to refresh your access."
                );
            } else {
                setPurchaseError(
                    getErrorMessage(error)
                );
            }
        } finally {
            setPurchaseLoading(false);
        }
    };

    const handleCreateComment = async (content) => {
        const payload = {
            content_type: "post",
            object_id: displayPost.id,
            content,
        };

        console.log(
            "========== COMMENT REQUEST =========="
        );

        console.log("Payload:", payload);
        console.log("Post ID:", displayPost.id);
        console.log("Content:", content);

        try {
            setCommentLoading(true);

            const response =
                await commentService.createComment(
                    payload
                );

            console.log(
                "========== COMMENT SUCCESS =========="
            );

            console.log(response.data);

            return response.data;
        } catch (error) {
            console.error(
                "========== COMMENT ERROR =========="
            );

            console.log(
                "Status:",
                error.response?.status
            );

            console.log(
                "Response:",
                error.response?.data
            );

            console.log(
                "content_type error:",
                error.response?.data?.content_type
            );

            console.log(
                "object_id error:",
                error.response?.data?.object_id
            );

            console.log(
                "detail:",
                error.response?.data?.detail
            );

            console.error("Complete Error:", error);

            return null;
        } finally {
            setCommentLoading(false);
        }
    };

    return (
        <>
            <article className="post-card">

                <PostHeader
                    post={displayPost}
                />

                {displayPost.content && (
                    <div
                        onClick={handleOpenPostDetail}
                        className="post-card-clickable"
                    >
                        <PostContent
                            content={displayPost.content}
                        />
                    </div>
                )}

                {displayPost.media?.length > 0 && (
                    <div
                        onClick={handleOpenPostDetail}
                        className="post-card-clickable"
                    >
                        <PostMedia
                            media={displayPost.media}
                            isUnlocked={isUnlocked}
                        />
                    </div>
                )}

                {isPaidPost && !isUnlocked && (
                    <section
                        className="post-unlock"
                        aria-label="Unlock paid post"
                    >
                        <div className="post-unlock__details">

                            <span className="post-unlock__badge">
                                <span aria-hidden="true">
                                    🔒
                                </span>
                                {" "}Paid post
                            </span>

                            <p className="post-unlock__description">
                                Unlock this post to view its
                                original content.
                            </p>

                            <p className="post-unlock__price">
                                <span aria-hidden="true">
                                    🪙
                                </span>
                                {" "}
                                {Number.isFinite(coinPrice) &&
                                coinPrice > 0
                                    ? `${coinPrice} coins`
                                    : "Price unavailable"}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="post-unlock__button"
                            onClick={handleUnlockPost}
                            disabled={
                                purchaseLoading ||
                                !Number.isFinite(coinPrice) ||
                                coinPrice <= 0
                            }
                        >
                            {purchaseLoading
                                ? "Unlocking..."
                                : "Unlock Post"}
                        </button>

                        {purchaseError && (
                            <p
                                className="post-unlock__message post-unlock__message--error"
                                role="alert"
                            >
                                {purchaseError}
                            </p>
                        )}
                    </section>
                )}

                {purchaseMessage && (
                    <p
                        className="post-unlock__message post-unlock__message--success"
                        role="status"
                    >
                        {purchaseMessage}
                    </p>
                )}

                <PostStats
                    likeCount={
                        displayPost.like_count ?? 0
                    }
                    commentCount={
                        displayPost.comment_count ?? 0
                    }
                    shareCount={
                        displayPost.share_count ?? 0
                    }
                />

                <PostActions
                    contentType="post"
                    objectId={displayPost.id}
                    isLiked={
                        displayPost.is_liked ?? false
                    }
                    likeCount={
                        displayPost.like_count ?? 0
                    }
                    hideLikeCount={
                        displayPost.hide_like_count ?? false
                    }
                    commentCount={
                        displayPost.comment_count ?? 0
                    }
                    onLikeList={handleOpenLikes}
                    onComment={handleOpenComments}
                />

            </article>

            <CommentModal
                isOpen={isCommentOpen}
                title="Comments"
                onClose={handleCloseComments}
                onSubmit={handleCreateComment}
                loading={commentLoading}
            />

            <LikeModal
                isOpen={isLikeOpen}
                title="Likes"
                onClose={handleCloseLikes}
            >
                <LikeList
                    contentType="post"
                    objectId={displayPost.id}
                />
            </LikeModal>
        </>
    );
};

export default PostCard;
