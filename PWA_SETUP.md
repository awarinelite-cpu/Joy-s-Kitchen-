# Joy's Kitchen — PWA Setup Guide

## What was added

| File | Purpose |
|------|---------|
| `vite.config.js` | Registers `vite-plugin-pwa`; defines manifest + Workbox caching rules |
| `index.html` | Full PWA meta tags (theme colour, Apple splash, OG cards, viewport-fit) |
| `src/main.jsx` | Registers the auto-generated service worker via `virtual:pwa-register` |
| `generate_icons.js` | One-time script to produce all required icon sizes from your noodle image |

---

## 1 — Install dependencies

```bash
npm install -D vite-plugin-pwa workbox-window
npm install    # re-run to pick up new deps
```

---

## 2 — Generate icons

Make sure `public/NOODLES_images.jpg` exists (your noodle photo, ≥ 512 × 512 px).

```bash
npm install sharp   # install locally just for this script
node generate_icons.js
npm uninstall sharp  # optional — uninstall after generating
```

This writes `public/icons/icon-{72,96,128,144,152,192,384,512}.png`.

> **Tip:** For the best "maskable" icon (no white padding on Android), your logo
> should sit inside the central 80 % of the image. You can verify at
> https://maskable.app

---

## 3 — Build & preview

```bash
npm run build
npm run preview   # serve the production build locally
```

Open the preview URL in Chrome → DevTools → Application → Manifest / Service Workers
to confirm everything is registered.

---

## 4 — Deploy

Deploy the `dist/` folder to Firebase Hosting, Netlify, Vercel, or any static host.

```bash
# Firebase example
npm run build
firebase deploy --only hosting
```

---

## Caching strategy summary

| Asset type | Strategy | TTL |
|------------|----------|-----|
| App shell (HTML/JS/CSS) | Pre-cached at build | Updated on deploy |
| Google Fonts | Cache-first | 1 year |
| Images (PNG/JPG/WebP) | Cache-first | 30 days |
| Firebase SDK | Stale-while-revalidate | 7 days |
| Firestore / Auth API | **Not cached** — always live | — |

Firestore's real-time `onSnapshot` listeners work fine offline (Firebase handles
its own local persistence separately — enable it with `enableIndexedDbPersistence`
if you want full offline order viewing).

---

## Optional: Firestore offline persistence

Add this to your `App.jsx` (or wherever Firebase is initialised) to let customers
view their last order status even with no internet:

```js
import { enableIndexedDbPersistence } from "firebase/firestore";

// After: const db = getFirestore(firebaseApp);
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Firestore persistence failed: multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore persistence not supported in this browser");
  }
});
```

---

## iOS "Add to Home Screen" notes

- iOS Safari shows an **Add to Home Screen** prompt via the share sheet (no
  automatic install banner like Android Chrome).
- The `apple-mobile-web-app-capable` meta tag makes the app launch full-screen.
- `apple-mobile-web-app-status-bar-style: black-translucent` lets your dark
  background bleed into the status bar — matches the Joy's Kitchen dark theme.
