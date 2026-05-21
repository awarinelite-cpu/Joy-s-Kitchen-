# Joy's Kitchen — PWA Setup Guide

## What was added

| File | Purpose |
|------|---------|
| `vite.config.js` | Registers `vite-plugin-pwa`; defines manifest + Workbox caching rules |
| `index.html` | Full PWA meta tags (theme colour, Apple splash, OG cards, viewport-fit) |
| `src/main.jsx` | Registers the Workbox-generated service worker via `virtual:pwa-register` |
| `generate_icons.js` | One-time script to produce all required icon sizes from your noodle image |

---

## 1 — Install dependencies

```bash
npm install
# vite-plugin-pwa and workbox-window are now listed in package.json devDependencies
# so a plain `npm install` picks them up automatically
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
its own local persistence separately — enable it with `initializeFirestore` +
`persistentLocalCache` if you want full offline order viewing — see below).

---

## Optional: Firestore offline persistence

> ⚠️ **Important:** `enableIndexedDbPersistence()` was **removed** in Firebase JS
> SDK v9.20+ / v10. Use `initializeFirestore` with `persistentLocalCache` instead.

Replace the standard `getFirestore` call in `App.jsx` with the following:

```js
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Replace:  const db = getFirestore(firebaseApp);
// With:
const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    // persistentMultipleTabManager allows multiple browser tabs to share
    // the same IndexedDB cache without conflicts.
    tabManager: persistentMultipleTabManager(),
  }),
});
```

This lets customers view their last order status even with no internet connection.

**Single-tab alternative** (simpler, no cross-tab manager):

```js
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache(),
});
```

Both options store data in IndexedDB and are fully supported in Firebase SDK v10.

---

## iOS "Add to Home Screen" notes

- iOS Safari shows an **Add to Home Screen** prompt via the share sheet (no
  automatic install banner like Android Chrome).
- The `apple-mobile-web-app-capable` meta tag makes the app launch full-screen.
- `apple-mobile-web-app-status-bar-style: black-translucent` lets your dark
  background bleed into the status bar — matches the Joy's Kitchen dark theme.

---

## Manifest notes

- The root `manifest.json` in the project has been replaced by `public/manifest.json`.
  The old root file was using `NOODLES_images.jpg` (a JPEG) as the PWA icon source,
  which is not a valid format for PWA icons. All icons must be PNG.
- `vite-plugin-pwa` also generates its own manifest from `vite.config.js` at build
  time, which takes precedence. Both the `public/` manifest and the Vite config
  manifest must stay in sync.
