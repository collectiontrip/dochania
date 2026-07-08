import AxiosInstance from "../component/auth/axiosInstance";

const followService = {

    followUser(userId) {

        return AxiosInstance.post(
            "/relationships/follow/",
            {
                following: userId
            }
        );
    },

    getFollowing() {

        return AxiosInstance.get(
            "/relationships/following/"
        );
    },

    getFollowers() {

        return AxiosInstance.get(
            "/relationships/followers/"
        );
    },

    getUserFollowing(userId) {

        return AxiosInstance.get(
            `/relationships/users/${userId}/following/`
        );
    },

    getUserFollowers(userId) {

        return AxiosInstance.get(
            `/relationships/users/${userId}/followers/`
        );
    },

    unfollowUser(userId) {

        return AxiosInstance.delete(
            `/relationships/unfollow/${userId}/`
        );
    },
};

export default followService;