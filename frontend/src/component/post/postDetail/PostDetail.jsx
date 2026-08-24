import {
    useEffect,
    useState,
} from "react";


import {
    useParams,
} from "react-router-dom";


import postService from "../../../services/postService";


import PostHeader from "../PostCard/PostHeader";
import PostContent from "../PostCard/PostContent";
import PostMedia from "../PostCard/PostMedia";
import PostStats from "../PostCard/PostStats";
import PostActions from "../PostCard/PostActions";


import LikeModal from "../../like/LikeModal";
import LikeList from "../../like/LikeList";
import CommentList from "../../comment/CommentList";


import ReportButton from "../../report/ReportButton";


import "./PostDetail.css";


// ============================================================
// POST DETAIL
// ============================================================

const PostDetail = () => {

    const {
        id,
    } = useParams();


    const [
        post,
        setPost,
    ] = useState(null);


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");


    const [
        isLikeOpen,
        setIsLikeOpen,
    ] = useState(false);


    // ============================================================
    // FETCH POST
    // ============================================================

    const fetchPost = async () => {

        try {

            setLoading(true);

            setError("");


            const response =
                await postService.getPost(
                    id,
                );


            setPost(
                response.data,
            );

        }

        catch (error) {

            console.error(
                "Failed to load post:",
                error,
            );


            setError(
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                "Failed to load post.",
            );

        }

        finally {

            setLoading(false);

        }

    };


    // ============================================================
    // LOAD POST
    // ============================================================

    useEffect(() => {

        if (!id) {
            return;
        }


        fetchPost();

    }, [id]);


    // ============================================================
    // LIKE MODAL
    // ============================================================

    const handleOpenLikes = () => {

        setIsLikeOpen(true);

    };


    const handleCloseLike = () => {

        setIsLikeOpen(false);

    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (
            <div
                className="post-detail-loading"
            >
                Loading post...
            </div>
        );

    }


    // ============================================================
    // ERROR
    // ============================================================

    if (error) {

        return (
            <div
                className="post-detail-error"
            >
                {error}
            </div>
        );

    }


    // ============================================================
    // POST NOT FOUND
    // ============================================================

    if (!post) {

        return (
            <div
                className="post-detail-empty"
            >
                Post not found.
            </div>
        );

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div
            className="post-detail"
        >

            {/* ==================================================
                POST
            ================================================== */}

            <article
                className="post-detail-card"
            >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <PostHeader
                    post={post}
                />


                {/* ==================================================
                    CONTENT
                ================================================== */}

                {
                    post.content && (

                        <PostContent
                            content={
                                post.content
                            }
                        />

                    )
                }


                {/* ==================================================
                    MEDIA
                ================================================== */}

                {
                    post.media?.length > 0 && (

                        <PostMedia
                            media={
                                post.media
                            }
                        />

                    )
                }


                {/* ==================================================
                    STATS
                ================================================== */}

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


                {/* ==================================================
                    ACTIONS
                ================================================== */}

                <PostActions
                    contentType="post"
                    objectId={
                        post.id
                    }
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
                />


                {/* ==================================================
                    REPORT POST
                ================================================== */}

                <ReportButton
                    contentType="post"
                    objectId={
                        post.id
                    }
                />

            </article>


            {/* ==================================================
                LIKES MODAL
            ================================================== */}

            <LikeModal
                isOpen={
                    isLikeOpen
                }
                title="Likes"
                onClose={
                    handleCloseLike
                }
            >

                <LikeList
                    contentType="post"
                    objectId={
                        post.id
                    }
                />

            </LikeModal>


            {/* ==================================================
                COMMENTS
            ================================================== */}

            <section
                className="post-detail-comments"
            >

                <h2>
                    Comments
                </h2>


                <CommentList
                    postId={
                        id
                    }
                />

            </section>

        </div>

    );

};


export default PostDetail;