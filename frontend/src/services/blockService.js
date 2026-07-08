import AxiosInstance from "../component/auth/axiosInstance";


const blockService = {

    blockUser(userId) {
        return AxiosInstance.post(
            "/relationships/blocks/",
            {
                blocked: userId
            }
        );
    },

    

    unblockUser(userId) {
        return AxiosInstance.delete(
            `/relationships/blocks/unblock/${userId}/`
        );
    },
};

export default blockService;