import { useState } from "react";
import postService from "../../services/postService";
import { toast } from "react-toastify";

import PostContent from "./components/PostContent";
import MediaPicker from "./components/MediaPicker";
import VisibilitySelector from "./components/VisibilitySelector";
import AccessSelector from "./components/AccessSelector";
import CoinInput from "./components/CoinInput";
import AdvancedOptions from "./components/AdvancedOptions";
import SubmitButton from "./components/SubmitButton";

import "./CreatePost.css";

const INITIAL_FORM = {

        content: "",

        visibility: "public",

        access_type: "free",

        coins: "",

        allow_comments: true,

        hide_like_count: false,

    };

const CreatePost = () => {

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [mediaFiles, setMediaFiles] = useState({
        files: [],
        previews: [],
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {

        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [field]: undefined,
        }));
    };

    const resetForm = () => {
        setFormData(INITIAL_FORM);
        setMediaFiles({
            files: [],
            previews: [],
        });
        setErrors({});
    };

    const validateForm = () => {
        const validationErrors = {};

        if (
            !formData.content.trim() &&
            mediaFiles.files.length === 0
        ) {
            validationErrors.content = 
                "Post must contain text or at least one media file.";
        }

        if (
            formData.access_type === "paid"
        ) {
            if (
                !formData.coins ||
                Number(formData.coins) <= 0
            ) {
                validationErrors.coins =
                    "Coins are required for paid posts.";
            }
        }

        setErrors(validationErrors);

        return (
            Object.keys(validationErrors).length === 0
        );
    };

    const handleSubmit = async () => {

        if (!validateForm()){
            return;
        }

        try {

            setLoading(true);
            setErrors({});

            const formDataToSend = new FormData();
            formDataToSend.append(
                "content",
                formData.content
            );

            formDataToSend.append(
                "visibility",
                formData.visibility 
            );

            formDataToSend.append(
                "access_type",
                formData.access_type
            );

            formDataToSend.append(
                "allow_comments",
                formData.allow_comments
            );

            formDataToSend.append(
                "hide_like_count",
                formData.hide_like_count
            );

            if (
                formData.access_type === "paid"
            ) {
                formDataToSend.append(
                    "coins",
                    formData.coins
                );
            }

            mediaFiles.files.forEach((file) => {

                formDataToSend.append(
                    "media_files",
                    file
                );
            });
            
            await postService.createPost(
                formDataToSend
            );

            resetForm();

            toast.success("Post created successfully.")
        
        } catch (error) {

            if (
                error.response?.data
            ) {
                setErrors(
                    error.response.data
                );
            }
        } finally {

            setLoading(false);

        }
    };

    return (
        <div className="create-post">

            <PostContent
                value={formData.content}
                onChange={(value) =>
                    updateField(
                        "content",
                        value
                    )
                }
                error={errors.content}
            />

            <MediaPicker
                mediaFiles={mediaFiles}
                setMediaFiles={setMediaFiles}
                error={errors.media_files}

            />

            <VisibilitySelector
                value={formData.visibility}
                onChange={(value) => 
                    updateField(
                        "visibility",
                        value
                    )
                }

            />

            <AccessSelector
                value={formData.access_type}
                onChange={(value) => 

                    updateField(
                        "access_type",
                        value
                    )

                }

            />

            {
                formData.access_type === "paid" && (

                    <CoinInput
                        value={formData.coins}
                        onChange={(value) =>
                            updateField(
                                "coins",
                                value
                            )
                        }
                        error={errors.coins}

                    />
                )
            }

            <AdvancedOptions
                allowComments={
                    formData.allow_comments
                }
                hideLikeCount={
                    formData.hide_like_count
                }
                onAllowCommentsChange={(value) => 
                    updateField(
                        "allow_comments",
                        value
                    )
                }
                onHideLikeCountChange={(value) => 
                    updateField(
                        "hide_like_count",
                        value
                    )
                }
            />

            <SubmitButton
                loading={loading}
                onClick={handleSubmit}
            
            />

            
        </div>
    );
};

export default CreatePost;