import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["NOODLES_images.jpg", "favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Joy's Kitchen",
        short_name: "Joy's Kitchen",
        description: "Order fresh noodles from Joy's Kitchen",
        theme_color: "#e8450a",
        background_color: "#0e0905",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icons/icon-72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "icons/icon-96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "icons/icon-128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "icons/icon-144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "icons/icon-152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          // Google Fonts — cache first
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Firebase JS SDK — stale while revalidate
          {
            urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "firebase-sdk-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // App images — cache first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Pre-cache app shell
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,webp,woff2}"],
        // Don't cache Firestore/Auth API calls — they must be live
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
      },
    }),
  ],
});
