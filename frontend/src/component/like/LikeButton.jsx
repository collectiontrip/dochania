import {
    memo,
    useEffect,
    useState,
} from "react";

import {
    FiHeart,
} from "react-icons/fi";

import {
    FaHeart,
} from "react-icons/fa";

import likeService from "../../services/likesServices";

const LikeButton = ({
    contentType,
    objectId,
    isLiked = false,
    likeCount = 0,
    hideLikeCount = false,
    disabled = false,
    onChange,
    onLikeList = () => {},
}) => {

    const [liked, setLiked] = useState(
        isLiked
    );

    const [count, setCount] = useState(
        likeCount
    );

    const [loading, setLoading] = useState(
        false
    );

    useEffect(() => {

        setLiked(isLiked);

    }, [
        isLiked,
    ]);

    useEffect(() => {

        setCount(likeCount);

    }, [
        likeCount,
    ]);

    const handleLike = async () => {

        if (loading || disabled) {
            return;
        }

        console.log(
            "========== LIKE =========="
        );

        console.log(
            "contentType:",
            contentType
        );

        console.log(
            "objectId:",
            objectId
        );

        console.log(
            "liked:",
            liked
        );

        const previousLiked = liked;
        const previousCount = count;

        const newLiked = !liked;

        const newCount = liked
            ? Math.max(
                0,
                count - 1,
            )
            : count + 1;

        // Optimistic Update
        setLiked(newLiked);
        setCount(newCount);
        setLoading(true);

        try {

            if (liked) {

                await likeService.deleteLike(
                    contentType,
                    objectId,
                );

            }

            else {

                await likeService.createLike(
                    contentType,
                    objectId,
                );

            }

            console.log(
                "Like request successful."
            );

            onChange?.(
                newLiked,
                newCount,
            );

        }

        catch (error) {

            // Rollback
            setLiked(previousLiked);
            setCount(previousCount);

            console.error(
                "Like request failed."
            );

            console.error(
                "Status:",
                error.response?.status
            );

            console.error(
                "Response:",
                error.response?.data
            );

            console.error(
                "Full Error:",
                error
            );

        }

        finally {

            setLoading(false);

        }

    };

    const handleLikeList = () => {

        if (
            loading ||
            count === 0
        ) {
            return;
        }

        onLikeList?.();

    };

    return (

        <div className="like-button-wrapper">

            <button
                type="button"
                className="like-button"
                onClick={handleLike}
                disabled={
                    loading ||
                    disabled
                }
                aria-label={
                    liked
                        ? "Unlike post"
                        : "Like post"
                }
                aria-pressed={
                    liked
                }
                aria-disabled={
                    loading ||
                    disabled
                }
                title={
                    liked
                        ? "Unlike"
                        : "Like"
                }
            >

                {
                    liked ? (

                        <FaHeart
                            className="like-icon liked"
                        />

                    ) : (

                        <FiHeart
                            className="like-icon"
                        />

                    )
                }

            </button>

            {
                !hideLikeCount && (

                    <button
                        type="button"
                        className="like-count-button"
                        onClick={
                            handleLikeList
                        }
                        disabled={
                            count === 0
                        }
                        title="View likes"
                        aria-label="View likes"
                    >

                        {count}

                    </button>

                )
            }

        </div>

    );

};

export default memo(
    LikeButton
);