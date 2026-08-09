let realtimeSocket = null;

let listeners = new Set();

let reconnectTimer = null;

// =========================
// GET REALTIME SOCKET
// =========================

export const getRealtimeSocket = () => {

  if (
    realtimeSocket &&
    (
      realtimeSocket.readyState === WebSocket.OPEN ||
      realtimeSocket.readyState === WebSocket.CONNECTING
    )
  ) {
    console.log("Using existing REALTIME WebSocket");
    return realtimeSocket;
  }

  const token = localStorage.getItem("accessToken");

  if (!token) {
    console.log("Realtime socket skipped (no token)");
    return null;
  }

  const wsUrl =
    `wss://${window.location.hostname}:8001/ws/realtime/?token=${token}`;

  console.log("Creating REALTIME WebSocket:", wsUrl);

  realtimeSocket = new WebSocket(wsUrl);

  // =========================
  // OPEN
  // =========================

  realtimeSocket.onopen = () => {

    console.log("Realtime WebSocket connected");

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

  };

  // =========================
  // MESSAGE
  // =========================

  realtimeSocket.onmessage = (event) => {

    try {

      const data = JSON.parse(event.data);

      listeners.forEach((cb) => cb(data));

    } catch (err) {

      console.error(
        "Invalid realtime message:",
        err,
      );

    }

  };

  // =========================
  // ERROR
  // =========================

  realtimeSocket.onerror = (err) => {

    console.error(
      "Realtime socket error",
      err,
    );

  };

  // =========================
  // CLOSE
  // =========================

  realtimeSocket.onclose = (event) => {

    console.log(
      "Realtime WebSocket disconnected:",
      event.code,
    );

    realtimeSocket = null;

    const token = localStorage.getItem("accessToken");

    if (!token) return;

    reconnectTimer = setTimeout(() => {

      console.log("Reconnecting realtime socket...");

      getRealtimeSocket();

    }, 3000);

  };

  return realtimeSocket;

};

// =========================
// LISTENERS
// =========================

export const addRealtimeListener = (cb) => {
  listeners.add(cb);
};

export const removeRealtimeListener = (cb) => {
  listeners.delete(cb);
};

// =========================
// RESET SOCKET
// =========================

export const resetRealtimeSocket = () => {

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (realtimeSocket) {

    realtimeSocket.onclose = null;

    realtimeSocket.close();

    realtimeSocket = null;

  }

  listeners.clear();

  console.log("Realtime socket reset");

};