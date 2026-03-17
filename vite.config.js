import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use our custom sw.js instead of the auto-generated one
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",

      // Auto-update the SW in the background without asking the user
      registerType: "autoUpdate",

      // Include the background image in the precache manifest
      includeAssets: ["NOODLES_images.jpg"],

      // Web App Manifest — makes the app installable
      manifest: {
        name: "Joy's Kitchen",
        short_name: "Joy's Kitchen",
        description: "Order fresh noodles from Joy's Kitchen",
        theme_color: "#e8450a",
        background_color: "#0e0905",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/NOODLES_images.jpg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any maskable",
          },
          {
            src: "/NOODLES_images.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
      },

      // Enable SW in dev mode so you can test without building
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
