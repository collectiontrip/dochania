import "./PostMedia.css";

const MAX_VISIBLE_MEDIA = 5;

const PostMedia = ({ media = [] }) => {
    if (!Array.isArray(media) || media.length === 0) {
        return null;
    }

    const sortedMedia = [...media].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    const visibleMedia = sortedMedia.slice(0, MAX_VISIBLE_MEDIA);
    const remainingCount = sortedMedia.length - MAX_VISIBLE_MEDIA;

    return (
        <section
            className={`post-media post-media--${visibleMedia.length}`}
            aria-label="Post media"
        >
            {visibleMedia.map((item, index) => {
                const isImage = item.media_type === "image";
                const isLastVisible =
                    index === MAX_VISIBLE_MEDIA - 1 &&
                    remainingCount > 0;

                return (
                    <div
                        key={item.id}
                        className={`post-media__item post-media__item--${index + 1}`}
                        data-type={item.media_type}
                    >
                        {isImage ? (
                            <img
                                className="post-media__image"
                                src={item.file}
                                alt={`Post media ${index + 1}`}
                                loading="lazy"
                                draggable={false}
                            />
                        ) : (
                            <video
                                className="post-media__video"
                                src={item.file}
                                controls
                                preload="metadata"
                                playsInline
                            >
                                Your browser does not support the video tag.
                            </video>
                        )}

                        {isLastVisible && (
                            <div className="post-media__overlay">
                                +{remainingCount}
                            </div>
                        )}
                    </div>
                );
            })}
        </section>
    );
};

export default PostMedia;