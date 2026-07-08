import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "./auth/axiosInstance";
import "./Users.css";

const UsersList = () => {

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const navigate = useNavigate();

  const myId = Number(
    localStorage.getItem("user_id")
  );

  // =========================
  // FETCH USERS
  // =========================
  useEffect(() => {

    const fetchUsers = async () => {

      try {

        console.log(
          "🔥 FETCHING USERS..."
        );

        const res =
          await AxiosInstance.get(
            "/auth/users/"
          );

        console.log(
          "✅ USERS RESPONSE:",
          res.data
        );

        const list = Array.isArray(
          res.data
        )
          ? res.data
          : res.data?.results || [];

        console.log(
          "👥 FINAL USERS LIST:",
          list
        );

        setUsers(list);

      } catch (err) {

        console.error(
          "❌ USERS FETCH ERROR:",
          err
        );

        console.log(
          "❌ ERROR RESPONSE:",
          err.response?.data
        );

        if (
          err.response?.status === 401
        ) {

          setError(
            "Session expired. Please login again."
          );

        } else if (
          err.response?.status === 403
        ) {

          setError(
            "You are not allowed to view users."
          );

        } else {

          setError(
            "Failed to load users."
          );
        }

      } finally {

        setLoading(false);
      }
    };

    fetchUsers();

  }, []);

  // =========================
  // LOADING
  // =========================
  if (loading) {

    return (

      <div className="users-page">

        <div className="users-loading">
          Loading users...
        </div>

      </div>
    );
  }

  // =========================
  // ERROR
  // =========================
  if (error) {

    return (

      <div className="users-page">

        <div className="users-error">
          {error}
        </div>

      </div>
    );
  }

  return (

    <div className="users-page">

      {/* HEADER */}
      <div className="users-header">

        <h1 className="users-title">
          Messages
        </h1>

        <p className="users-subtitle">
          Start chatting with people
        </p>

      </div>

      {/* USERS GRID */}
      <div className="users-grid">

        {users
          .filter(
            (user) =>
              user?.id !== myId
          )
          .map((user) => {

            // =========================
            // PROFILE IMAGE
            // =========================
            const profileImage =
              user?.profile_picture
                ? user.profile_picture
                : "/default-avatar.png";

            console.log(
              `👤 USER: ${user.username}`
            );

            console.log(
              "🖼 PROFILE PICTURE FROM API:",
              user.profile_picture
            );

            console.log(
              "🖼 FINAL IMAGE USED:",
              profileImage
            );

            return (

              <div
                key={user.id}
                className="user-card"
              >

                {/* USER TOP */}
                <div className="user-top">

                  {/* PROFILE IMAGE */}
                  <div 
                    className="user-avatar-wrapper user-avatar-wrapper--clickable"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >


                    <img
                      src={profileImage}
                      alt={user.username}
                      className="user-avatar"

                      onLoad={() => {

                        console.log(
                          `✅ IMAGE LOADED SUCCESSFULLY FOR: ${user.username}`
                        );

                        console.log(
                          "🖼 LOADED IMAGE URL:",
                          profileImage
                        );
                      }}

                      onError={(e) => {

                        console.log(
                          `❌ IMAGE LOAD FAILED FOR: ${user.username}`
                        );

                        console.log(
                          "❌ FAILED URL:",
                          e.target.src
                        );

                        // prevent infinite loop
                        e.target.onerror = null;

                        e.target.src =
                          "/default-avatar.png";

                        console.log(
                          "⚠️ DEFAULT IMAGE APPLIED"
                        );
                      }}
                    />

                  </div>

                  {/* USER INFO */}
                  <div className="user-info">

                    <h3 
                      className="user-name user-name--clickable"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      {user.username}
                    </h3>

                    <p className="user-email">
                      {user.email ||
                        "No email available"}
                    </p>

                  </div>

                </div>

                {/* CHAT BUTTON */}
                <button
                  className="chat-btn"
                  onClick={() =>
                    navigate(
                      `/chat/${user.id}`
                    )
                  }
                >
                  Open Chat
                </button>

              </div>
            );
          })}
      </div>

    </div>
  );
};

export default UsersList;