import { useNavigate } from "react-router-dom";

import { useUser } from "../../contexts/UserContext";

import SelfPostList from "../post/SelfPostList/SelfPostList";

import "./Profile.css";

const Profile = () => {

  const navigate = useNavigate();

  const {
    user,
    loading,
    logout,
  } = useUser();

  

  
  // =========================
  // CLOSE POPUP
  // =========================
  const handleClose = () => {
    navigate("/home");
  };

  // =========================
  // EDIT PROFILE
  // =========================
  const handleEditProfile = () => {

    navigate("/edit-profile");
  };

  const handleCreatePost = () => {

    navigate("/create-post");

  };

  const handleLogout = () => {

    logout();

    navigate("/login", { replace: true });

  };

  const handleFollowersClick = () => {

    navigate(`/profile/followers`);
  };

  // =========================
  // OPEN FOLLOWING
  // =========================
  const handleFollowingClick = () => {

    navigate(`/profile/following`);
  };

 
  if (loading) {

    return (
      <h2 className="profile-loading">
        Loading...
      </h2>
    );
  }

  if (!user) {
    return (
        <h2 className="profile-error">
            User not found
        </h2>
    );
  }

 
  const profileImage =
    user.profile_picture || "/default-avatar.png";

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

        {/* PROFILE HEADER */}
        <div className="profile-header">

          <img
            src={profileImage}
            alt="avatar"
            className="profile-image"
            
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default-avatar.png";
            }}

          />

          <h2 className="profile-username">
            {user.username}
          </h2>

          <p className="profile-email">
            {user.email ||
              "No email available"}
          </p>

        </div>

        {/* USER INFO CARD */}
        <div className="profile-info-card">

          <h3 className="profile-fullname">
            {`${user.first_name} ${user.last_name}`.trim() || "No name added"}
          </h3>

          <p className="profile-bio">
            {user.bio || "No bio yet"}
          </p>

        </div>

        <div className="profile-balance">

          <span className="balance-label">
              My Balance
          </span>

          <span className="balance-value">
              🪙 {user.coin_balance ?? 0}
          </span>

          <button className="balance-add-btn">
              <span>+</span>
          </button>

        </div>

        <div className="profile-create-post-wrapper">

          <button
            className="profile-create-post-btn"
            onClick={handleCreatePost}
          >
            ✨ Create New Post
          </button>

        </div>

        {/* STATS CARD */}
        <div className="profile-stats-card">

          <div
            className="profile-stat"
            onClick={handleFollowersClick}
          >
            <span className="profile-stat-count">
              {user.followers_count ?? 0}
            </span>

            <span className="profile-stat-label">
              Followers
            </span>
          </div>

          <div className="profile-stat-divider"></div>

          <div
            className="profile-stat"
            onClick={handleFollowingClick}
          >
            <span className="profile-stat-count">
              {user.following_count ?? 0}
            </span>

            <span className="profile-stat-label">
              Following
            </span>
          </div>

        </div>

        {/* ACTION BUTTONS */}
        <div className="profile-btn-group">

          

          <button
            className="profile-edit-btn"
            onClick={handleEditProfile}
          >
            Edit Profile
          </button>

          <button
            className="profile-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

        <div className="profile-posts-section">

            <h2 className="profile-posts-title">
                My Posts
            </h2>

            <SelfPostList />

        </div>

      </div>

    </div>
  );
};

export default Profile;