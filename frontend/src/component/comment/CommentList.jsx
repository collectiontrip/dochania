import {
    memo,
    useCallback,
    useEffect,
    useState,
} from "react";

import commentService from "../../services/commentService"

import CommentItem from "./CommentItem";

import "./CommentList.css";


const CommentList = ({
    postId,
}) => {

    const [
        comments,
        setComments,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        loadingMore,
        setLoadingMore,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        nextUrl,
        setNextUrl,
    ] = useState(null);


    const loadComments = useCallback(
        async () => {

            if (!postId) {
                return;
            }

            try {

                setLoading(true);
                setError("");

                const response =
                    await commentService.getComments({
                        content_type: "post",
                        object_id: postId,
                    });


                const data = response.data;


                const results = Array.isArray(data)
                    ? data
                    : data?.results || [];


                setComments(results);

                setNextUrl(
                    Array.isArray(data)
                        ? null
                        : data?.next || null
                );

            } catch (error) {

                console.error(
                    "Failed to load comments:",
                    error
                );

                setError(
                    error?.response?.data?.detail ||
                    "Failed to load comments."
                );

            } finally {

                setLoading(false);

            }

        },
        [
            postId,
        ],
    );


    useEffect(() => {

        setComments([]);
        setNextUrl(null);
        setError("");

        loadComments();

    }, [
        loadComments,
    ]);


    const handleLoadMore = async () => {

        if (
            !nextUrl ||
            loadingMore
        ) {
            return;
        }


        try {

            setLoadingMore(true);
            setError("");


            const response =
                await commentService.getComments(
                    {
                        content_type: "post",
                        object_id: postId,
                        page: getPageFromUrl(
                            nextUrl
                        ),
                    }
                );


            const data = response.data;


            const results = Array.isArray(data)
                ? data
                : data?.results || [];


            setComments(
                (previousComments) => [
                    ...previousComments,
                    ...results,
                ]
            );


            setNextUrl(
                Array.isArray(data)
                    ? null
                    : data?.next || null
            );

        } catch (error) {

            console.error(
                "Failed to load more comments:",
                error
            );

            setError(
                error?.response?.data?.detail ||
                "Failed to load more comments."
            );

        } finally {

            setLoadingMore(false);

        }

    };


    if (loading) {

        return (
            <div className="comment-list-status">
                Loading comments...
            </div>
        );

    }


    if (error && !comments.length) {

        return (
            <div className="comment-list-status comment-list-error">
                {error}
            </div>
        );

    }


    if (!comments.length) {

        return (
            <div className="comment-list-status">
                No comments yet.
            </div>
        );

    }


    return (
        <div className="comment-list">

            {comments.map(
                (comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                    />
                )
            )}


            {error && (
                <div className="comment-list-error">
                    {error}
                </div>
            )}


            {nextUrl && (
                <button
                    type="button"
                    className="comment-load-more"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                >
                    {loadingMore
                        ? "Loading..."
                        : "Load more"
                    }
                </button>
            )}

        </div>
    );
};


const getPageFromUrl = (
    url,
) => {

    if (!url) {
        return null;
    }


    try {

        const parsedUrl =
            new URL(url);

        return (
            parsedUrl.searchParams.get(
                "page"
            ) || 1
        );

    } catch {

        return 1;

    }
};


export default memo(
    CommentList
);