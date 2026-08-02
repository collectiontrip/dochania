import AxiosInstance from "../component/auth/axiosInstance";

const BASE_URL = "/comments/";


const commentService = {
    
    getComments(params = {}) {
        return AxiosInstance.get(BASE_URL, {
            params,
        });
    },

    createComment(data) {
        return AxiosInstance.post(
            BASE_URL,
            data
        );
    },

    updateComment(
        commentId,
        data
    ) {
        return AxiosInstance.patch(
            `${BASE_URL}${commentId}/`,
            data
        );
    },

    deleteComment(commentId) {
        return AxiosInstance.delete(
            `${BASE_URL}${commentId}/`
        );
    },
};


export default commentService;