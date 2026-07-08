import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import { useNavigate } from "react-router-dom";

import Cropper from "react-easy-crop";
import AxiosInstance from "../auth/axiosInstance";

import { useUser } from "../../contexts/UserContext";

import "./UpdateProfile.css";

const UpdateProfile = () => {

  const navigate = useNavigate();
  const {
    user,
    setUser,
    loading,
  } = useUser();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    bio: "",
    profile_picture: null,
  });

  const [preview, setPreview] = useState("");

  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // =========================
  // CROP STATES
  // =========================
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState(null);

  const [showCropper, setShowCropper] =
    useState(false);

  const [selectedImage, setSelectedImage] =
    useState(null);

  
    
  useEffect(() => {
    
    if (!user) return;

    setFormData({
        username: user.username || "",
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        bio: user.bio || "",
        profile_picture: null,
    });

    setPreview(
        user.profile_picture || ""
    );

  }, [user]);
   

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================
  // HANDLE IMAGE CHANGE
  // =========================
  const handleImageChange = (e) => {

    const file = e.target.files[0];

    console.log(
      "📂 SELECTED FILE:",
      file
    );

    if (file) {

      const imageURL =
        URL.createObjectURL(file);

      setSelectedImage(imageURL);

      setShowCropper(true);

      setFormData((prev) => ({
        ...prev,
        profile_picture: file,
      }));
    }
  };

  useEffect(() => {
    return () => {
        if (selectedImage) {
            URL.revokeObjectURL(selectedImage);
        }

        if (preview.startsWith("blob:")) {
            URL.revokeObjectURL(preview);
        }
    };
  }, [selectedImage, preview]);

  // =========================
  // CROP COMPLETE
  // =========================
  const onCropComplete =
    useCallback(
      (croppedArea, croppedPixels) => {

        

        setCroppedAreaPixels(
          croppedPixels
        );
      },
      []
    );

  // =========================
  // CREATE CROPPED IMAGE
  // =========================
  const createImage = (url) =>
    new Promise((resolve, reject) => {

      const image = new Image();

      image.addEventListener(
        "load",
        () => resolve(image)
      );

      image.addEventListener(
        "error",
        (error) => reject(error)
      );

      image.src = url;
    });

  // =========================
  // GET CROPPED IMAGE
  // =========================
  const getCroppedImg = async (
    imageSrc,
    crop
  ) => {

    const image = await createImage(
      imageSrc
    );

    const canvas =
      document.createElement("canvas");

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas context not available");
    }

    canvas.width = crop.width;

    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {

      canvas.toBlob((blob) => {

        if (!blob) {
          reject(new Error("Failed to crop image"));
          return;
        }

        const file = new File(
          [blob],
          "profile.jpeg",
          {
            type: "image/jpeg",
          }
        );

        resolve(file);

      }, "image/jpeg");

    });

    };

  // =========================
  // APPLY CROP
  // =========================
  const handleCropSave = async () => {

    try {

      const croppedImage =
        await getCroppedImg(
          selectedImage,
          croppedAreaPixels
        );

      const croppedPreview =
        URL.createObjectURL(
          croppedImage
        );

      setPreview(croppedPreview);

      setFormData((prev) => ({
        ...prev,
        profile_picture: croppedImage,
      }));

      setShowCropper(false);
      setSelectedImage(null);
      setCroppedAreaPixels(null);
      setZoom(1);
      setCrop({
        x: 0,
        y: 0,
      });
      console.log(
        "✅ CROPPED IMAGE READY"
      );

    } catch (err) {

      console.log(
        "❌ CROP ERROR:",
        err
      );
    }
  };

  // =========================
  // UPDATE PROFILE
  // =========================
  const handleSubmit = async (e) => {

    e.preventDefault();

    setUpdating(true);

    setError("");

    setSuccess("");

    try {

      const data = new FormData();

      data.append(
        "username",
        formData.username
      );

      data.append(
        "email",
        formData.email
      );

      data.append(
        "first_name",
        formData.first_name
      );

      data.append(
        "last_name",
        formData.last_name
      );

      data.append(
        "bio",
        formData.bio
      );

      if (
        formData.profile_picture
      ) {

        data.append(
          "profile_picture",
          formData.profile_picture
        );
      }

      console.log(
        "🚀 SENDING UPDATE..."
      );

      const response =
        await AxiosInstance.put(
          "/users/profile/",
          data,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      console.log(
        "✅ UPDATE RESPONSE:",
        response.data
      );

      setUser(response.data);

      setFormData({
        username: response.data.username || "",
        email: response.data.email || "",
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        bio: response.data.bio || "",
        profile_picture: null,
      });

      setPreview(
          response.data.profile_picture ||
          "/default-avatar.png"
      );

      setSuccess(
        "Profile updated successfully"
      );

    } catch (err) {

      console.log(
        "❌ UPDATE ERROR:",
        err
      );

      console.log(
        "❌ ERROR RESPONSE:",
        err.response?.data
      );

      if (err.response?.data) {

        const firstError =
          Object.values(
            err.response.data
          )[0];

        setError(
          Array.isArray(firstError)
            ? firstError[0]
            : firstError
        );

      } else {

        setError(
          "Something went wrong"
        );
      }

    } finally {

      setUpdating(false);
    }
  };

  // =========================
  // CLOSE
  // =========================
  const handleClose = () => {

    navigate("/profile");
  };

  if (loading) {

    return (

        <div className="update-profile-loading-wrapper">

            <h2 className="update-profile-loading">
                Loading Profile...
            </h2>

        </div>

    );
  }


  

  return (

    <div className="update-profile-page">

      {/* BACKGROUND */}
      <div className="update-profile-bg"></div>

      {/* CROP MODAL */}
      {showCropper && (

        <div className="cropper-modal">

          <div className="cropper-card">

            <h2 className="cropper-title">
              Adjust Profile Picture
            </h2>

            <div className="cropper-container">

              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={
                  onCropComplete
                }
              />

            </div>

            <div className="cropper-controls">

              <label>
                Zoom
              </label>

              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) =>
                  setZoom(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="cropper-buttons">

              <button
                type="button"
                className="cropper-cancel-btn"
                onClick={() => {
                  setShowCropper(false);
                  setSelectedImage(null);
                  setCroppedAreaPixels(null);
                  setZoom(1);
                  setCrop({
                    x: 0,
                    y: 0,
                  });
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="cropper-save-btn"
                onClick={handleCropSave}
              >
                Apply
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MAIN CARD */}
      <div className="update-profile-card">

        {/* CLOSE BUTTON */}
        <button
          className="update-profile-close-btn"
          onClick={handleClose}
        >
          ✕
        </button>

        {/* HEADER */}
        <div className="update-profile-header">

          <h1 className="update-profile-title">
            Edit Profile
          </h1>

          <p className="update-profile-subtitle">
            Manage your profile details
          </p>

        </div>

        {/* ERROR */}
        {error && (

          <div className="update-profile-error-box">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (

          <div className="update-profile-success-box">
            {success}
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="update-profile-form"
        >

          {/* PROFILE IMAGE */}
          <div className="update-profile-avatar-section">

            <div className="update-profile-avatar-wrapper">

              <img
                src={
                  preview ||
                  "/default-avatar.png"
                }
                alt="avatar"
                className="update-profile-avatar"
              />

            </div>

            <label className="update-profile-upload-btn">

              Change Photo

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleImageChange
                }
                className="update-profile-file-input"
              />

            </label>

          </div>

          {/* GRID */}
          <div className="update-profile-grid">

            {/* USERNAME */}
            <div className="update-profile-field">

              <label className="update-profile-label">
                Username
              </label>

              <input
                type="text"
                name="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                className="update-profile-input"
              />

            </div>

            {/* EMAIL */}
            <div className="update-profile-field">

              <label className="update-profile-label">
                Email
              </label>

              <input
                type="email"
                name="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleChange}
                className="update-profile-input"
              />

            </div>

            {/* FIRST NAME */}
            <div className="update-profile-field">

              <label className="update-profile-label">
                First Name
              </label>

              <input
                type="text"
                name="first_name"
                placeholder="First name"
                value={formData.first_name}
                onChange={handleChange}
                className="update-profile-input"
              />

            </div>

            {/* LAST NAME */}
            <div className="update-profile-field">

              <label className="update-profile-label">
                Last Name
              </label>

              <input
                type="text"
                name="last_name"
                placeholder="Last name"
                value={formData.last_name}
                onChange={handleChange}
                className="update-profile-input"
              />

            </div>

          </div>

          {/* BIO */}
          <div className="update-profile-field">

            <label className="update-profile-label">
              Bio
            </label>

            <textarea
              name="bio"
              placeholder="Write something about yourself..."
              value={formData.bio}
              onChange={handleChange}
              className="update-profile-bio"
            />

          </div>

          {/* BUTTONS */}
          <div className="update-profile-buttons">

            <button
              type="button"
              className="update-profile-cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="update-profile-save-btn"
              disabled={updating}
            >
              {updating
                ? "Updating..."
                : "Save Changes"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default UpdateProfile;