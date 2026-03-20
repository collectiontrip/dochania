// axiosInstance.js
import axios from "axios";

const BASE_URL =
  window.location.hostname === "localhost"
    ? "https://localhost:8000"
    : "https://192.168.137.1:8000";

const AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

AxiosInstance.interceptors.request.use(
  (config) => {

    const noAuthEndpoints = [
      "/auth/jwt/create/",
      "/auth/users/",
      "/auth/users/reset_password/",
      "/auth/users/reset_password_confirm/",
    ];

    const requestUrl = config.url || "";

    const isNoAuth = noAuthEndpoints.some((url) =>
      requestUrl.startsWith(url)
    );

    if (!isNoAuth) {
      const token = localStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `JWT ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------
// Auth helper (login)
// -------------------------------
export const loginUser = async (username, password) => {
  const res = await AxiosInstance.post("/auth/jwt/create/", {
    username: username.trim(),
    password: password.trim(),
  });

  return res.data;
};

export default AxiosInstance;