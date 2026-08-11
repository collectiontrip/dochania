
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AxiosInstance from "./axiosInstance";
import { getUserId } from "../../services/authService";
import DeviceDetector from "device-detector-js";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ==========================================================
  // Device Name
  // ==========================================================

  const getDeviceName = () => {
    const detector = new DeviceDetector();
    const device = detector.parse(navigator.userAgent);

    const ua = navigator.userAgent;

    console.log("🧠 Full Device Data:", device);

    // Best case: device model available
    if (device.device?.model) {
      return `${device.device.brand || ""} ${device.device.model}`.trim();
    }

    // Device type fallback
    if (device.device?.type) {
      return device.device.type.toUpperCase();
    }

    // Android
    if (/android/i.test(ua)) {
      return "Android Device";
    }

    // iPhone
    if (/iPhone/i.test(ua)) {
      return "iPhone";
    }

    // Windows
    if (/Windows/i.test(ua)) {
      return "Windows PC";
    }

    // Mac
    if (/Mac/i.test(ua)) {
      return "MacBook";
    }

    // Linux
    if (/Linux/i.test(ua)) {
      return "Linux Laptop";
    }

    return "Unknown Device";
  };

  // ==========================================================
  // Device Information
  // ==========================================================

  const getDeviceInfo = () => {
    return {
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      device_name: getDeviceName(),
    };
  };

  // ==========================================================
  // Generate RSA Key Pair
  // ==========================================================

  const generateKeyPair = async () => {
    console.log("🔑 Generating RSA key pair...");

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // Export public key
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    const publicKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(publicKeyBuffer))
    );

    // Export private key
    const privateKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );

    // Save private key locally
    localStorage.setItem(
      "privateKey",
      JSON.stringify(privateKeyJwk)
    );

    console.log("✅ Key pair generated");

    return publicKeyBase64;
  };

  // ==========================================================
  // Login Submit
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await AxiosInstance.post(
        "/auth/jwt/create/",
        {
          username: username.trim(),
          password: password.trim(),
        }
      );

      const { access, refresh } = res.data;

      // Save JWT tokens
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // Get user ID from JWT
      const userId = getUserId();

      localStorage.setItem("user_id", userId);

      console.log(
        "👤 Logged in user id:",
        userId
      );

      // ======================================================
      // Generate fresh RSA keys
      // ======================================================

      const publicKey = await generateKeyPair();

      // ======================================================
      // Save public key
      // ======================================================

      await AxiosInstance.post(
        "/users/save-public-key/",
        {
          public_key: publicKey,
        }
      );

      console.log(
        "📤 Public Key sent to server:",
        publicKey
      );

      console.log(
        "🔐 Private Key stored locally"
      );

      // ======================================================
      // Save Device
      // ======================================================

      const deviceInfo = getDeviceInfo();

      console.log(
        "📱 Device Info:",
        deviceInfo
      );

      console.log(
        "🔥 DEVICE NAME CHECK:",
        deviceInfo.device_name
      );

      try {
        const deviceResponse = await AxiosInstance.post(
          "/users/save-device/",
          {
            device_info: deviceInfo,
          }
        );

        console.log(
          "📱 Device info saved:",
          deviceResponse.data
        );
      } catch (deviceError) {
        console.error(
          "❌ Device save failed:",
          deviceError.response?.data ||
            deviceError.message
        );
      }

      // ======================================================
      // Login Success
      // ======================================================

      alert("Login successful");

      navigate("/home");

    } catch (err) {
      console.error(
        "❌ Login error:",
        err.response?.data || err
      );

      const data = err.response?.data;

      // ======================================================
      // Account Locked
      // ======================================================

      if (data?.locked_until) {
        setError(
          data.detail ||
            "Your account is temporarily locked. Please try again later."
        );

        return;
      }

      // ======================================================
      // Wrong Password
      // ======================================================

      if (
        data?.remaining_attempts !== undefined
      ) {
        setError(
          `${data.detail} ${data.remaining_attempts} attempt${
            data.remaining_attempts === 1
              ? ""
              : "s"
          } remaining.`
        );

        return;
      }

      // ======================================================
      // Inactive Account
      // ======================================================

      if (
        data?.detail ===
        "Your account is inactive. Please activate your account first."
      ) {
        setError(
          "Your account is inactive. Please activate your account first."
        );

        return;
      }

      // ======================================================
      // Invalid Username / Password
      // ======================================================

      if (
        err.response?.status === 400
      ) {
        setError(
          data?.detail ||
            "Invalid username or password."
        );

        return;
      }

      // ======================================================
      // Server Error
      // ======================================================

      setError(
        "Server not reachable. Please try again later."
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <h2 className="login-title">
            Welcome Back
          </h2>

          <p className="login-subtitle">
            Sign in to continue to MediaApp
          </p>

        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          {/* Username */}

          <div className="login-field">

            <label className="login-label">
              Username
            </label>

            <input
              className="login-input"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Enter your username"
              autoComplete="username"
              required
            />

          </div>

          {/* Password */}

          <div className="login-field">

            <label className="login-label">
              Password
            </label>

            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

          </div>

          {/* Error */}

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          {/* Sign In */}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

          {/* Footer */}

          <div className="login-footer">

            <p
              className="forgot-link"
              onClick={() =>
                navigate("/forgot-password")
              }
            >
              Forgot Password?
            </p>

          </div>

        </form>

      </div>

    </div>
  );
};

export default Login;

