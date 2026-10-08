import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import "./LiveChat.css";
// ============================================================
// LIVE CHAT
// ============================================================

const LiveChat = ({
    messages = [],
    currentUserId = null,

    onSendMessage = null,

    isChatDisabled = false,
}) => {

    const [messageText, setMessageText] = useState("");

    const messageEndRef = useRef(null);


    // ========================================================
    // AUTO SCROLL TO LATEST MESSAGE
    // ========================================================

    useEffect(() => {

        if (!messageEndRef.current) {
            return;
        }

        messageEndRef.current.scrollIntoView({
            behavior: "smooth",
        });

    }, [messages]);


    // ========================================================
    // HANDLE INPUT CHANGE
    // ========================================================

    const handleInputChange = (event) => {

        setMessageText(event.target.value);

    };


    // ========================================================
    // SEND MESSAGE
    // ========================================================

    const handleSendMessage = () => {

        const message = messageText.trim();

        if (
            !message ||
            isChatDisabled ||
            !onSendMessage
        ) {
            return;
        }

        onSendMessage(message);

        setMessageText("");

    };


    // ========================================================
    // HANDLE ENTER KEY
    // ========================================================

    const handleKeyDown = (event) => {

        if (event.key !== "Enter") {
            return;
        }

        if (event.shiftKey) {
            return;
        }

        event.preventDefault();

        handleSendMessage();

    };


    // ========================================================
    // GET USER ID
    // Exact backend field:
    // message.user
    // ========================================================

    const getUserId = (message) => {

        return message?.user ?? null;

    };


    // ========================================================
    // GET USERNAME
    // Exact backend field:
    // message.user_name
    // ========================================================

    const getUsername = (message) => {

        return (
            message?.user_name ||
            message?.user_info?.username ||
            "User"
        );

    };


    // ========================================================
    // GET FULL NAME
    // Exact backend field:
    // message.user_info.full_name
    // ========================================================

    const getFullName = (message) => {

        return (
            message?.user_info?.full_name ||
            ""
        );

    };


    // ========================================================
    // GET PROFILE PICTURE
    // Exact backend field:
    // message.user_info.profile_picture
    // ========================================================

    const getProfilePicture = (message) => {

        return (
            message?.user_info?.profile_picture ||
            null
        );

    };


    // ========================================================
    // GET MESSAGE TEXT
    // Exact backend field:
    // message.message
    // ========================================================

    const getMessageText = (message) => {

        return (
            message?.message ||
            ""
        );

    };


    // ========================================================
    // GET CREATED TIME
    // Exact backend field:
    // message.created_at
    // ========================================================

    const getCreatedAt = (message) => {

        return (
            message?.created_at ||
            null
        );

    };


    // ========================================================
    // FORMAT MESSAGE TIME
    // ========================================================

    const formatMessageTime = (createdAt) => {

        if (!createdAt) {
            return "";
        }

        const date = new Date(createdAt);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
            },
        );

    };


    // ========================================================
    // EMPTY CHAT
    // ========================================================

    const renderEmptyChat = () => {

        return (

            <div className="live-chat-empty">

                <span>
                    💬
                </span>

                <p>
                    No messages yet
                </p>

                <small>
                    Be the first to say something.
                </small>

            </div>

        );

    };


    // ========================================================
    // RENDER MESSAGE
    // ========================================================

    const renderMessage = (message) => {

        const messageId =
            message?.id;

        const userId =
            getUserId(message);

        const username =
            getUsername(message);

        const fullName =
            getFullName(message);

        const profilePicture =
            getProfilePicture(message);

        const messageTextValue =
            getMessageText(message);

        const createdAt =
            getCreatedAt(message);

        const isOwnMessage =
            currentUserId !== null &&
            String(userId) === String(currentUserId);


        return (

            <div
                key={messageId}
                className={
                    isOwnMessage
                        ? "live-chat-message live-chat-message-own"
                        : "live-chat-message"
                }
            >

                {/* ==========================================
                    PROFILE PICTURE
                ========================================== */}

                <div className="live-chat-avatar">

                    {profilePicture ? (

                        <img
                            src={profilePicture}
                            alt={username}
                        />

                    ) : (

                        <span>
                            {username
                                .charAt(0)
                                .toUpperCase()}
                        </span>

                    )}

                </div>


                {/* ==========================================
                    MESSAGE CONTENT
                ========================================== */}

                <div className="live-chat-message-content">

                    {/* USER INFO */}

                    <div className="live-chat-message-header">

                        <strong>
                            {fullName || username}
                        </strong>

                        <span>
                            @{username}
                        </span>

                        {createdAt && (

                            <time>
                                {formatMessageTime(
                                    createdAt
                                )}
                            </time>

                        )}

                    </div>


                    {/* MESSAGE */}

                    <p>
                        {messageTextValue}
                    </p>

                </div>

            </div>

        );

    };


    // ========================================================
    // COMPONENT
    // ========================================================

    return (

        <div className="live-chat">

            {/* ==================================================
                CHAT HEADER
            ================================================== */}

            <div className="live-chat-header">

                <div>

                    <h3>
                        Live Chat
                    </h3>

                    <span>
                        Join the conversation
                    </span>

                </div>

            </div>


            {/* ==================================================
                CHAT MESSAGES
            ================================================== */}

            <div className="live-chat-messages">

                {messages.length > 0
                    ? messages.map(renderMessage)
                    : renderEmptyChat()}

                <div
                    ref={messageEndRef}
                />

            </div>


            {/* ==================================================
                CHAT INPUT
            ================================================== */}

            <div className="live-chat-input-area">

                <textarea
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isChatDisabled
                            ? "Chat is disabled"
                            : "Say something..."
                    }
                    disabled={isChatDisabled}
                    rows={1}
                    maxLength={500}
                />


                <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={
                        isChatDisabled ||
                        !messageText.trim() ||
                        !onSendMessage
                    }
                    aria-label="Send message"
                >
                    ➤
                </button>

            </div>

        </div>

    );

};


export default LiveChat;
