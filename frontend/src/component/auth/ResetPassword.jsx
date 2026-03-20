import { useParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

const ResetPassword = () => {
  const { uid, token } = useParams();

  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== rePassword) {
      alert("Passwords do not match ❌");
      return;
    }

    try {
      await axios.post(
        "https://localhost:8000/auth/users/reset_password_confirm/",
        {
          uid: uid,
          token: token,
          new_password: password,
        }
      );

      alert("Password reset successful ✅");
    } catch (error) {
      console.log(error);
      alert("Error resetting password ❌");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Reset Password</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Confirm Password"
          onChange={(e) => setRePassword(e.target.value)}
        />
        <br /><br />

        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;