import React, { useEffect, useState, useRef, useCallback } from "react";
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

  const [stream, setStream] = useState(null);
  const [socket, setSocket] = useState(null);

  const peerConnections = useRef({});
  const viewersRef = useRef(new Set());
  const iceQueueRef = useRef({}); // 🔥 NEW
  const heartbeatRef = useRef(null);

  const videoRef = useRef();

  // 🎥 Start Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      console.log("🎥 Camera started");
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // 🔴 Go Live
  const handleGoLive = async () => {
    try {
      setLoading(true);

      const res = await AxiosInstance.post("/live/start/", {
        title: "My Live Stream",
      });

      const session_id = res.data.session_id || res.data.id;

      setSessionId(session_id);
      setIsLive(true);

    } catch (err) {
      console.error("LIVE ERROR:", err.response?.data || err.message);
      alert("Live start failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Socket Create
  useEffect(() => {
    if (!sessionId) return;

    const socketInstance = getLiveSocket(sessionId);
    setSocket(socketInstance);

    return () => {
      socketInstance?.close();
    };
  }, [sessionId]);

  // ❤️ Heartbeat
  useEffect(() => {
    if (!socket) return;

    heartbeatRef.current = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "heartbeat" }));
        console.log("❤️ heartbeat sent");
      }
    }, 5000);

    return () => clearInterval(heartbeatRef.current);
  }, [socket]);

  // 🛑 Stop Live
  const handleStopLive = useCallback(() => {
    setIsLive(false);

    Object.values(peerConnections.current).forEach((pc) => {
      try { pc.close(); } catch {}
    });

    peerConnections.current = {};
    viewersRef.current.clear();
    iceQueueRef.current = {}; // 🔥 reset

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "end_stream" }));
    }

    setStream(null);
    setMessages([]);
  }, [stream, socket]);

  // 🔗 Create Peer
  const createPeerConnection = (connectionId) => {
    if (!socket || !stream) return null;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          action: "ice_candidate",
          candidate: event.candidate,
          connection_id: connectionId,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        try { pc.close(); } catch {}
        delete peerConnections.current[connectionId];
      }
    };

    return pc;
  };

  // 👀 New Viewer
  const handleNewViewer = async (connectionId) => {
    if (!socket || !stream) return;

    if (peerConnections.current[connectionId]) return;

    console.log("🔥 Sending offer to:", connectionId);

    const pc = createPeerConnection(connectionId);
    if (!pc) return;

    peerConnections.current[connectionId] = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (socket.readyState !== WebSocket.OPEN) {
      console.log("Socket not ready, skipping offer");
      return;
    }

    socket.send(JSON.stringify({
      action: "offer",
      offer,
      connection_id: connectionId,
    }));
  };

  // 🔥 Send offers after camera start
  useEffect(() => {
    if (!stream || !socket) return;

    viewersRef.current.forEach((connectionId) => {
      handleNewViewer(connectionId);
    });
  }, [stream, socket]);

  // 🔁 Socket Listener
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (data) => {

      // 💬 chat
      if (data.type === "message") {
        setMessages((prev) => [...prev, data]);
      }

      // 👀 new viewer
      if (data.type === "new_viewer") {
        console.log("👀 New viewer:", data.connection_id);
        viewersRef.current.add(data.connection_id);
        handleNewViewer(data.connection_id);
      }

      // 🔁 answer
      if (data.type === "answer") {
        const connId = data.connection_id;
        const pc = peerConnections.current[connId];

        if (pc) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );

          // 🔥 flush ICE queue
          const queue = iceQueueRef.current[connId] || [];

          for (const candidate of queue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("ICE queue error:", err);
            }
          }

          iceQueueRef.current[connId] = [];
        }
      }

      // ❄️ ICE
      if (data.type === "ice_candidate") {
        const connId = data.connection_id;
        const pc = peerConnections.current[connId];

        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (err) {
            console.error("ICE error:", err);
          }
        } else {
          if (!iceQueueRef.current[connId]) {
            iceQueueRef.current[connId] = [];
          }
          iceQueueRef.current[connId].push(data.candidate);
        }
      }

      // 🔴 end
      if (data.type === "stream_ended") {
        socket.close();
        setSocket(null);
        setIsLive(false);
        setStream(null);
        setMessages([]);
        iceQueueRef.current = {};
      }
    };

    addLiveListener(handleMessage);
    return () => removeLiveListener(handleMessage);

  }, [socket, stream]);

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

          <button onClick={startCamera}>🎥 Start Camera</button>
          <button onClick={handleStopLive}>🛑 Stop Live</button>
        </div>
      )}

      {isLive && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "400px", borderRadius: "10px" }}
        />
      )}

      <h3>💬 Live Messages</h3>

      <div>
        {messages.length === 0 && <p>No messages yet...</p>}
        {messages.map((msg, index) => (
          <div key={index}>
            <b>{msg.user}:</b> {msg.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Live;