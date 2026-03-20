import React, { useState } from "react";
import AxiosInstance from "./axiosInstance";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      await AxiosInstance.post("/auth/users/reset_password/", {
        email,
      });

      setMessage("Password reset email sent! Check your inbox 📩");
      setEmail("");
    } catch (err) {
      console.error(err);
      setError("Failed to send reset email ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <h2 className="forgot-title">Forgot Password</h2>

      <form onSubmit={handleSubmit} className="forgot-form">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="forgot-input"
        />

        <button
          type="submit"
          className="forgot-button"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && <p className="forgot-success">{message}</p>}
      {error && <p className="forgot-error">{error}</p>}
    </div>
  );
};

export default ForgotPassword;