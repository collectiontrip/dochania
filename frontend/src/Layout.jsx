import {
    Routes,
    Route,
    NavLink,
    Navigate,
} from "react-router-dom";

import {
    useEffect,
} from "react";

import {
    getRealtimeSocket,
    resetRealtimeSocket,
} from "./socket/socketManager";

import {
    useUser,
} from "./contexts/UserContext";

import Home from "./component/home";

import MediaAccess from "./component/Media/Media";

import SignUp from "./component/auth/SignUp";

import CreatePost from "./component/post/CreatePost";

import Activate from "./component/auth/Activate";

import Login from "./component/auth/SignIn";

import ResetPassword from "./component/auth/ResetPassword";

import ForgotPassword from "./component/auth/ForgotPassword";

import PrivateChat from "./component/chat/PrivateChat";

import Users from "./component/Users";

import UserFollowerList
from "./component/relationships/UserFollowersList";

import UserFollowingList
from "./component/relationships/UserFollowingList";

import Live from "./component/Live";

import Viewer from "./component/Viewer";

import Profile
from "./component/Profile/Profile";

import FollowerList
from "./component/relationships/FollowersList";

import FollowingList
from "./component/relationships/FollowingList";

import SelfPostList
from "./component/post/SelfPostList/SelfPostList";

import UserPostList
from "./component/post/PostList/UserPostList/UserPostList";

import PostDetail
from "./component/post/postDetail/PostDetail";

import MyReports
from "./component/report/MyReport";

import UpdateProfile
from "./component/Profile/UpdateProfile";

import UserProfile
from "./component/Profile/UserProfile";

import ModerationPage
from "./component/moderation/ModerationPage";

import ModerationCaseDetail
from "./component/moderation/ModerationDetail/ModerationCaseDetail";

import "./App.css";


// ============================================================
// LAYOUT
// ============================================================

