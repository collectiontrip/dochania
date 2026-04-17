import React, { useEffect, useState, useRef, useCallback } from "react";
import AxiosInstance from "./auth/axiosInstance";
import {
  getLiveSocket,
  addLiveListener,
  removeLiveListener,
} from "../socket/liveSocketManager";

import "./Live.css";

const Viewer = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [currentStream, setCurrentStream] = useState(null);

  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [message, setMessage] = useState("");

  // 🔥 NEW
  const [streamerName, setStreamerName] = useState("");

  const [showChat, setShowChat] = useState(true);
  const [showViewers, setShowViewers] = useState(false);

  const videoRef = useRef();
  const chatEndRef = useRef();

  const pcsRef = useRef({});
  const iceQueueRef = useRef({});

  // =========================
  // 🔹 FETCH STREAMS
  // =========================
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const res = await AxiosInstance.get("/live/streams/");
        setLiveStreams(res.data);
      } catch (err) {
        console.error("Error fetching streams:", err);
      }
    };

    fetchStreams();
  }, []);

  // =========================
  // 🔹 LEAVE STREAM
  // =========================
  const leaveStream = useCallback(() => {
    Object.values(pcsRef.current).forEach((pc) => {
      try { pc.close(); } catch {}
    });

    pcsRef.current = {};
    iceQueueRef.current = {};

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    socketRef.current = null;
    setSocket(null);
    setCurrentStream(null);
    setMessages([]);
    setViewerCount(0);
    setViewers([]);
    setStreamerName(""); // 🔥 reset
  }, []);

  useEffect(() => {
    return () => leaveStream();
  }, [leaveStream]);

  // =========================
  // 🔹 JOIN STREAM
  // =========================
  const joinStream = (stream) => {
    if (currentStream === stream.id) return;

    leaveStream();

    // 🔥 STREAMER NAME SET
    setStreamerName(stream.streamer_name || stream.streamer);

    const socketInstance = getLiveSocket(stream.id);
    if (!socketInstance) return;

    socketInstance.onopen = () => {
      socketRef.current = socketInstance;
      setSocket(socketInstance);
      setCurrentStream(stream.id);
      setMessages([]);
      setViewers([]);

      socketInstance.send(JSON.stringify({
        action: "viewer_joined",
      }));
    };

    socketInstance.onerror = (err) => {
      console.error("❌ WS error:", err);
    };

    socketInstance.onclose = () => {
      leaveStream();
    };
  };

  // =========================
  // 🔗 PEER CONNECTION
  // =========================
  const createPeerConnection = (connectionId) => {
    const sock = socketRef.current;
    if (!sock) return null;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify({
          action: "ice_candidate",
          candidate: event.candidate,
          connection_id: connectionId,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        try { pc.close(); } catch {}
        delete pcsRef.current[connectionId];
      }
    };

    return pc;
  };

  // =========================
  // 🔥 SOCKET LISTENER
  // =========================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (data) => {

      // 💬 CHAT
      if (data.type === "message" || data.type === "live_message") {
        setMessages((prev) => [...prev, data]);
      }

      // 👀 COUNT
      if (data.type === "viewer_count") {
        setViewerCount(data.count);
      }

      // 👥 SNAPSHOT
      if (data.type === "initial_viewers") {
        setViewers(data.viewers);
      }

      // 👥 NEW VIEWER
      if (data.type === "new_viewer") {
        setViewers((prev) => {
          if (prev.find(v => v.user_id === data.user_id)) return prev;
          return [...prev, {
            user_id: data.user_id,
            username: data.username
          }];
        });
      }

      // ❌ VIEWER LEFT
      if (data.type === "viewer_left") {
        setViewers((prev) =>
          prev.filter((v) => v.user_id !== data.user_id)
        );
      }

      // 🎥 OFFER
      if (data.type === "offer") {
        const connId = data.connection_id;

        let pc = pcsRef.current[connId];

        if (!pc) {
          pc = createPeerConnection(connId);
          pcsRef.current[connId] = pc;
        }

        await pc.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current.send(JSON.stringify({
          action: "answer",
          answer,
          connection_id: connId,
        }));

        const queue = iceQueueRef.current[connId] || [];
        for (const c of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {}
        }
        iceQueueRef.current[connId] = [];
      }

      // ❄️ ICE
      if (data.type === "ice_candidate") {
        const connId = data.connection_id;
        const pc = pcsRef.current[connId];

        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch {}
        } else {
          if (!iceQueueRef.current[connId]) {
            iceQueueRef.current[connId] = [];
          }
          iceQueueRef.current[connId].push(data.candidate);
        }
      }

      // 🔴 END
      if (data.type === "stream_ended") {
        leaveStream();
      }
    };

    addLiveListener(handleMessage);
    return () => removeLiveListener(handleMessage);

  }, [socket, leaveStream]);

  // =========================
  // 🔽 SCROLL
  // =========================
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =========================
  // 💬 SEND MESSAGE
  // =========================
  const sendMessage = () => {
    const sock = socketRef.current;

    if (!sock || sock.readyState !== WebSocket.OPEN || !message.trim()) return;

    sock.send(JSON.stringify({
      action: "message",
      message,
    }));

    setMessage("");
  };

  // =========================
  // 🎨 UI
  // =========================
  return (
    <div className="live-page">

      {!currentStream ? (
        <div className="live-list">
          <h2>👀 Live Streams</h2>

          {liveStreams.map((stream) => (
            <div key={stream.id} className="stream-item">
              <span>{stream.title} - {stream.streamer_name}</span>
              <button onClick={() => joinStream(stream)}>
                Join
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="live-container">

          <div className="video-section">
            <div className="live-badge">
              LIVE • {streamerName}
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="live-video"
            />

            <div className="mobile-controls">
              <button onClick={() => setShowChat(!showChat)}>💬</button>
              <button onClick={() => setShowViewers(!showViewers)}>👀</button>
            </div>

            <button className="btn danger leave-btn" onClick={leaveStream}>
              Leave
            </button>
          </div>

          {showChat && (
            <div className="chat-section overlay">
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className="chat-message">
                    <span className="chat-user">{msg.user}</span>
                    <span className="chat-text">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-box">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="chat-input"
                />
                <button onClick={sendMessage} className="btn send">
                  Send
                </button>
              </div>
            </div>
          )}

          {showViewers && (
            <div className="viewer-section overlay">
              <div className="viewer-header">
                Viewers ({viewerCount})
              </div>

              <div className="viewer-list">
                {viewers.map((v) => (
                  <div key={v.user_id} className="viewer-item">
                    {v.username}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Viewer;