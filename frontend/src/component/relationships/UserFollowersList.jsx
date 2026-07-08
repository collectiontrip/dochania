import React, { useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";
import followService from "../../services/followService";
import Follow from "./Follow";

import "./UserFollowerList.css";

const UserFollowerList = () => {

    const { userId } = useParams();
    const navigate = useNavigate();

    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchFollowers();
    }, [userId]);

    const fetchFollowers = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await followService.getUserFollowers(userId);

            setFollowers(response.data);
            console.log(response.data);

        } catch (error) {

            console.error(error);

            setError("Failed to load followers.");

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
                    People who follow this user
                </p>

            </div>

            {
                followers.length === 0 ? (

                    <p className="empty-state">
                        No followers yet.
                    </p>

                ) : (

                    <div className="follower-list">

                        {
                            followers.map((item) => {

                                const follower =
                                    item.follower;

                                return (

                                    <div
                                        key={item.id}
                                        className="follower-card"
                                    >

                                        <div
                                            className="follower-user"
                                            onClick={() =>
                                                navigate(
                                                    `/users/${follower.id}`
                                                )
                                            }
                                        >

                                            <img
                                                src={
                                                    follower.profile_picture ||
                                                    "/default-avatar.png"
                                                }
                                                alt={
                                                    follower.username
                                                }
                                                className="follower-avatar"
                                            />

                                            <div className="follower-info">

                                                <span className="follower-username">
                                                    {
                                                        follower.username
                                                    }
                                                </span>

                                            </div>

                                        </div>

                                        <div className="follower-action">

                                            <Follow
                                                userId={
                                                    follower.id
                                                }
                                                isFollowing={
                                                    follower.is_following
                                                }
                                            />

                                        </div>

                                    </div>

                                );
                            })
                        }

                    </div>

                )
            }

        </div>
    );
};

export default UserFollowerList;