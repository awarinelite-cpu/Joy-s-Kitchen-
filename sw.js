// ─── Joy's Kitchen — Service Worker ──────────────────────────────────────────
// Handles PWA install, offline caching, and background notifications.

const CACHE_NAME = "joys-kitchen-v1";

// Assets to pre-cache on install so the app works offline
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/NOODLES_images.jpg",
];

// ── Install: pre-cache core assets ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Take over immediately without waiting for old SW to be released
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim all open clients immediately
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests; skip cross-origin requests (Firebase, Google Fonts)
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache a fresh copy of the response
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        // Network failed — serve from cache
        caches.match(event.request).then((cached) => cached || caches.match("/index.html"))
      )
  );
});

// ── Push: receive server-sent push messages ───────────────────────────────────
// (Only needed if you add Web Push / FCM server-side later)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Joy's Kitchen", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || "Joy's Kitchen", {
      body: data.body || "",
      icon: data.icon || "/NOODLES_images.jpg",
      badge: "/NOODLES_images.jpg",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" },
    })
  );
});

// ── Notification click: focus or open the app ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If a window is already open, focus it
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        // Otherwise open a new window
        return self.clients.openWindow(target);
      })
  );
});
