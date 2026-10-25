
import axios from "axios";

const BASE_URL =
  window.location.hostname === "localhost"
    ? "https://localhost:8001"
    : "https://192.168.1.7:8001";

const AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const NO_AUTH_ENDPOINTS = [
  "/auth/jwt/create/",
  "/auth/jwt/refresh/",
  "/auth/users/reset_password/",
  "/auth/users/reset_password_confirm/",
];

let refreshPromise = null;

const isNoAuthEndpoint = (url = "") =>
  NO_AUTH_ENDPOINTS.some((endpoint) =>
    url.startsWith(endpoint)
  );

const clearAuthAndRedirect = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user_id");

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// REQUEST INTERCEPTOR
AxiosInstance.interceptors.request.use(
  (config) => {
    if (!isNoAuthEndpoint(config.url || "")) {
      const token = localStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `JWT ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
AxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";

    if (
      isNoAuthEndpoint(requestUrl) ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const refreshToken = localStorage.getItem("refreshToken");

          if (!refreshToken) {
            throw new Error("Refresh token missing");
          }

          const response = await refreshClient.post(
            "/auth/jwt/refresh/",
            {
              refresh: refreshToken,
            }
          );

          const newAccessToken = response.data.access;

          if (!newAccessToken) {
            throw new Error("New access token missing");
          }

          localStorage.setItem(
            "accessToken",
            newAccessToken
          );

          return newAccessToken;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `JWT ${newAccessToken}`;

      return AxiosInstance(originalRequest);
    } catch (refreshError) {
      const status = refreshError.response?.status;

      // LOGOUT ONLY WHEN REFRESH TOKEN IS REJECTED
      if (status === 400 || status === 401) {
        clearAuthAndRedirect();
      } else {
        console.error(
          "Access token refresh failed:",
          refreshError.message
        );
      }

      return Promise.reject(refreshError);
    }
  }
);

export default AxiosInstance;
