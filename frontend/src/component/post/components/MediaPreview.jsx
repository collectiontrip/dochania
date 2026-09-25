import "./MediaPreview.css";


const MediaPreview = ({
    mediaFiles,
    onRemove,
}) => {

    // ============================================================
    // VALIDATION
    // ============================================================

    if (
        !mediaFiles ||
        !Array.isArray(mediaFiles.previews) ||
        !Array.isArray(mediaFiles.files) ||
        mediaFiles.previews.length === 0
    ) {
        return null;
    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="media-preview">

            {
                mediaFiles.previews.map(
                    (preview, index) => {

                        const file =
                            mediaFiles.files[index];

                        if (!file || !preview) {
                            return null;
                        }


                        const isImage =
                            typeof file.type === "string" &&
                            file.type.startsWith("image/");


                        const isVideo =
                            typeof file.type === "string" &&
                            file.type.startsWith("video/");


                        return (

                            <div
                                key={
                                    `${file.name}-${file.lastModified}-${index}`
                                }
                                className="media-preview-item"
                            >

                                {/* ==================================================
                                    IMAGE PREVIEW
                                   ================================================== */}

                                {
                                    isImage && (

                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            className="media-preview-image"
                                            loading="lazy"
                                        />

                                    )
                                }


                                {/* ==================================================
                                    VIDEO PREVIEW
                                   ================================================== */}

                                {
                                    isVideo && (

                                        <video
                                            src={preview}
                                            className="media-preview-video"
                                            controls
                                            preload="metadata"
                                            playsInline
                                            controlsList="nodownload"
                                        />

                                    )
                                }


                                {/* ==================================================
                                    REMOVE BUTTON
                                   ================================================== */}

                                <button
                                    type="button"
                                    className="media-remove-btn"
                                    onClick={() =>
                                        onRemove(index)
                                    }
                                    aria-label={
                                        `Remove ${file.name}`
                                    }
                                >
                                    ✕
                                </button>

                            </div>

                        );

                    }
                )
            }

        </div>

    );

};


export default MediaPreview;