import AxiosInstance from "../component/auth/axiosInstance";


const userService = {
    
    getCurrentUser() {
        return AxiosInstance.get("/users/profile/");
    },


};

export default userService;