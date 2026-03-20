import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./PrivateChat.css";
import CallPanel from "../call/CallPanel";
import AxiosInstance from "../auth/axiosInstance";

import {
  getRealtimeSocket,
  addRealtimeListener,
  removeRealtimeListener
} from "../../socket/socketManager";
import {
  formatTime,
  formatDateLabel,
  formatLastSeen,
  sortMessages,
  encryptMessage,
  decryptMessage,
  fetchPublicKey
  
} from "../../utils/messageUtils";

const PrivateChat = () => {
  const { userId } = useParams();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [otherUsername, setOtherUsername] = useState("");
  const [onlineStatus, setOnlineStatus] = useState("offline");
  const [lastSeen, setLastSeen] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [receiverPublicKey, setReceiverPublicKey] = useState(null);
  const [senderPublicKey, setSenderPublicKey] = useState(null);
  

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const myId = Number(localStorage.getItem("user_id"));
  const token = localStorage.getItem("accessToken");
  const otherUserId = Number(userId);

  // ------------------------------
  // Auto Scroll
  // ------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadKeys = async () => {
      const r = await fetchPublicKey(otherUserId);
      const s = await fetchPublicKey(myId);

      setReceiverPublicKey(r);
      setSenderPublicKey(s);
    };

    loadKeys();
  }, [otherUserId, myId]);

  

 

 

  // ------------------------------
  // Fetch Messages
  // ------------------------------
  const fetchMessages = async (convId) => {
    try {
      const res = await AxiosInstance.get(
        `/chat/conversations/${convId}/messages/`
      );

      const formatted = await Promise.all(
        res.data.map(async (m) => {

          const encryptedMessage =
            m.sender.id === myId
              ? m.encrypted_text_sender
              : m.encrypted_text_receiver;

          const decryptedMessage = encryptedMessage
            ?(await decryptMessage(encryptedMessage)) || "[Unable to decrypt]" 
            : "[No message]";

          return {
            id: m.id,
            self: m.sender.id === myId,
            message: decryptedMessage,
            from_user: m.sender.username,
            created_at: m.created_at,
            is_delivered: m.is_delivered,
            is_seen: m.is_seen
          };
        })
      );

      setMessages(sortMessages(formatted));
    } catch (err) {
      console.error("Message fetch error", err);
    }
  };

  // ------------------------------
  // Fetch Other User
  // ------------------------------
  const fetchOtherUser = async () => {
    try {
      const res = await AxiosInstance.get(`/auth/users/${otherUserId}/`);

      setOtherUsername(res.data.username);
      setOnlineStatus(res.data.is_online ? "online" : "offline");
      setLastSeen(res.data.last_seen || null);
    } catch (err) {
      console.error("User fetch error", err);
    }
  };

  // ------------------------------
  // Handle Incoming WS Messages
  // ------------------------------
  const handleRealtimeMessage = useCallback(
    (data) => {

      // -------- CHAT MESSAGE --------
      if (data.type === "chat") {

        const isThisChat =
          (data.from_user_id === myId && data.to_user_id === otherUserId) ||
          (data.from_user_id === otherUserId && data.to_user_id === myId);

        if (!isThisChat) return;


        (async () => {
          const encryptedMessage =
            data.from_user_id === myId
              ? data.message_sender
              : data.message_receiver;

          const decrypted = encryptedMessage
            ? (await decryptMessage(encryptedMessage)) || "[Unable to decrypt]" 
            : "[No message]";

          const newMsg = {
            id: data.message_id || Date.now(),
            message: decrypted,
            self: data.from_user_id === myId,
            from_user: data.from_user,
            created_at: data.created_at || new Date().toISOString(),
            is_delivered: data.is_delivered || false,
            is_seen: false

          };

          setMessages((prev) => sortMessages([...prev, newMsg]));
          


        })();

        

        

        // auto seen
        if (data.from_user_id === otherUserId) {
          wsRef.current?.send(
            JSON.stringify({
              action: "seen",
              message_id: data.message_id,
              to_user: otherUserId
            })
          );
        }
      }

      

      // -------- TYPING --------
      if (data.type === "typing" && data.from_user_id === otherUserId) {

        setIsTyping(true);

        clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }

      // -------- PRESENCE --------
      if (data.type === "presence" && data.user_id === otherUserId) {

        setOnlineStatus(data.is_online ? "online" : "offline");

        setLastSeen(data.is_online ? null : data.last_seen);
      }
    },
    [myId, otherUserId]
  );

  // ------------------------------
  // Get / Create Conversation
  // ------------------------------
  useEffect(() => {

    if (!token || !myId || !otherUserId) return;

    const getOrCreateConversation = async () => {

      try {
        const res = await AxiosInstance.post(
          "/chat/conversations/get-or-create/",
          { user_id: otherUserId }
        );

        const convId = res.data.id;

        setConversationId(convId);

        fetchMessages(convId);

      } catch (err) {
        console.error("Conversation API error", err);
      }
    };

    getOrCreateConversation();

    fetchOtherUser();

  }, [token, myId, otherUserId]);

  // ------------------------------
  // WebSocket
  // ------------------------------
  useEffect(() => {

    if (!token || !conversationId) return;

    const socket = getRealtimeSocket();

    if (!socket) return;

    wsRef.current = socket;

    addRealtimeListener(handleRealtimeMessage);

    return () => {
      removeRealtimeListener(handleRealtimeMessage);
    };

  }, [conversationId, handleRealtimeMessage]);

  // ------------------------------
  // Send Message
  // ------------------------------
  // ------------------------------
