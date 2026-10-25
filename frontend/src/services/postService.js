import AxiosInstance from "../component/auth/axiosInstance";

const postService = {
    // Create a new post
    createPost(formData) {
        return AxiosInstance.post(
            "/post/create/",
            formData
        );
    },

    // Get all posts
    getPosts(params = {}) {
        return AxiosInstance.get(
            "/post/",
            {
                params,
            }
        );
    },

    // Get a single post by UUID
    getPost(postId) {
        return AxiosInstance.get(
            `/post/${postId}/`
        );
    },

    // Get logged-in user's posts
    getSelfPosts(params = {}) {
        return AxiosInstance.get(
            "/post/my-posts/",
            {
                params,
            }
        );
    },

    // Get posts belonging to a specific user
    getUserPosts(userId, params = {}) {
        return AxiosInstance.get(
            `/post/users/${userId}/posts/`,
            {
                params,
            }
        );
    },

    // Update post fields and media
    updatePost(postId, formData) {
        return AxiosInstance.put(
            `/post/${postId}/update/`,
            formData
        );
    },

    // Delete a post
    deletePost(postId) {
        return AxiosInstance.delete(
            `/post/${postId}/delete/`
        );
    },
};

export default postService;