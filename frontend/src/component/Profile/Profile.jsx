import {
  useState,
} from "react";


import {
  useNavigate,
} from "react-router-dom";


import {
  useUser,
} from "../../contexts/UserContext";


import SelfPostList from "../post/SelfPostList/SelfPostList";


import "./Profile.css";



const Profile = () => {

  const navigate = useNavigate();


  const {
    user,
    loading,
    logout,
  } = useUser();


  const [isMenuOpen, setIsMenuOpen] =
    useState(false);



  // =========================
  // CLOSE PROFILE
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



  // =========================
  // CREATE POST
  // =========================

  const handleCreatePost = () => {

    navigate("/create-post");

  };



  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {

    logout();

    navigate(
      "/login",
      {
        replace: true,
      },
    );

  };



  // =========================
  // FOLLOWERS
  // =========================

  const handleFollowersClick = () => {

    navigate(
      "/profile/followers",
    );

  };



  // =========================
  // FOLLOWING
  // =========================

  const handleFollowingClick = () => {

    navigate(
      "/profile/following",
    );

  };



  // =========================
  // MENU TOGGLE
  // =========================

  const handleMenuToggle = () => {

    setIsMenuOpen(
      (previous) => !previous,
    );

  };



  // =========================
  // MY REPORTS
  // =========================

  const handleMyReportsClick = () => {

    setIsMenuOpen(false);

    navigate("/reports");

  };



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
  // USER CHECK
  // =========================

  if (!user) {

    return (

      <h2 className="profile-error">

        User not found

      </h2>

    );

  }



  // =========================
  // PROFILE IMAGE
  // =========================

  const profileImage =
    user.profile_picture ||
    "/default-avatar.png";



  return (

    <div className="profile-overlay">

      <div className="profile-container">


        {/* =========================
            CLOSE BUTTON
        ========================= */}

        <button
          type="button"
          className="profile-close-btn"
          onClick={handleClose}
          aria-label="Close profile"
        >

          ✕

        </button>



        {/* =========================
            PROFILE HEADER
        ========================= */}

        <div className="profile-header">

          <img
            src={profileImage}
            alt="avatar"
            className="profile-image"

            onError={(e) => {

              e.currentTarget.onerror =
                null;

              e.currentTarget.src =
                "/default-avatar.png";

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



        {/* =========================
            USER INFO CARD
        ========================= */}

        <div className="profile-info-card">

          <h3 className="profile-fullname">

            {
              `${user.first_name || ""} ${
                user.last_name || ""
              }`
                .trim() ||
              "No name added"
            }

          </h3>


          <p className="profile-bio">

            {user.bio ||
              "No bio yet"}

          </p>

        </div>



        {/* =========================
            BALANCE
        ========================= */}

        <div className="profile-balance">

          <span className="balance-label">

            My Balance

          </span>


          <span className="balance-value">

            🪙 {user.coin_balance ?? 0}

          </span>


          <button
            type="button"
            className="balance-add-btn"
            aria-label="Add coins"
          >

            <span>

              +

            </span>

          </button>

        </div>



        {/* =========================
            CREATE POST
        ========================= */}

        <div className="profile-create-post-wrapper">

          <button
            type="button"
            className="profile-create-post-btn"
            onClick={handleCreatePost}
          >

            ✨ Create New Post

          </button>

        </div>



        {/* =========================
            STATS CARD
        ========================= */}

        <div className="profile-stats-card">


          {/* FOLLOWERS */}

          <div
            className="profile-stat"
            onClick={handleFollowersClick}
            role="button"
            tabIndex={0}
          >

            <span className="profile-stat-count">

              {user.followers_count ?? 0}

            </span>


            <span className="profile-stat-label">

              Followers

            </span>

          </div>



          <div className="profile-stat-divider"></div>



          {/* FOLLOWING */}

          <div
            className="profile-stat"
            onClick={handleFollowingClick}
            role="button"
            tabIndex={0}
          >

            <span className="profile-stat-count">

              {user.following_count ?? 0}

            </span>


            <span className="profile-stat-label">

              Following

            </span>

          </div>


        </div>



        {/* =========================
            ACTION BUTTONS
        ========================= */}

        <div className="profile-btn-group">


          {/* EDIT */}

          <button
            type="button"
            className="profile-edit-btn"
            onClick={handleEditProfile}
          >

            Edit Profile

          </button>



          {/* LOGOUT */}

          <button
            type="button"
            className="profile-logout-btn"
            onClick={handleLogout}
          >

            Logout

          </button>


        </div>



        {/* =========================
            MORE MENU
        ========================= */}

        <div className="profile-more-menu">


          <button
            type="button"
            className="profile-more-btn"
            onClick={handleMenuToggle}
            aria-label="More options"
            aria-expanded={isMenuOpen}
          >

            ⋮

          </button>



          {isMenuOpen && (

            <div className="profile-more-dropdown">


              {/* MY REPORTS */}

              <button
                type="button"
                className="profile-more-item"
                onClick={handleMyReportsClick}
              >

                My Reports

              </button>


            </div>

          )}

        </div>



        {/* =========================
            MY POSTS
        ========================= */}

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