import React, { useEffect, useState, useRef, useCallback } from "react";
import AxiosInstance from "./auth/axiosInstance";
import {
  getLiveSocket,
  addLiveListener,
  removeLiveListener,
} from "../socket/liveSocketManager";

const Viewer = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [currentStream, setCurrentStream] = useState(null);

  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewers, setViewers] = useState([]);
  const [message, setMessage] = useState("");

  const videoRef = useRef();

  // 🔥 connection आधारित mapping
  const pcsRef = useRef({});
  const iceQueueRef = useRef({});

  // 🔹 Fetch streams
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

  // 🔹 Leave stream
  const leaveStream = useCallback(() => {
    Object.values(pcsRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });

    pcsRef.current = {};
    iceQueueRef.current = {};

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setSocket(null);
    setCurrentStream(null);
    setMessages([]);
    setViewerCount(0);
    setViewers([]);
  }, []);

  // 🔹 Cleanup
  useEffect(() => {
    return () => leaveStream();
  }, [leaveStream]);

  // 🔹 Join stream
  const joinStream = (sessionId) => {
    if (currentStream === sessionId) return;

    leaveStream();

    const socketInstance = getLiveSocket(sessionId);
    if (!socketInstance) return;

    setSocket(socketInstance);
    setCurrentStream(sessionId);
    setMessages([]);
    setViewers([]);
  };

  // 🔗 Peer connection
  const createPeerConnection = (connectionId) => {
    if (!socket) return null;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // 🎥 receive stream
    pc.ontrack = (event) => {
      console.log("📺 Stream received");

      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

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

    pc.onconnectionstatechange = () => {
      if (
        ["disconnected", "failed", "closed"].includes(pc.connectionState)
      ) {
        try {
          pc.close();
        } catch {}
        delete pcsRef.current[connectionId];
      }
    };

    return pc;
  };

  // 🔁 Socket listener
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (data) => {

      // 💬 chat
      if (data.type === "message") {
        setMessages((prev) => [...prev, data]);
      }

      // 👀 viewer count
      if (data.type === "viewer_count") {
        setViewerCount(data.count);
      }

      // 👥 viewer list
      if (data.type === "new_viewer") {
        setViewers((prev) => {
          if (prev.includes(data.user_id)) return prev;
          return [...prev, data.user_id];
        });
      }

      // 🎥 OFFER (MAIN)
      if (data.type === "offer") {
        if (!data.offer || !data.connection_id) return;
        const connId = data.connection_id;

        console.log("📩 Offer received from:", connId);

        if (pcsRef.current[connId]) return;

        const pc = createPeerConnection(connId);
        if (!pc) return;

        pcsRef.current[connId] = pc;

        await pc.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              action: "answer",
              answer,
              connection_id: connId,
            })
          );
        }

        // 🔥 queued ICE apply
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

      // ❄️ ICE
      if (data.type === "ice_candidate") {
        if (!data.candidate) return;

        const connId = data.connection_id;
        const pc = pcsRef.current[connId];

        if (pc) {
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

      // 🔴 stream ended
      if (data.type === "stream_ended") {
        leaveStream();
      }
    };

    addLiveListener(handleMessage);
    return () => removeLiveListener(handleMessage);
  }, [socket, leaveStream]);

  // 💬 send message
  const sendMessage = () => {
    if (!socket || !message.trim()) return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          action: "message",
          message,
        })
      );
    }

    setMessage("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>👀 Watch Live</h2>

      {!currentStream ? (
        <>
          <h3>Live Streams</h3>

          {liveStreams.length === 0 && <p>No live streams</p>}

          {liveStreams.map((stream) => (
            <div key={stream.id} style={{ marginBottom: "10px" }}>
              <span>{stream.title}</span>
              <button onClick={() => joinStream(stream.id)}>
                Join
              </button>
            </div>
          ))}
        </>
      ) : (
        <>
          <h3>🔴 LIVE</h3>

          <p>👀 {viewerCount} watching</p>

          <h4>Viewers</h4>
          <ul>
            {viewers.map((v) => (
              <li key={v}>User: {v}</li>
            ))}
          </ul>

          <button onClick={leaveStream}>Leave</button>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            controls
            style={{ width: "400px", borderRadius: "10px" }}
          />

          <div>
            {messages.map((msg, i) => (
              <p key={i}>
                <b>{msg.user}:</b> {msg.message}
              </p>
            ))}
          </div>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </>
      )}
    </div>
  );
};

export default Viewer;