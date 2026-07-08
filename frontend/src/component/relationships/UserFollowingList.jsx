import React, { useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";
import followService from "../../services/followService";
import Follow from "./Follow";

import "./UserFollowerList.css";

const UserFollowingList = () => {

    const { userId } = useParams();
    const navigate = useNavigate();

    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchFollowing();
    }, [userId]);

    const fetchFollowing = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await followService.getUserFollowing(userId);

            setFollowing(response.data);
            console.log(response.data);

        } catch (error) {

            console.error(error);
            setError("Failed to load following list.");

        } finally {

            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="follower-page">
                Loading following...
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

                <h2>Following</h2>

                <p>
                    People this user follows
                </p>

            </div>

            {
                following.length === 0 ? (

                    <p className="empty-state">
                        Not following anyone yet.
                    </p>

                ) : (

                    <div className="follower-list">

                        {
                            following.map((item) => {

                                const followedUser =
                                    item.following;

                                return (

                                    <div
                                        key={item.id}
                                        className="follower-card"
                                    >

                                        <div
                                            className="follower-user"
                                            onClick={() =>
                                                navigate(
                                                    `/users/${followedUser.id}`
                                                )
                                            }
                                        >

                                            <img
                                                src={
                                                    followedUser.profile_picture ||
                                                    "/default-avatar.png"
                                                }
                                                alt={
                                                    followedUser.username
                                                }
                                                className="follower-avatar"
                                            />

                                            <div className="follower-info">

                                                <span className="follower-username">
                                                    {
                                                        followedUser.username
                                                    }
                                                </span>

                                            </div>

                                        </div>

                                        <div className="follower-action">

                                            <Follow
                                                userId={
                                                    followedUser.id
                                                }
                                                isFollowing={
                                                    followedUser.is_following
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

export default UserFollowingList;