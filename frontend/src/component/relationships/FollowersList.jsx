import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import followService from "../../services/followService";
import Follow from "./Follow";

import "./UserFollowerList.css";

const FollowerList = () => {

    const navigate = useNavigate();

    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchFollowers();
    }, []);

    const fetchFollowers = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await followService.getFollowers();

            setFollowers(response.data);

            console.log(response.data);

        } catch (error) {

            console.error(error);

            setError(
                "Failed to load followers list."
            );

        } finally {

            setLoading(false);
        }
    };

    if (loading) {

        return (
            <div className="follower-page">
                Loading followers...
            </div>
        );
    }

    if (error) {

        return (
            <div className="follower-page">
                {error}
            </div>
        );
    }

    return (

        <div className="follower-page">

            <div className="follower-header">

                <h2>Followers</h2>

                <p>
                    People following you
                </p>

            </div>

            {
                followers.length === 0 ? (

                    <p className="empty-state">
                        No followers yet.
                    </p>

                ) : (

                    followers.map((item) => {

                        const followerUser =
                            item.follower;

                        return (

                            <div
                                className="follower-card"
                                key={item.id}
                            >

                                <div
                                    className="follower-user"
                                    onClick={() =>
                                        navigate(
                                            `/users/${followerUser.id}`
                                        )
                                    }
                                >

                                    <img
                                        src={
                                            followerUser.profile_picture ||
                                            "/default-avatar.png"
                                        }
                                        alt={
                                            followerUser.username
                                        }
                                        className="follower-avatar"
                                    />

                                    <div className="follower-info">

                                        <span className="follower-username">
                                            {
                                                followerUser.username
                                            }
                                        </span>

                                    </div>

                                </div>

                                <div className="follower-action">

                                    <Follow
                                        userId={
                                            followerUser.id
                                        }

                                        isFollowing={followerUser.is_following}
                                    />

                                </div>

                            </div>
                        );
                    })
                )
            }

        </div>
    );
};

export default FollowerList;