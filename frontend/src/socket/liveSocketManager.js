let liveSocket = null;
let listeners = new Set();

export const getLiveSocket  = (sessionId) => {
    if (
        liveSocket && 
        (
            liveSocket.readyState === WebSocket.OPEN ||
            liveSocket.readyState === WebSocket.CONNECTING
        )
    ) {
        console.log("Using existing LIVE WebSocket");
        return liveSocket;
    }

    const token = localStorage.getItem("accessToken");
    if(!token) return null;

    const wsUrl = `wss://${window.location.hostname}:8000/ws/live/${sessionId}/?token=${token}`;
    console.log("Creating LIVE WebSocket:", wsUrl);

    liveSocket = new WebSocket(wsUrl);

    liveSocket.onmessage = (event) => {
        let data;

        try {
            data = JSON.parse(event.data);

        } catch (err) {
            console.error("Invalid Live WS message", event.data);
            return;
        }

        listeners.forEach((cb) => cb(data));
    }

    liveSocket.onopen = () => {
        console.log("Live WebSocket connected");
    };

    liveSocket.onclose = () => {
        console.log("Live WebSocket disconnected");
    };

    liveSocket.onerror = (err) => {
        console.error("Live socket error", err);
    };

    return liveSocket
};


export const addLiveListener = (cb) => {
    listeners.add(cb);
};

export const removeLiveListener = (cb) => {
    listeners.delete(cb);
};