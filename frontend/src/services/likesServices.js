import AxiosInstance from "../component/auth/axiosInstance";

const likeService = {
    getLikes(params = {}) {
        return AxiosInstance.get(
            "/likes/",
            {
                params,
            }
        );
    },

    createLike(
        contentType,
        objectId,
    ) {
        return AxiosInstance.post(
            "/likes/",
            {
                content_type: contentType,
                object_id: objectId,
            }
        );
    },

    deleteLike(
        contentType,
        objectId,
    ) {
        return AxiosInstance.delete(
            `/likes/${contentType}/${objectId}/`
        );
    },
};

export default likeService;