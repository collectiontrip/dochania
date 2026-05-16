import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AxiosInstance from "./axiosInstance";

const Activate = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    AxiosInstance.post("/auth/users/activation/", {
      uid,
      token,
    })
      .then(() => {
        alert("Account activated successfully");
        navigate("/login");
      })
      .catch(() => {
        alert("Activation failed or link expired");
      });
  }, []);

  return <h2>Activating your account...</h2>;
};

export default Activate;