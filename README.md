# 🍜 Joy's Kitchen — Noodles Vendor App

A full PWA web app for a noodles food vendor. Customers order online, pay, and track their order in real time. The vendor sees a live queue sorted by payment time (first paid = first served).

---

## 🌟 Features

### Customer Side
- Browse menu (Small / Medium / Large bowls)
- Customise: spice level, egg option, add-ons (chicken, shrimp, etc.)
- Checkout with order summary
- Pay via OPay / Bank Transfer / USSD
- Real-time order status tracking (Paid → Preparing → Ready → Completed)
- Live chat with vendor

### Vendor Side
- PIN-protected dashboard (default PIN: `1234`)
- Live order queue sorted by payment time (first paid = first on top)
- One-tap status updates: Preparing → Ready → Completed
- Auto sound alert on new paid order
- Two-way messaging with customer
- Daily sales summary + all-time revenue
- Order history

### PWA
- Installable on Android & iOS
- Works offline (cached shell)
- Mobile-optimised bottom navigation

---

## 🚀 Setup & Deployment

### 1. Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `joys-kitchen`)
3. Enable **Firestore Database** (start in test mode)
4. Go to **Project Settings → Web App** and copy your config keys
5. Deploy Firestore rules:
   ```
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes
   ```

### 2. Local Development
```bash
# Clone / download project
npm install

# Create .env file
cp .env.example .env
# Fill in your Firebase values in .env

npm run dev
# App runs at http://localhost:5173
```

### 3. Deploy to Render
1. Push code to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set Build Command: `npm install && npm run build`
5. Set Start Command: `npx serve dist -s -l 3000`
6. Add all `VITE_*` environment variables from `.env.example`
7. Deploy!

> **Tip:** For serving a Vite SPA on Render, install `serve`:  
> Build Command: `npm install && npm run build`  
> Start Command: `npx serve dist -s -l ${PORT:-3000}`

---

## 📁 Project Structure

```
joys-kitchen/
├── src/
│   ├── App.jsx          ← All pages in one file (router, customer, vendor)
│   └── main.jsx         ← React entry point
├── public/
│   └── manifest.json    ← PWA manifest
├── index.html
├── vite.config.js
├── firestore.rules      ← Firestore security rules
├── firestore.indexes.json
├── render.yaml          ← Render deployment config
└── .env.example         ← Environment variables template
```

---

## 🗃️ Firestore Data Structure

```
orders/
  {orderId}/
    customer_name: "John"
    customer_phone: "0801..."
    noodle_type: "large"
    noodle_name: "Large Bowl"
    quantity: 1
    spice_option: "hot"
    egg_option: "fried"
    add_ons: ["chicken"]
    unit_price: 1600
    total_price: 1600
    note: ""
    payment_status: "paid"      ← "pending" | "paid"
    order_status: "preparing"   ← "pending" | "paid" | "preparing" | "ready" | "completed" | "cancelled"
    payment_time: Timestamp     ← set when payment confirmed
    created_at: Timestamp

    messages/
      {msgId}/
        sender: "customer"      ← "customer" | "vendor"
        text: "Is it almost ready?"
        ts: Timestamp
```

**Queue Rule (enforced by Firestore query):**
```
payment_status == "paid"
order_status IN ["paid", "preparing", "ready"]
ORDER BY payment_time ASC
```
→ Only paid orders appear, sorted by who paid first.

---

## 🎨 Design

- **Fonts:** Syne (headings) + Nunito (body)
- **Colors:** Deep dark background, fire-orange accent (#e8450a), warm cream surfaces
- **Style:** Rich food-app aesthetic — warm, energetic, mobile-first

---

## 🔒 Vendor Access

Default PIN: **1234**

To change: set `VITE_VENDOR_PIN=yourpin` in your environment variables.

Access the vendor dashboard at `/` → bottom nav → 👨‍🍳 Vendor.

---

## 📦 Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Frontend  | React 18 + Vite             |
| Database  | Firebase Firestore (realtime)|
| Auth      | PIN-based (sessionStorage)  |
| Hosting   | Render (free tier)          |
| PWA       | Web App Manifest + SW       |
| Fonts     | Google Fonts (Syne, Nunito) |
