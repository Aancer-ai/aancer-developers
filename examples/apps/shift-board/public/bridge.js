// Minimal client for the AANCER app bridge, protocol "aancer-bridge/2".
// Part of the AANCER examples repository, MIT licence. Not the official SDK.
//
// Usage:
//   const bridge = await AancerBridge.connect({ platformOrigin: "https://aancer.example.com", codeChallenge });
//   bridge.user, bridge.capabilities, bridge.sso
//   const result = await bridge.call("read:dataset", { datasetId: "shift_plan", limit: 50 });
//   const { code } = await bridge.authorize(newCodeChallenge);
//   bridge.onSessionEnd((reason) => { ... });
(function () {
  "use strict";

  const PROTOCOL = "aancer-bridge/2";

  function newId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function bridgeError(code, message) {
    const err = new Error(message || code);
    err.code = code;
    return err;
  }

  function connect(options) {
    const platformOrigin = options && options.platformOrigin;
    const codeChallenge = options && options.codeChallenge;
    const timeoutMs = (options && options.timeoutMs) || 10000;
    const callTimeoutMs = (options && options.callTimeoutMs) || 30000;

    if (typeof platformOrigin !== "string" || !/^https:\/\/[^/]+$/.test(platformOrigin)) {
      return Promise.reject(bridgeError("BAD_PLATFORM_ORIGIN", "platformOrigin must look like https://host"));
    }
    if (window.parent === window) {
      return Promise.reject(bridgeError("NOT_EMBEDDED", "This page is not inside the AANCER shell."));
    }

    const pending = new Map();
    const sessionEndHandlers = [];
    let nonce = null;

    function post(message) {
      // Always name the exact platform origin. Never use "*".
      window.parent.postMessage(Object.assign({ v: 1 }, message), platformOrigin);
    }

    function onMessage(event) {
      // Accept only messages from the AANCER shell that embeds this page.
      if (event.origin !== platformOrigin || event.source !== window.parent) return;
      const msg = event.data;
      if (!msg || msg.v !== 1 || typeof msg.type !== "string") return;

      if (msg.type === "session") {
        if (msg.state === "revoked") sessionEndHandlers.forEach((cb) => cb(msg.reason));
        return;
      }
      const waiter = pending.get(msg.id);
      if (!waiter) return;
      pending.delete(msg.id);
      clearTimeout(waiter.timer);
      waiter.settle(msg);
    }
    window.addEventListener("message", onMessage);

    function request(message, ms, settle) {
      return new Promise((resolve, reject) => {
        const id = newId();
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(bridgeError(message.type === "hello" ? "NO_ANSWER" : "CALL_TIMEOUT"));
        }, ms);
        pending.set(id, { timer, settle: (msg) => settle(msg, resolve, reject) });
        post(Object.assign({ id }, message));
      });
    }

    function call(op, args) {
      return request({ type: "call", nonce, op, args: args || {} }, callTimeoutMs, (msg, resolve, reject) => {
        if (msg.type === "result" && msg.ok) resolve(msg.data);
        else reject(bridgeError(msg.code || "CALL_FAILED"));
      });
    }

    const hello = { type: "hello", protocol: PROTOCOL };
    if (codeChallenge) hello.codeChallenge = codeChallenge;

    return request(hello, timeoutMs, (msg, resolve, reject) => {
      if (msg.type === "hello-nack") return reject(bridgeError(msg.code || "HELLO_REFUSED"));
      if (msg.type !== "hello-ack") return reject(bridgeError("HELLO_REFUSED"));
      nonce = msg.nonce;
      resolve({
        protocol: msg.protocol,
        capabilities: msg.capabilities || [],
        user: msg.user || {},
        sso: msg.sso || { mode: "none" },
        call,
        authorize: (challenge) => call("authorize", { codeChallenge: challenge }),
        onSessionEnd: (cb) => { sessionEndHandlers.push(cb); },
      });
    });
  }

  window.AancerBridge = { connect };
})();
