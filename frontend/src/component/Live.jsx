import React, { useEffect, useState } from "react";
import AxiosInstance from "./auth/axiosInstance";

import {
  getLiveSocket,
  addLiveListener,
  removeLiveListener,
} from "../socket/liveSocketManager";

const Live = () => {
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoLive = async () => {
    try {
      setLoading(true);

      const res = await AxiosInstance.post("/live/start/", {
        title: "My Live Stream",
      });

      console.log("LIVE SESSION:", res.data);

      // ✅ FIX: correct session id set
      const session_id = res.data.session_id || res.data.id;
      setSessionId(session_id);

      // ✅ socket connect
      const socket = getLiveSocket(session_id);

      if (socket) {
        setIsLive(true);
      }
    } catch (err) {
      console.error("Live start error:", err);
      alert("Live start failed ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (data) => {
      console.log("Live data:", data);
      setMessages((prev) => [...prev, data]);
    };

    addLiveListener(handleMessage);

    return () => {
      removeLiveListener(handleMessage);
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>🎥 Live Streaming</h2>

      {!isLive ? (
        <button onClick={handleGoLive} disabled={loading}>
          {loading ? "Starting..." : "🔴 Go Live"}
        </button>
      ) : (
        <div>
          <h3 style={{ color: "red" }}>🔴 LIVE</h3>
          <p>Session ID: {sessionId}</p>
        </div>
      )}

      <h3>💬 Live Messages</h3>

      <div>
        {messages.length === 0 && <p>No messages yet...</p>}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              padding: "8px",
              background: "#f1f1f1",
              borderRadius: "8px",
            }}
          >
            {typeof msg === "object"
              ? JSON.stringify(msg)
              : msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Live;