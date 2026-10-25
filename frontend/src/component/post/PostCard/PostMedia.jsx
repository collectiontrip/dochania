
import {
    useEffect,
    useState,
} from "react";

import AxiosInstance from "./../../auth/axiosInstance";

import "./PostMedia.css";

const MAX_VISIBLE_MEDIA = 5;


// ============================================================
// POST MEDIA ITEM
// ============================================================

const PostMediaItem = ({
    item,
    index,
    isLastVisible,
    remainingCount,
    isUnlocked,
}) => {
    const [mediaSrc, setMediaSrc] = useState("");
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isImage = item.media_type === "image";

    const originalUrl = isUnlocked
        ? item.file
        : null;

    const previewUrl = item.preview_file;

    useEffect(() => {
        let objectUrl = null;
        let isCancelled = false;

        const loadMedia = async () => {
            setMediaSrc("");
            setHasError(false);
            setIsLoading(false);

            // SELECT THE CORRECT MEDIA ENDPOINT
            const mediaUrl = isUnlocked
                ? originalUrl
                : previewUrl;

            if (!mediaUrl) {
                setHasError(true);
                return;
            }

            setIsLoading(true);

            try {
                // LOAD PREVIEW AND ORIGINAL THROUGH AUTHENTICATED AXIOS
                const response = await AxiosInstance.get(
                    mediaUrl,
                    {
                        responseType: "blob",
                    }
                );

                if (isCancelled) {
                    return;
                }

                // ENSURE THE RESPONSE CONTAINS IMAGE OR VIDEO DATA
                const contentType =
                    response.headers?.["content-type"] ||
                    response.data?.type ||
                    "";

                if (
                    !contentType.startsWith("image/") &&
                    !contentType.startsWith("video/")
                ) {
                    throw new Error(
                        `Unexpected media content type: ${contentType || "unknown"}`
                    );
                }

                objectUrl = URL.createObjectURL(
                    response.data
                );

                setMediaSrc(objectUrl);
            } catch (error) {
                if (!isCancelled) {
                    console.error(
                        "Failed to load post media:",
                        error.response?.status || error.message,
                        error.response?.data
                    );

                    setHasError(true);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadMedia();

        return () => {
            isCancelled = true;

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [
        isUnlocked,
        originalUrl,
        previewUrl,
    ]);

    return (
        <div
            className={`post-media__item post-media__item--${index + 1}`}
            data-type={item.media_type}
        >
            {mediaSrc && !hasError ? (
                isImage ? (
                    <img
                        className="post-media__image"
                        src={mediaSrc}
                        alt={`Post media ${index + 1}`}
                        loading="lazy"
                        draggable={false}
                    />
                ) : (
                    <video
                        className="post-media__video"
                        src={mediaSrc}
                        controls
                        preload="metadata"
                        playsInline
                    >
                        Your browser does not support the video tag.
                    </video>
                )
            ) : (
                <div
                    className="post-media__placeholder"
                    role="status"
                >
                    {isLoading
                        ? "Loading media..."
                        : hasError
                            ? "Media unavailable"
                            : "Preparing media..."}
                </div>
            )}

            {isLastVisible && (
                <div className="post-media__overlay">
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};


// ============================================================
// POST MEDIA
// ============================================================

const PostMedia = ({
    media = [],
    isUnlocked = false,
}) => {
    if (!Array.isArray(media) || media.length === 0) {
        return null;
    }

    const sortedMedia = [...media].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    const visibleMedia = sortedMedia.slice(
        0,
        MAX_VISIBLE_MEDIA
    );

    const remainingCount =
        sortedMedia.length - MAX_VISIBLE_MEDIA;

    return (
        <section
            className={`post-media post-media--${visibleMedia.length}`}
            aria-label="Post media"
        >
            {visibleMedia.map((item, index) => {
                const isLastVisible =
                    index === MAX_VISIBLE_MEDIA - 1 &&
                    remainingCount > 0;

                return (
                    <PostMediaItem
                        key={item.id}
                        item={item}
                        index={index}
                        isLastVisible={isLastVisible}
                        remainingCount={remainingCount}
                        isUnlocked={isUnlocked}
                    />
                );
            })}
        </section>
    );
};

export default PostMedia;