// Send Message (Updated for Both Sender & Receiver Encryption)
// ------------------------------
  const sendMessage = async () => {

    if (!message.trim()) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected");
      return;
    }

    if (!receiverPublicKey || !senderPublicKey) {
      console.error("Public keys not loaded yet");
      return;
    }

    try {

      console.log("Encrypting message:", message);

      // 🔐 Encrypt message for both users
      const encryptedMessages = await encryptMessage(
        message,
        receiverPublicKey,
        senderPublicKey
      );

      console.log("Encrypted for Receiver:", encryptedMessages.forReceiver);
      console.log("Encrypted for Sender:", encryptedMessages.forSender);

      // 📤 Send message via WebSocket
      wsRef.current.send(
        JSON.stringify({
          action: "chat_message",
          to_user: otherUserId,
          message_receiver: encryptedMessages.forReceiver,
          message_sender: encryptedMessages.forSender
        })
      );

      // 🧹 Clear input
      setMessage("");

    } catch (err) {

      console.error("❌ Message encryption error:", err);

    }

  };

  // ------------------------------
  // Typing
  // ------------------------------
  const handleTyping = (value) => {

    setMessage(value);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {

      wsRef.current.send(
        JSON.stringify({
          action: "typing",
          to_user: otherUserId
        })
      );

    }
  };

  const sortedMessages = sortMessages(messages);

  let lastDate = null;

  return (
    <div className="private-chat-container">

      {/* HEADER */}

      <div className="chat-header">

        <div className="chat-user-info">

          <div className="chat-username">
            {otherUsername || `User ${otherUserId}`}
          </div>

          <div className="chat-status">

            {isTyping
              ? "✍️ typing..."
              : onlineStatus === "online"
              ? "🟢 Online"
              : formatLastSeen(lastSeen)}

          </div>

        </div>

        <CallPanel toUserId={otherUserId} />

      </div>

      {/* MESSAGES */}

      <div className="chat-messages-box">

        {sortedMessages.map((m) => {

          const label = formatDateLabel(m.created_at);

          const showDate = label !== lastDate;

          lastDate = label;

          return (
            <div key={m.id}>

              {showDate && (
                <div className="chat-date-label">{label}</div>
              )}

              <div className={`chat-message-row ${m.self ? "my-msg" : ""}`}>

                <div className="chat-message-body">

                  <span className="chat-username">
                    {m.self ? "You" : m.from_user}
                  </span>

                  <span className="chat-text">{m.message}</span>

                  <span className="chat-time">

                    {formatTime(m.created_at)}

                    {m.self && (
                      <span
                        className={`msg-status 
                        ${m.is_seen ? "seen" : ""}
                        ${m.is_delivered ? "delivered" : ""}`}
                      >
                        {m.is_seen ? "✓✓" : m.is_delivered ? "✓✓" : "✓"}
                      </span>
                    )}

                  </span>

                </div>

              </div>

            </div>
          );
        })}

        <div ref={bottomRef}></div>

      </div>

      {/* INPUT */}

      <div className="chat-input-area">

        <input
          className="chat-input"
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Type message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!receiverPublicKey || !senderPublicKey}
        >
          Send
        </button>

      </div>

    </div>
  );
};

export default PrivateChat;