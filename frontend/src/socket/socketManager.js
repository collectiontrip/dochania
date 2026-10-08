let realtimeSocket = null;

let listeners = new Set();

let reconnectTimer = null;


// ============================================================
// GET REALTIME SOCKET
// ============================================================

export const getRealtimeSocket = () => {

  // ============================================================
  // REUSE EXISTING SOCKET
  // ============================================================

  if (
    realtimeSocket &&
    (
      realtimeSocket.readyState === WebSocket.OPEN ||
      realtimeSocket.readyState === WebSocket.CONNECTING
    )
  ) {

    console.log(
      "Using existing REALTIME WebSocket",
    );

    return realtimeSocket;

  }


  // ============================================================
  // GET ACCESS TOKEN
  // ============================================================

  const token =
    localStorage.getItem(
      "accessToken",
    );


  if (!token) {

    console.log(
      "Realtime socket skipped (no token)",
    );

    return null;

  }


  // ============================================================
  // REALTIME WEBSOCKET URL
  // ============================================================
  // Backend RealtimeConsumer expects:
  //
  // ?token=<JWT>
  //
  // NOT:
  //
  // ?accessToken=<JWT>
  // ============================================================

  const wsUrl =
    `wss://${window.location.hostname}:8001/ws/realtime/?token=${encodeURIComponent(token)}`;


  console.log(
    "Creating REALTIME WebSocket:",
    `wss://${window.location.hostname}:8001/ws/realtime/?token=***`,
  );


  realtimeSocket =
    new WebSocket(
      wsUrl,
    );


  // ============================================================
  // OPEN
  // ============================================================

  realtimeSocket.onopen = () => {

    console.log(
      "Realtime WebSocket connected",
    );


    if (reconnectTimer) {

      clearTimeout(
        reconnectTimer,
      );

      reconnectTimer = null;

    }

  };


  // ============================================================
  // MESSAGE
  // ============================================================

  realtimeSocket.onmessage = (
    event,
  ) => {

    try {

      const data =
        JSON.parse(
          event.data,
        );


      listeners.forEach(
        (cb) => {

          try {

            cb(data);

          } catch (error) {

            console.error(
              "Realtime listener error:",
              error,
            );

          }

        },
      );

    } catch (err) {

      console.error(
        "Invalid realtime message:",
        err,
      );

    }

  };


  // ============================================================
  // ERROR
  // ============================================================

  realtimeSocket.onerror = (
    err,
  ) => {

    console.error(
      "Realtime socket error",
      err,
    );

  };


  // ============================================================
  // CLOSE
  // ============================================================

  realtimeSocket.onclose = (
    event,
  ) => {

    console.log(
      "Realtime WebSocket disconnected:",
      event.code,
    );


    realtimeSocket = null;


    const currentToken =
      localStorage.getItem(
        "accessToken",
      );


    if (!currentToken) {
      return;
    }


    // ============================================================
    // PREVENT MULTIPLE RECONNECT TIMERS
    // ============================================================

    if (reconnectTimer) {
      return;
    }


    reconnectTimer =
      setTimeout(
        () => {

          reconnectTimer = null;

          console.log(
            "Reconnecting realtime socket...",
          );


          getRealtimeSocket();

        },
        3000,
      );

  };


  return realtimeSocket;

};


// ============================================================
// LISTENERS
// ============================================================

export const addRealtimeListener = (
  cb,
) => {

  if (typeof cb !== "function") {

    console.error(
      "addRealtimeListener requires a function",
    );

    return;

  }


  listeners.add(
    cb,
  );

};


export const removeRealtimeListener = (
  cb,
) => {

  listeners.delete(
    cb,
  );

};


// ============================================================
// RESET SOCKET
// ============================================================

export const resetRealtimeSocket = () => {

  // ============================================================
  // CLEAR RECONNECT TIMER
  // ============================================================

  if (reconnectTimer) {

    clearTimeout(
      reconnectTimer,
    );

    reconnectTimer = null;

  }


  // ============================================================
  // CLOSE SOCKET
  // ============================================================

  if (realtimeSocket) {

    realtimeSocket.onclose = null;

    realtimeSocket.close();

    realtimeSocket = null;

  }


  // ============================================================
  // CLEAR LISTENERS
  // ============================================================

  listeners.clear();


  console.log(
    "Realtime socket reset",
  );

};