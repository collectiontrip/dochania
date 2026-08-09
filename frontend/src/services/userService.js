import AxiosInstance from "../component/auth/axiosInstance";

const userService = {

    // Current Logged-in User
    getCurrentUser() {
        return AxiosInstance.get("/users/profile/");
    },

    // Update Profile
    updateProfile(formData) {
        return AxiosInstance.patch("/users/profile/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    // User List
    getUsers(params = {}) {
        return AxiosInstance.get("/users/", {
            params,
        });
    },

    // Search Users
    searchUsers(search) {
        return AxiosInstance.get("/users/", {
            params: {
                search,
            },
        });
    },

    // User Detail
    getUser(id) {
        return AxiosInstance.get(`/users/${id}/`);
    },

    // Save Public Key
    savePublicKey(public_key) {
        return AxiosInstance.post("/users/save-public-key/", {
            public_key,
        });
    },

    // Get Public Key
    getUserPublicKey(userId) {
        return AxiosInstance.get(`/users/${userId}/public-key/`);
    },

    // Save Device
    saveDevice(device_info) {
        return AxiosInstance.post("/users/save-device/", {
            device_info,
        });
    },

};

export default userService;