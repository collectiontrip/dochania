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

  const getDeviceName = () => {
    const detector = new DeviceDetector();
    const device = detector.parse(navigator.userAgent);
    
    const ua = navigator.userAgent;

    console.log("🧠 Full Device Data:", device);

    // ✅ 1. Agar model mil gaya (best case)
    if (device.device?.model) {
      return `${device.device.brand || ""} ${device.device.model}`.trim();
    }

    if (device.device?.type) {
      return device.device.type.toUpperCase();
    }

    // ✅ 2. Android fallback (IMPORTANT FIX 🔥)
    if (/android/i.test(ua)) {
      return "Android Device";
    }

    // ✅ 3. iPhone
    if (/iPhone/i.test(ua)) {
      return "iPhone";
    }

    // ✅ 4. Windows
    if (/Windows/i.test(ua)) {
      return "Windows PC";
    }

    // ✅ 5. Mac
    if (/Mac/i.test(ua)) {
      return "MacBook";
    }
    if (/Linux/i.test(ua)) {
      return "Linux Laptop";
    }

    // ❌ Last fallback
    return "Unknown Device";
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;

    return {
      user_agent: userAgent,
      platform: navigator.platform,
      language: navigator.language,
      device_name: getDeviceName(),
    };
  };

  // ------------------------------
  // Generate RSA Key Pair
  // ------------------------------
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

    // Export Public Key
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    const publicKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(publicKeyBuffer))
    );

    // Export Private Key
    const privateKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );

    // Save Private Key locally
    localStorage.setItem("privateKey", JSON.stringify(privateKeyJwk));

    console.log("✅ Key pair generated");

    return publicKeyBase64;
  };

  // ------------------------------
  // Login Submit
  // ------------------------------
  const handleSubmit = async (e) => {

    e.preventDefault();
    setError("");
    setLoading(true);

    try {

      const res = await AxiosInstance.post("/auth/jwt/create/", {
        username: username.trim(),
        password: password.trim(),
      });

      const { access, refresh } = res.data;

      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // Get user id from token
      const userId = getUserId();
      localStorage.setItem("user_id", userId);

      console.log("👤 Logged in user id:", userId);

      // Always generate fresh keys
      const publicKey = await generateKeyPair();

      // Save public key to backend
      await AxiosInstance.post("/users/save-public-key/", {
        public_key: publicKey,
        
      });

      

      console.log("📤 Public Key sent to server:", publicKey);
      console.log("🔐 Private Key stored locally");
      const deviceInfo = getDeviceInfo();
      console.log("📱 Device Info:", deviceInfo);

      console.log("🔥 DEVICE NAME CHECK:", deviceInfo.device_name);
      await AxiosInstance.post("/users/save-device/", {
        device_info: deviceInfo,
      })
      .then((res) => {
        console.log("📱 Device info saved:", res.data);
      })
      .catch((err) => {
        console.error("❌ Device save failed:", err.response?.data || err.message);
      });
      

      alert("Login successful");

      navigate("/home");

    } catch (err) {

      console.error(err);

      if (err.response && err.response.status === 400) {
        setError("Invalid username or password");
      } else {
        setError("Server not reachable");
      }

    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="login-container">

      <h2 className="login-title">Sign In</h2>

      <form className="login-form" onSubmit={handleSubmit}>

        <div className="login-field">
          <label className="login-label">Username</label>

          <input
            className="login-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="login-field">
          <label className="login-label">Password</label>

          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          className="login-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

         

        {/* 👇 NEW: Forgot Password Link */}
        <p
          className="forgot-link"
          onClick={() => navigate("/forgot-password")}
        >
          Forgot Password?
        </p>
          

      </form>

    </div>
  );
};

export default Login;