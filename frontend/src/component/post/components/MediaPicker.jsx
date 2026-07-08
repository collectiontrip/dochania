import { toast } from "react-toastify";
import MediaPreview from "./MediaPreview";
import "./MediaPicker.css"


const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;


const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif", 
    "video/mp4",
    "video/webm",
    "video/quicktime",

];


const MediaPicker = ({
    mediaFiles,
    setMediaFiles,
    error,
}) => {

    const handleFileChange = (event) => {

        const selectedFiles = Array.from(
            event.target.files
        );

        if (
            selectedFiles.length === 0
        ) {
            return;
        }

        if (
            mediaFiles.files.length + selectedFiles.length > MAX_FILES
        ) {
            toast.error(
                `You can upload a maximum of ${MAX_FILES} files.`
            );

            event.target.value = "";

            return;
        }

        const validFiles = [];
        const previewUrls = [];

        selectedFiles.forEach((file) => {
            if (
                !ALLOWED_TYPES.includes(
                    file.type
                )
            ) {
                toast.error(
                   `${file.name} is not a supported file type.` 
                );

                return;
            }

            if (
                file.size >
                MAX_FILE_SIZE
            ) {
                toast.error(
                    `${file.name} exceeds the 50 MB size limit.`
                );

                return;
            }

            const isDuplicate = 
                mediaFiles.files.some(
                    (existingFile) =>
                        existingFile.name ===
                            file.name &&
                        existingFile.size ===
                            file.size &&
                        existingFile.lastModified ===
                            file.lastModified
                );

            if (
                isDuplicate
            ) {
                toast.info(
                    `${file.name} is already selected.`
                );

                return;
            }

            validFiles.push(file);
            previewUrls.push(
                URL.createObjectURL(file)
            );
        });

        if (
            validFiles.length === 0
        ) {
            event.target.value = "";

            return;
        }

        setMediaFiles((prev) => ({
            files: [
                ...prev.files,
                ...validFiles,

            ],

            previews: [
                ...prev.previews,
                ...previewUrls,
            ],
        }));

        event.target.value = "";
    };

    

    const handleRemove = (index) => {

        setMediaFiles((prev) => {

            URL.revokeObjectURL(
                prev.previews[index]
            );

            return {
                files: prev.files.filter((_, i) => i !== index),
                previews: prev.previews.filter((_, i) => i !== index),
            };

        });

    };

    return (

        <div className="media-picker">

            <label className="media-upload-box">

                <input
                    type="file"
                    multiple
                    accept={ALLOWED_TYPES.join(",")}
                    onChange={handleFileChange}
                />

                <span className="media-upload-icon">
                    📷
                </span>

                <span className="media-upload-title">
                    Upload Photos & Videos
                </span>

                <span className="media-upload-subtitle">
                    JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV
                </span>

                <span className="media-upload-limit">
                    Max {MAX_FILES} files • 50 MB each
                </span>

            </label>

            {
                error && (
                    <p className="media-error">
                        {error}
                    </p>
                )
            }

            <MediaPreview
                mediaFiles={mediaFiles}
                onRemove={handleRemove}
            />

        </div>

    );
};

export default MediaPicker;