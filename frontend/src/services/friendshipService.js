import AxiosInstance from "../component/auth/axiosInstance";


const friendshipService =  {

    getFriends() {
        return AxiosInstance.get(
            "/relationships/friends/"
        );
    },

    getFriendDetail(id) {
        return AxiosInstance.get(
            `/relationships/friends/${id}/`
        );
    },

    unfriend(userId) {
        return AxiosInstance.delete(
            `/relationships/friends/remove/${userId}`
        );
    },



};

export default friendshipService;