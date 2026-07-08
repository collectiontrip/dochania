import React, { useState, useEffect } from "react";
import FollowButton from "./FollowButton";
import followService from "../../services/followService";
import "./FollowButton.css";

const Follow = ({
    userId,
    isFollowing: initialFollowing
}) => {

    const [isFollowing, setIsFollowing] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    useEffect(() => {
        setIsFollowing(
            initialFollowing || false
        );
    }, [initialFollowing]);

    const handleFollow = async () => {

        try {

            setLoading(true);

            await followService.followUser(userId);

            setIsFollowing(true);

        } catch (error) {

            console.error(
                "Follow Error:",
                error.response?.data || error.message
            );

        } finally {

            setLoading(false);
        }
    };

    const handleUnfollow = async () => {

        try {

            setLoading(true);

            await followService.unfollowUser(userId);

            setIsFollowing(false);

        } catch (error) {

            console.error(
                "Unfollow Error:",
                error.response?.data || error.message
            );

        } finally {

            setLoading(false);
        }
    };

    return (
        <FollowButton
            isFollowing={isFollowing}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            disabled={loading}
        />
    );
};

export default Follow;