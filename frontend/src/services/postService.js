import AxiosInstance from "../component/auth/axiosInstance";


const postService = {

    createPost(formData) {
        return AxiosInstance.post(
            "/post/create/",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
    },

    getPosts(params = {}) {
        return AxiosInstance.get(
            "/post/",
            {
                params,
            }
        );
    },

    getPost(postId) {
        return AxiosInstance.get(
            `/post/${postId}/`
        );
    },

    getSelfPosts(params = {}) {
        return AxiosInstance.get(
            "/post/my-posts/",
            {
                params,
            }
        );
    },

    getUserPosts(userId, params = {}) {
        return AxiosInstance.get(
            `/post/users/${userId}/posts/`,
            {
                params,
            }
        );
    },

    updatePost(postId, formData) {
        return AxiosInstance.put(
            `/post/${postId}/update/`,
            formData,

            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }

        );
    },

    deletePost(postId) {
        return AxiosInstance.delete(
            `/post/${postId}/delete/`
        );
    },
};

export default postService;