const Layout = () => {

    const {
        user,
        loading,
    } = useUser();


    // ============================================================
    // AUTHENTICATION STATE
    // ============================================================

    const isAuthenticated =
        Boolean(user);


    // ============================================================
    // MODERATION ACCESS
    // ============================================================
    //
    // Moderation access is granted to:
    //
    // 1. Superusers
    // 2. Users explicitly marked as moderators
    //
    // Normal users do not get moderation access.
    // Backend permissions remain the final security layer.
    // ============================================================

    const canAccessModeration =
        isAuthenticated &&
        Boolean(
            user?.is_superuser ||
            user?.is_moderator
        );


    // ============================================================
    // PROFILE IMAGE
    // ============================================================

    const profileImage =
        user?.profile_picture
        || "/default-avatar.png";


    // ============================================================
    // REALTIME SOCKET
    // ============================================================

    useEffect(() => {

        if (loading) {
            return;
        }


        if (isAuthenticated) {

            getRealtimeSocket();

        } else {

            resetRealtimeSocket();

        }


        return () => {

            if (!isAuthenticated) {
                resetRealtimeSocket();
            }

        };

    }, [
        isAuthenticated,
        loading,
    ]);


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <h2 className="profile-loading">
                Loading...
            </h2>

        );

    }


    // ============================================================
    // RENDER
    // ============================================================

    return (

        <div className="app-root">


            {/* ======================================================
                HEADER
            ====================================================== */}

            <header className="app-header">


                {/* ====================================================
                    LOGO
                ==================================================== */}

                <div className="logo">
                    MediaApp
                </div>


                {/* ====================================================
                    NAVIGATION
                ==================================================== */}

                <nav className="nav-bar">


                    {/* ==================================================
                        HOME
                    ================================================== */}

                    <NavLink
                        to="/home"
                        className={({ isActive }) =>
                            isActive
                                ? "nav-link active"
                                : "nav-link"
                        }
                    >
                        Home
                    </NavLink>


                    {/* ==================================================
                        MEDIA
                    ================================================== */}

                    <NavLink
                        to="/media"
                        className={({ isActive }) =>
                            isActive
                                ? "nav-link active"
                                : "nav-link"
                        }
                    >
                        Media
                    </NavLink>


                    {/* ==================================================
                        USERS
                    ================================================== */}

                    <NavLink
                        to="/users"
                        className={({ isActive }) =>
                            isActive
                                ? "nav-link active"
                                : "nav-link"
                        }
                    >
                        Users
                    </NavLink>


                    {/* ==================================================
                        AUTHENTICATED LINKS
                    ================================================== */}

                    {isAuthenticated && (

                        <>


                            {/* ==============================================
                                GO LIVE
                            ============================================== */}

                            <NavLink
                                to="/live"
                                className={({ isActive }) =>
                                    isActive
                                        ? "nav-link active"
                                        : "nav-link"
                                }
                            >
                                🔴 Go Live
                            </NavLink>


                            {/* ==============================================
                                WATCH LIVE
                            ============================================== */}

                            <NavLink
                                to="/watch"
                                className={({ isActive }) =>
                                    isActive
                                        ? "nav-link active"
                                        : "nav-link"
                                }
                            >
                                👀 Watch Live
                            </NavLink>


                            {/* ==============================================
                                MODERATION
                            ============================================== */}

                            {canAccessModeration && (

                                <NavLink
                                    to="/moderation"
                                    className={({ isActive }) =>
                                        isActive
                                            ? "nav-link active"
                                            : "nav-link"
                                    }
                                >
                                    🛡️ Moderation
                                </NavLink>

                            )}


                            {/* ==============================================
                                PROFILE
                            ============================================== */}

                            <NavLink
                                to="/profile"
                                className={({ isActive }) =>
                                    isActive
                                        ? "nav-link profile-nav active"
                                        : "nav-link profile-nav"
                                }
                            >

                                <img
                                    src={profileImage}
                                    alt={
                                        user?.username
                                        || "Profile"
                                    }
                                    className="nav-profile-image"
                                    onError={(event) => {

                                        event.currentTarget.onerror =
                                            null;

                                        event.currentTarget.src =
                                            "/default-avatar.png";

                                    }}
                                />


                                <div className="nav-profile-info">

                                    <span className="nav-profile-name">
                                        {
                                            user?.username
                                        }
                                    </span>


                                    <span className="nav-profile-coins">
                                        🪙{" "}
                                        {
                                            user?.coin_balance
                                            ?? 0
                                        }
                                    </span>

                                </div>

                            </NavLink>


                        </>

                    )}


                    {/* ==================================================
                        GUEST LINKS
                    ================================================== */}

                    {!isAuthenticated && (

                        <>


                            {/* ==============================================
                                SIGN UP
                            ============================================== */}

                            <NavLink
                                to="/signup"
                                className={({ isActive }) =>
                                    isActive
                                        ? "nav-link active"
                                        : "nav-link"
                                }
                            >
                                SignUp
                            </NavLink>


                            {/* ==============================================
                                LOGIN
                            ============================================== */}

                            <NavLink
                                to="/login"
                                className={({ isActive }) =>
                                    isActive
                                        ? "nav-link active"
                                        : "nav-link"
                                }
                            >
                                Login
                            </NavLink>


                        </>

                    )}

                </nav>

            </header>


            {/* ======================================================
                MAIN CONTENT
            ====================================================== */}

            <main className="app-container">

                <Routes>


                    {/* ==================================================
                        ROOT
                    ================================================== */}

                    <Route
                        path="/"
                        element={
                            <Navigate
                                to="/home"
                                replace
                            />
                        }
                    />


                    {/* ==================================================
                        PUBLIC ROUTES
                    ================================================== */}

                    <Route
                        path="/home"
                        element={<Home />}
                    />


                    <Route
                        path="/media"
                        element={<MediaAccess />}
                    />


                    <Route
                        path="/users"
                        element={<Users />}
                    />


                    <Route
                        path="/posts/:id"
                        element={<PostDetail />}
                    />


                    <Route
                        path="/signup"
                        element={<SignUp />}
                    />


                    <Route
                        path="/login"
                        element={<Login />}
                    />


                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />


                    <Route
                        path="/password/reset/confirm/:uid/:token"
                        element={<ResetPassword />}
                    />


                    <Route
                        path="/activate/:uid/:token"
                        element={<Activate />}
                    />


                    {/* ==================================================
                        AUTHENTICATED ROUTES
                    ================================================== */}


                    {/* ==================================================
                        USER PROFILE
                    ================================================== */}

                    <Route
                        path="/users/:id"
                        element={
                            isAuthenticated
                                ? <UserProfile />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        PROFILE
                    ================================================== */}

                    <Route
                        path="/profile"
                        element={
                            isAuthenticated
                                ? <Profile />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        PROFILE FOLLOWERS
                    ================================================== */}

                    <Route
                        path="/profile/followers"
                        element={
                            isAuthenticated
                                ? <FollowerList />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        PROFILE FOLLOWING
                    ================================================== */}

                    <Route
                        path="/profile/following"
                        element={
                            isAuthenticated
                                ? <FollowingList />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        USER FOLLOWERS
                    ================================================== */}

                    <Route
                        path="/profile/:userId/followers"
                        element={
                            isAuthenticated
                                ? <UserFollowerList />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        USER FOLLOWING
                    ================================================== */}

                    <Route
                        path="/profile/:userId/following"
                        element={
                            isAuthenticated
                                ? <UserFollowingList />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        USER POSTS
                    ================================================== */}

                    <Route
                        path="/profile/:userId/posts"
                        element={
                            isAuthenticated
                                ? <UserPostList />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        CREATE POST
                    ================================================== */}

                    <Route
                        path="/create-post"
                        element={
                            isAuthenticated
                                ? <CreatePost />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        MY POSTS
                    ================================================== */}

                    <Route
                        path="/my-posts"
                        element={
                            isAuthenticated
                                ? <SelfPostList />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        PRIVATE CHAT
                    ================================================== */}

                    <Route
                        path="/chat/:userId"
                        element={
                            isAuthenticated
                                ? <PrivateChat />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        MY REPORTS
                    ================================================== */}

                    <Route
                        path="/reports"
                        element={
                            isAuthenticated
                                ? <MyReports />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        EDIT PROFILE
                    ================================================== */}

                    <Route
                        path="/edit-profile"
                        element={
                            isAuthenticated
                                ? <UpdateProfile />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        GO LIVE
                    ================================================== */}

                    <Route
                        path="/live"
                        element={
                            isAuthenticated
                                ? <Live />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        WATCH LIVE
                    ================================================== */}

                    <Route
                        path="/watch"
                        element={
                            isAuthenticated
                                ? <Viewer />
                                : (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )
                        }
                    />


                    {/* ==================================================
                        MODERATION
                    ================================================== */}

                    <Route
                        path="/moderation"
                        element={

                            !isAuthenticated

                                ? (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )

                                : canAccessModeration

                                    ? (
                                        <ModerationPage />
                                    )

                                    : (
                                        <Navigate
                                            to="/home"
                                            replace
                                        />
                                    )

                        }
                    />


                    {/* ==================================================
                        MODERATION CASE DETAIL
                    ================================================== */}

                    <Route
                        path="/moderation/:caseId"
                        element={

                            !isAuthenticated

                                ? (
                                    <Navigate
                                        to="/login"
                                        replace
                                    />
                                )

                                : canAccessModeration

                                    ? (
                                        <ModerationCaseDetail />
                                    )

                                    : (
                                        <Navigate
                                            to="/home"
                                            replace
                                        />
                                    )

                        }
                    />


                    {/* ==================================================
                        FALLBACK
                    ================================================== */}

                    <Route
                        path="*"
                        element={
                            <Navigate
                                to="/home"
                                replace
                            />
                        }
                    />

                </Routes>

            </main>

        </div>

    );

};


export default Layout;