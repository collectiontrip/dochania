import React, { useEffect, useState, useRef, useCallback } from "react";
import AxiosInstance from "./auth/axiosInstance";
import { getLiveSocket } from "../socket/liveSocketManager";

import "./Live.css";

const Live = () => {
  const [isLive, setIsLive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [loading, setLoading] = useState(false);

  const [stream, setStream] = useState(null);
  const [socket, setSocket] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [input, setInput] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);

  const peerConnections = useRef({});
  const viewersRef = useRef(new Set());

  const videoRef = useRef();
  const chatEndRef = useRef();

  // 🔥 RECONNECT ON REFRESH
  useEffect(() => {
    const existingSession = localStorage.getItem("live_session");

    if (existingSession) {
      const socketInstance = getLiveSocket(existingSession);

      if (socketInstance) {
        setSessionId(existingSession);
        setSocket(socketInstance);
        setIsLive(true);
      }
    }
  }, []);

  // 🎥 Start Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);
      setIsCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // 🛑 Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    setIsCameraOn(false);
  };

  const toggleMic = () => {
    if (!stream) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsMicOn((prev) => !prev);
  };

  // 🔴 Go Live
  const handleGoLive = async () => {
    try {
      setLoading(true);

      const res = await AxiosInstance.post("/live/start/", {
        title: "My Live Stream",
      });

      const session_id = res.data.session_id || res.data.id;

      localStorage.setItem("live_session", session_id);

      const socketInstance = getLiveSocket(session_id);

      if (socketInstance) {
        setSessionId(session_id);
        setSocket(socketInstance);
        setIsLive(true);
      }
    } catch (err) {
      if (err.response?.data?.error === "Already live") {
        const sessions = await AxiosInstance.get("/live/streams/");
        const mySession = sessions.data.find(
          (s) => s.streamer === "me"
        );

        if (mySession) {
          localStorage.setItem("live_session", mySession.id);
          const socketInstance = getLiveSocket(mySession.id);
          setSessionId(mySession.id);
          setSocket(socketInstance);
          setIsLive(true);
        }
      }

      console.error("LIVE ERROR:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🛑 Stop Live
  const handleStopLive = useCallback(() => {
    setIsLive(false);

    localStorage.removeItem("live_session");

    Object.values(peerConnections.current).forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });

    peerConnections.current = {};
    viewersRef.current.clear();

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "end_stream" }));
    }

    setStream(null);
    setMessages([]);
    setViewers([]);
    setIsCameraOn(false);
  }, [stream, socket]);

  // 💬 Send Message
  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    socket.send(
      JSON.stringify({
        action: "message",
        message: input,
      })
    );

    setInput("");
  };

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
        socket.send(
          JSON.stringify({
            action: "ice_candidate",
            candidate: event.candidate,
            connection_id: connectionId,
          })
        );
      }
    };

    return pc;
  };

  // 👀 New Viewer
  const handleNewViewer = async (connectionId) => {
    if (!socket || !stream) return;

    if (peerConnections.current[connectionId]) {
      try {
        peerConnections.current[connectionId].close();
      } catch {}
      delete peerConnections.current[connectionId];
    }

    const pc = createPeerConnection(connectionId);
    if (!pc) return;

    peerConnections.current[connectionId] = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(
      JSON.stringify({
        action: "offer",
        offer,
        connection_id: connectionId,
      })
    );
  };

  useEffect(() => {
    if (!stream || !socket) return;

    viewersRef.current.forEach((connectionId) => {
      handleNewViewer(connectionId);
    });
  }, [stream]);

  // 🔥 SOCKET
  useEffect(() => {
    if (!socket) return;

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      // 💬 CHAT
      if (data.type === "message" || data.type === "live_message") {
        setMessages((prev) => [...prev, data]);
      }

      // 🔥 FULL SNAPSHOT (MAIN FIX)
      if (data.type === "initial_viewers") {
        setViewers(data.viewers);

        // 🔥 sync connection ids clean
        viewersRef.current = new Set();
      }

      // 🔥 NEW VIEWER
      if (data.type === "new_viewer") {
        viewersRef.current.add(data.connection_id);

        setViewers((prev) => {
          if (prev.find((v) => v.user_id === data.user_id)) return prev;
          return [...prev, { user_id: data.user_id, username: data.username }];
        });

        handleNewViewer(data.connection_id);
      }

      // 🔥 VIEWER LEFT (STRONG FIX)
      if (data.type === "viewer_left") {
        // remove from UI
        setViewers((prev) =>
          prev.filter((v) => v.user_id !== data.user_id)
        );

        // 🔥 remove peer connections
        Object.keys(peerConnections.current).forEach((key) => {
          try {
            peerConnections.current[key]?.close();
          } catch {}
          delete peerConnections.current[key];
        });

        // 🔥 reset connection ids
        viewersRef.current.clear();
      }

      // 🎥 RTC
      if (data.type === "answer") {
        const pc = peerConnections.current[data.connection_id];
        await pc?.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }

      if (data.type === "ice_candidate") {
        const pc = peerConnections.current[data.connection_id];
        await pc?.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }

      // 🔴 END
      if (data.type === "stream_ended") {
        socket.close();
        localStorage.removeItem("live_session");
        setSocket(null);
        setIsLive(false);
        setStream(null);
        setMessages([]);
        setViewers([]);
      }
    };
  }, [socket, stream]);

  // 🔽 Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="live-page">
      <div className="live-header">
        <h2 className="live-title">Live Streaming</h2>

        {!isLive ? (
          <button className="btn primary" onClick={handleGoLive} disabled={loading}>
            {loading ? "Starting..." : "Go Live"}
          </button>
        ) : (
          <button className="btn danger" onClick={handleStopLive}>
            Stop Live
          </button>
        )}
      </div>

      {isLive && (
        <div className="live-container">

          <div className="video-section">
            <div className="live-badge">LIVE</div>

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="live-video"
            />

            {!isCameraOn ? (
              <button className="btn secondary video-btn camera-btn" onClick={startCamera}>
                Start Camera
              </button>
            ) : (
              <button className="btn danger video-btn camera-btn" onClick={stopCamera}>
                Stop Camera
              </button>
            )}

            <button
              className="btn secondary video-btn mic-btn"
              onClick={toggleMic}
              disabled={!stream}
            >
              {isMicOn ? "Mic On 🎤" : "Mic Off 🔇"}
            </button>
          </div>

          <div className="chat-section">
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div key={index} className="chat-message">
                  <span className="chat-user">{msg.user}</span>
                  <span className="chat-text">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-box">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type message..."
                className="chat-input"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage} className="btn send">
                Send
              </button>
            </div>
          </div>

          <div className="viewer-section">
            <div className="viewer-header">
              Viewers ({viewers.length})
            </div>

            <div className="viewer-list">
              {viewers.map((v) => (
                <div key={v.user_id} className="viewer-item">
                  {v.username}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Live;