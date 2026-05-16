import React, { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import AxiosInstance from "../auth/axiosInstance";

import "./Profile.css";

const Profile = () => {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showProfile, setShowProfile] = useState(true);

  // =========================
  // FETCH PROFILE
  // =========================
  useEffect(() => {

    const fetchProfile = async () => {

      try {

        console.log("🔥 FETCHING PROFILE...");

        const response = await AxiosInstance.get(
          "/users/profile/"
        );

        console.log(
          "✅ PROFILE RESPONSE:",
          response.data
        );

        console.log(
          "🖼 PROFILE PICTURE:",
          response.data.profile_picture
        );

        setUser(response.data);

      } catch (err) {

        console.log(
          "❌ PROFILE FETCH ERROR:",
          err
        );

        console.log(
          "❌ ERROR RESPONSE:",
          err.response?.data
        );

        setError("Failed to load profile");

      } finally {

        setLoading(false);
      }
    };

    fetchProfile();

  }, []);

  // =========================
  // CLOSE POPUP
  // =========================
  const handleClose = () => {

    console.log("❌ PROFILE CLOSED");

    setShowProfile(false);

    navigate("/home");
  };

  // =========================
  // EDIT PROFILE
  // =========================
  const handleEditProfile = () => {

    console.log("✏️ EDIT PROFILE CLICKED");

    navigate("/edit-profile");
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {

    console.log("🚪 LOGOUT");

    localStorage.removeItem("accessToken");

    localStorage.removeItem("refreshToken");

    localStorage.removeItem("user_id");

    navigate("/login");
  };

  // =========================
  // HIDE COMPONENT
  // =========================
  if (!showProfile) {

    return null;
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {

    return (
      <h2 className="profile-loading">
        Loading...
      </h2>
    );
  }

  // =========================
  // ERROR
  // =========================
  if (error) {

    return (
      <h2 className="profile-error">
        {error}
      </h2>
    );
  }

  // =========================
  // PROFILE IMAGE
  // =========================
  const profileImage = user?.profile_picture
    ? user.profile_picture
    : "/default-avatar.svg";

  console.log(
    "🖼 FINAL IMAGE URL:",
    profileImage
  );

  return (

    <div className="profile-overlay">

      <div className="profile-container">

        {/* CLOSE BUTTON */}
        <button
          className="profile-close-btn"
          onClick={handleClose}
        >
          ✕
        </button>

        {/* PROFILE IMAGE */}
        <img
          src={profileImage}
          alt="avatar"
          className="profile-image"
          onLoad={() =>
            console.log(
              "✅ IMAGE LOADED SUCCESSFULLY"
            )
          }
          onError={(e) => {

            console.log(
              "❌ IMAGE LOAD FAILED"
            );

            console.log(
              "❌ FAILED URL:",
              e.target.src
            );

            e.target.src =
              "/default-avatar.svg";
          }}
        />

        {/* USERNAME */}
        <h2 className="profile-username">
          {user?.username}
        </h2>

        {/* EMAIL */}
        <p className="profile-email">
          {user?.email ||
            "No email available"}
        </p>

        {/* FULL NAME */}
        <h3 className="profile-fullname">
          {user?.first_name ||
          user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : "No name added"}
        </h3>

        {/* BIO */}
        <p className="profile-bio">
          {user?.bio || "No bio yet"}
        </p>

        {/* BUTTONS */}
        <div className="profile-btn-group">

          {/* EDIT BUTTON */}
          <button
            className="profile-edit-btn"
            onClick={handleEditProfile}
          >
            Edit Profile
          </button>

          {/* LOGOUT BUTTON */}
          <button
            className="profile-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
};

export default Profile;