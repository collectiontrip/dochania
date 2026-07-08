import "./MediaPreview.css";


const MediaPreview = ({
    mediaFiles,
    onRemove,
}) => {

    if (
        mediaFiles.previews.length === 0
    ) {
        return null;
    }

    return (
        
        <div className="media-preview">

            {
                mediaFiles.previews.map(
                    (preview, index) => {

                        const file = 
                            mediaFiles.files[index];

                        if (!file) {
                            return null;
                        }

                        const isImage = 
                            file.type.startsWith(
                                "image/"
                            );

                        const isVideo = 
                            file.type.startsWith(
                                "video/"
                            );

                        return (
                            <div 
                                key={`${file.name}-${file.lastModified}-${index}`}
                                className="media-preview-item"
                            >

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

                                {
                                    isVideo && (
                                        <video 
                                            src={preview} 
                                            className="media-preview-video" 
                                            controls
                                            preload="metadata"
                                            playsInline
                                            controlsList="nodownload"
                                            preload="metadata"
                                        />
                                    )
                                }

                                <button
                                    type="button"
                                    className="media-remove-btn"
                                    onClick={() =>
                                        onRemove(index)
                                    }
                                    aria-label={`Remove ${file.name}`}
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