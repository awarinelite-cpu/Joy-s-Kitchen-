// Joy's Kitchen Service Worker
const CACHE_NAME = "joys-kitchen-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/NOODLES_images.jpg",
];

// Install — cache core assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// Push notifications from server (future use)
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  const title = data.title || "Joy's Kitchen 🍜";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/NOODLES_images.jpg",
    badge: "/NOODLES_images.jpg",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: { url: data.url || "/" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open/focus the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});
