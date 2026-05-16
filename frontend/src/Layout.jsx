import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";

import { useEffect, useState } from "react";

import Home from "./component/home";

import MediaAccess from "./component/Media/Media";

import SignUp from "./component/auth/SignUp";

import Activate from "./component/auth/Activate";

import Login from "./component/auth/SignIn";

import ResetPassword from "./component/auth/ResetPassword";

import ForgotPassword from "./component/auth/ForgotPassword";

import PrivateChat from "./component/chat/PrivateChat";

import Users from "./component/Users";

import Live from "./component/Live";

import Viewer from "./component/Viewer";

import Profile from "./component/Profile/Profile";

import UpdateProfile from "./component/Profile/UpdateProfile";

import "./App.css";

const Layout = () => {

  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  // 🔐 AUTH CHECK
  useEffect(() => {

    const token =
      localStorage.getItem("accessToken");

    setIsAuthenticated(!!token);

  }, [location.pathname]);

  return (

    <div className="app-root">

      {/* 🔥 HEADER */}
      <header className="app-header">

        <div className="logo">
          MediaApp
        </div>

        <nav className="nav-bar">

          {/* HOME */}
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

          {/* MEDIA */}
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

          {/* USERS */}
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

          {/* 🔴 AUTHENTICATED LINKS */}
          {isAuthenticated && (
            <>

              {/* 🔴 GO LIVE */}
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

              {/* 👀 WATCH LIVE */}
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

              {/* 👤 PROFILE */}
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Profile
              </NavLink>

            </>
          )}

          {/* 🔐 GUEST LINKS */}
          {!isAuthenticated && (
            <>

              {/* SIGNUP */}
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

              {/* LOGIN */}
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

      {/* 🔥 MAIN CONTENT */}
      <main className="app-container">

        <Routes>

          {/* 🔹 DEFAULT */}
          <Route
            path="/"
            element={
              <Navigate
                to="/home"
                replace
              />
            }
          />

          {/* 🔹 HOME */}
          <Route
            path="/home"
            element={<Home />}
          />

          {/* 🔹 MEDIA */}
          <Route
            path="/media"
            element={<MediaAccess />}
          />

          {/* 🔹 USERS */}
          <Route
            path="/users"
            element={<Users />}
          />

          {/* 🔹 PRIVATE CHAT */}
          <Route
            path="/chat/:userId"
            element={<PrivateChat />}
          />

          {/* 👤 PROFILE */}
          <Route
            path="/profile"
            element={
              isAuthenticated
                ? <Profile />
                : <Navigate to="/login" />
            }
          />

          {/* ✏️ UPDATE PROFILE */}
          <Route
            path="/edit-profile"
            element={
              isAuthenticated
                ? <UpdateProfile />
                : <Navigate to="/login" />
            }
          />

          {/* 🔴 GO LIVE */}
          <Route
            path="/live"
            element={
              isAuthenticated
                ? <Live />
                : <Navigate to="/login" />
            }
          />

          {/* 👀 WATCH LIVE */}
          <Route
            path="/watch"
            element={
              isAuthenticated
                ? <Viewer />
                : <Navigate to="/login" />
            }
          />

          {/* 🔐 SIGNUP */}
          <Route
            path="/signup"
            element={<SignUp />}
          />

          {/* 🔐 LOGIN */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* 🔐 FORGOT PASSWORD */}
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          {/* 🔐 RESET PASSWORD */}
          <Route
            path="/password/reset/confirm/:uid/:token"
            element={<ResetPassword />}
          />

          {/* 🔐 ACCOUNT ACTIVATION */}
          <Route
            path="/activate/:uid/:token"
            element={<Activate />}
          />

          {/* ❌ FALLBACK */}
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