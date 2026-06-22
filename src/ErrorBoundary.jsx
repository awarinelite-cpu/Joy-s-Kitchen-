// src/ErrorBoundary.jsx
//
// Without this, any uncaught error anywhere in the React tree (including
// inside a useEffect, like the notification-permission/push-notification
// crash this was added to fix) unmounts the entire app, leaving a blank
// screen with zero feedback — exactly the bug this is meant to prevent.
//
// This is a last line of defence, not a substitute for fixing the actual
// bug. It just makes sure that IF something still slips through, the vendor
// sees a "something went wrong, tap to reload" screen instead of a blank
// black void with no way to recover except force-closing the app.

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
            background: "#111111",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 48 }}>🍜💥</div>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 320, fontSize: 14 }}>
            The app hit an unexpected error and couldn't continue. Your orders
            and data are safe — this is just a display glitch.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#ff5722",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            🔄 Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
