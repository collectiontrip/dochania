let liveSocket = null;
let listeners = new Set();
let currentSessionId = null;

export const getLiveSocket = (sessionId) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    // 🔥 If socket already exists AND session same → reuse it
    if (
        liveSocket &&
        liveSocket.readyState === WebSocket.OPEN &&
        currentSessionId === sessionId
    ) {
        console.log("Using existing LIVE WebSocket");
        return liveSocket;
    }

    // 🔥 If switching session → close old socket properly
    if (
        liveSocket &&
        currentSessionId !== sessionId
    ) {
        console.log("Closing previous session socket...");
        liveSocket.close();
        liveSocket = null;
    }

    currentSessionId = sessionId;

    const wsUrl = `wss://${window.location.hostname}:8001/ws/live/${sessionId}/?token=${token}`;
    console.log("Creating LIVE WebSocket:", wsUrl);

    liveSocket = new WebSocket(wsUrl);

    liveSocket.onopen = () => {
        console.log("Live WebSocket connected");
    };

    liveSocket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            listeners.forEach((cb) => cb(data));
        } catch (err) {
            console.error("Invalid Live WS message", event.data);
        }
    };

    liveSocket.onerror = (err) => {
        console.error("Live socket error", err);
    };

    liveSocket.onclose = (event) => {
        console.log("Live WebSocket disconnected", event.code);

        // 🔥 IMPORTANT: only clear if it's real disconnect, not switching
        if (currentSessionId === sessionId) {
            liveSocket = null;
        }
    };

    return liveSocket;
};

// ✅ Add listener safely (no duplicates)
export const addLiveListener = (cb) => {
    listeners.add(cb);
};

// ✅ Remove listener
export const removeLiveListener = (cb) => {
    listeners.delete(cb);
};

// ✅ Optional: hard reset (use on logout)
export const resetLiveSocket = () => {
    if (liveSocket) {
        liveSocket.close();
    }
    liveSocket = null;
    currentSessionId = null;
    listeners.clear();
};