import {
    useEffect,
    useState,
} from "react";

import {
    useParams,
    useNavigate,
} from "react-router-dom";

import AxiosInstance from "../auth/axiosInstance";

import Follow from "../relationships/Follow";
import Block from "../relationships/Block";

import UserPostList from "../post/PostList/UserPostList/UserPostList";

import "./UserProfile.css";

const UserProfile = () => {

    const { id } = useParams();

    const navigate = useNavigate();

    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    useEffect(() => {

        const fetchUser = async () => {

            try {

                const response =
                    await AxiosInstance.get(
                        `/users/${id}/`
                    );

                setUser(response.data);

            } catch (error) {

                console.error(error);

                setError(
                    "Failed to load user profile."
                );

            } finally {

                setLoading(false);

            }

        };

        fetchUser();

    }, [id]);

    if (loading) {

        return (

            <div className="user-profile-loading">
                Loading...
            </div>

        );

    }

    if (error) {

        return (

            <div className="user-profile-error">
                {error}
            </div>

        );

    }

    return (

        <div className="user-profile-page">

            <div className="user-profile-card">

                <div className="user-profile-header">

                    <img
                        src={
                            user?.profile_picture ||
                            "/default-avatar.png"
                        }
                        alt="profile"
                        className="user-profile-avatar"
                        onError={(e) => {

                            e.currentTarget.onerror = null;

                            e.currentTarget.src =
                                "/default-avatar.png";

                        }}
                    />

                    <h2 className="user-profile-username">
                        {user?.username}
                    </h2>

                    <p className="user-profile-email">
                        {user?.email}
                    </p>

                </div>

                <div className="user-profile-info-card">

                    <h3 className="user-profile-fullname">

                        {
                            `${user?.first_name || ""}
                             ${user?.last_name || ""}`
                                .trim() ||

                            "No name added"
                        }

                    </h3>

                    <p className="user-profile-bio">

                        {user?.bio ||
                            "No bio yet"}

                    </p>

                </div>

                <div className="user-stats">

                    <div
                        className="stat-item"
                        onClick={() =>
                            navigate(
                                `/profile/${user.id}/followers`
                            )
                        }
                    >

                        <h3>
                            {user?.followers_count ?? 0}
                        </h3>

                        <span>
                            Followers
                        </span>

                    </div>

                    <div
                        className="stat-item"
                        onClick={() =>
                            navigate(
                                `/profile/${user.id}/following`
                            )
                        }
                    >

                        <h3>
                            {user?.following_count ?? 0}
                        </h3>

                        <span>
                            Following
                        </span>

                    </div>

                </div>

                <div className="user-profile-actions">

                    {
                        !user?.is_blocked &&
                        !user?.blocked_you && (

                            <Follow
                                userId={user.id}
                                isFollowing={
                                    user.is_following
                                }
                            />

                        )
                    }

                    <Block
                        user={user}
                        blocked={user?.is_blocked}
                        blockedYou={user?.blocked_you}
                        onBlockChange={(blocked) =>

                            setUser((prev) => ({

                                ...prev,

                                is_blocked: blocked,

                                is_following: blocked
                                    ? false
                                    : prev.is_following,

                                is_followed_by: blocked
                                    ? false
                                    : prev.is_followed_by,

                            }))
                        }
                    />

                </div>

                <div className="user-profile-posts-section">

                    <h2 className="user-profile-posts-title">

                        Posts

                    </h2>

                    <UserPostList />

                </div>

            </div>

        </div>

    );

};

export default UserProfile;