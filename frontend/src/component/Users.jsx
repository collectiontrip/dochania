import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import userService from "../services/userService";
import "./Users.css";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const myId = Number(localStorage.getItem("user_id"));

  // =========================
  // FETCH USERS
  // =========================

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await userService.getUsers({
        search,
      });

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];

      setUsers(list);
      setError("");
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else if (err.response?.status === 403) {
        setError("You are not allowed to view users.");
      } else {
        setError("Failed to load users.");
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400);

    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // =========================
  // LOADING
  // =========================

  

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

        {/* SEARCH */}

        <div className="users-search">

          <input
            type="text"
            placeholder="Search users..."
            className="users-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />


        </div>

      {loading && (
        <div className="users-loading">
          Searching...
        </div>
      )}  

      </div>

      {/* EMPTY */}

      {users.length === 0 && !loading && (
        <div className="users-empty">
          No users found.
        </div>
      )}

      {/* USERS */}

      <div className="users-grid">

        {users
          .filter((user) => user.id !== myId)
          .map((user) => {

            const profileImage =
              user.profile_picture || "/default-avatar.png";

            return (

              <div
                key={user.id}
                className="user-card"
              >

                <div className="user-top">

                  {/* Avatar */}

                  <div
                    className="user-avatar-wrapper user-avatar-wrapper--clickable"
                    onClick={() =>
                      navigate(`/users/${user.id}`)
                    }
                  >

                    <img
                      src={profileImage}
                      alt={user.username}
                      className="user-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/default-avatar.png";
                      }}
                    />

                  </div>

                  {/* INFO */}

                  <div className="user-info">

                    <h3
                      className="user-name user-name--clickable"
                      onClick={() =>
                        navigate(`/users/${user.id}`)
                      }
                    >
                      {user.username}
                    </h3>

                    <p className="user-email">
                      {user.email || "No email available"}
                    </p>

                    <div className="user-status-row">

                      {/* Online Status */}

                      <span
                        className={
                          user.is_online
                            ? "status-badge online-status"
                            : "status-badge offline-status"
                        }
                      >

                        <span className="status-dot"></span>

                        {user.is_online
                          ? "Online"
                          : "Offline"}

                      </span>

                      {/* Privacy */}

                      <span
                        className={
                          user.is_private
                            ? "privacy-badge private-badge"
                            : "privacy-badge public-badge"
                        }
                      >
                        {user.is_private
                          ? "🔒 Private Account"
                          : "🌍 Public Account"}
                      </span>

                    </div>

                  </div>

                </div>

                {/* BUTTON */}

                <button
                  className="chat-btn"
                  onClick={() =>
                    navigate(`/chat/${user.id}`)
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