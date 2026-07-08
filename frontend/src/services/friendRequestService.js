import AxiosInstance from "../component/auth/axiosInstance";


const friendRequestService = {

    sendRequest(userId) {
        return AxiosInstance.post(
            "/relationships/friend-requests/",
            {
                receiver: userId
            }
        );
    },

    getReceivedRequests() {
        return AxiosInstance.get(
            "/relationships/friend-requests/received"
        );
    },

    getSendRequests() {
        return AxiosInstance.get(
            "/relationships/friend-requests/sent/"
        );
    },

    getRequestDetail(id) {
        return AxiosInstance.get(
            `/relationships/friend-requests/${id}/`
        );
    },

    acceptRequestDetail(id) {
        return AxiosInstance.get(
            `/relationships/friend-requests/${id}`
        );
    },

    resectRequest(id) {
        return AxiosInstance.patch(
            `relationships/friend-requests/${id}/update/`,
            {
                status: "rejected"
            }
        );
    },

    cancelRequest(id) {
        return AxiosInstance.delete(
            `/relationships/friend-requests/${id}/cancel/`
        );
    },

};

export default friendRequestService;

