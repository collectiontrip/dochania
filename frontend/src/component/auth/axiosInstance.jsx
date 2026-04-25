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

// -------------------------------
// REQUEST INTERCEPTOR
// -------------------------------
AxiosInstance.interceptors.request.use(
  (config) => {
    const noAuthEndpoints = [
      "/auth/jwt/create/",
      "/auth/users/reset_password/",
      "/auth/users/reset_password_confirm/",
      "/auth/jwt/refresh/",
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
// RESPONSE INTERCEPTOR (AUTO REFRESH)
// -------------------------------
AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        // refresh access token
        const res = await axios.post(
          `${BASE_URL}/auth/jwt/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        const newAccessToken = res.data.access;

        localStorage.setItem("accessToken", newAccessToken);

        // update header
        originalRequest.headers.Authorization = `JWT ${newAccessToken}`;

        return AxiosInstance(originalRequest);
      } catch (err) {
        console.log("❌ Refresh failed, logging out");

        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user_id");

        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default AxiosInstance;