import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Register the Workbox-generated service worker (produced by vite-plugin-pwa).
// The virtual module is only available after `npm run build`; it is a no-op in
// dev mode so the import is wrapped in a try/catch to keep `npm run dev` safe.
try {
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // New version available — silently update.
      console.info("[PWA] New content available, updating…");
    },
    onOfflineReady() {
      console.info("[PWA] App is ready to work offline.");
    },
  });
} catch {
  // vite-plugin-pwa virtual module not available in dev — safe to ignore.
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
