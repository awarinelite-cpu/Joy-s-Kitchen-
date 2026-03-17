import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, updateDoc, doc, onSnapshot,
  query, where, orderBy, serverTimestamp, getDocs, Timestamp
} from "firebase/firestore";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// Replace these with your actual Firebase project values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VENDOR_PIN = import.meta.env.VITE_VENDOR_PIN || "1234";
const NOODLE_BG = "/NOODLES_images.jpg";

const MENU = [
  { id: "small",  name: "Small Bowl",  price: 700,  time: 5,  serves: "1 person",  tag: "Starter" },
  { id: "medium", name: "Medium Bowl", price: 900,  time: 7,  serves: "1–2 persons", tag: "Best Value" },
  { id: "large",  name: "Large Bowl",  price: 1200, time: 10, serves: "2 persons", tag: "Fan Favourite" },
];

const SPICES = [
  { id: "mild",   label: "Mild",   emoji: "🟢", desc: "Light & smooth" },
  { id: "medium", label: "Medium", emoji: "🟡", desc: "Pleasant kick" },
  { id: "hot",    label: "Hot",    emoji: "🔴", desc: "Fire in a bowl" },
];

const EGGS = [
  { id: "fried",  label: "Fried Egg",  emoji: "🍳", extra: 100 },
  { id: "boiled", label: "Boiled Egg", emoji: "🥚", extra: 50  },
  { id: "none",   label: "No Egg",     emoji: "❌", extra: 0   },
];

const ADDONS = [
  { id: "extra_spice",  label: "Extra Spice 🌶️",  price: 50  },
  { id: "extra_sauce",  label: "Extra Sauce 🥫",   price: 100 },
  { id: "extra_veggie", label: "Extra Veggies 🥦", price: 150 },
  { id: "chicken",      label: "Chicken 🍗",        price: 400 },
  { id: "shrimp",       label: "Shrimp 🍤",         price: 500 },
];

const STATUS_INFO = {
  pending:    { label: "Awaiting Payment",     color: "#d97706", bg: "#fef3c7", icon: "⏳" },
  paid:       { label: "In Queue",             color: "#2563eb", bg: "#dbeafe", icon: "🔵" },
  preparing:  { label: "Being Prepared 👨‍🍳",  color: "#7c3aed", bg: "#ede9fe", icon: "🍳" },
  ready:      { label: "Ready for Pickup! 🎉", color: "#059669", bg: "#d1fae5", icon: "✅" },
  completed:  { label: "Completed",            color: "#6b7280", bg: "#f3f4f6", icon: "☑️" },
  cancelled:  { label: "Cancelled",            color: "#dc2626", bg: "#fee2e2", icon: "❌" },
};

const fmt = (n) => `₦${Number(n).toLocaleString()}`;
const fmtTime = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
};
const shortId = (id) => id?.slice(-6).toUpperCase() || "——";

// ─── FIRESTORE HELPERS ────────────────────────────────────────────────────────
const placeOrder = (data) =>
  addDoc(collection(db, "orders"), {
    ...data, payment_status: "pending", order_status: "pending",
    payment_time: null, created_at: serverTimestamp(),
  });

const markPaid = (id) =>
  updateDoc(doc(db, "orders", id), {
    payment_status: "paid", order_status: "paid", payment_time: serverTimestamp(),
  });

const updateStatus = (id, status) =>
  updateDoc(doc(db, "orders", id), { order_status: status });

const sendMsg = (orderId, sender, text) =>
  addDoc(collection(db, "orders", orderId, "messages"), {
    sender, text, ts: serverTimestamp(),
  });

const useMessages = (orderId) => {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    if (!orderId) return;
    const q = query(collection(db, "orders", orderId, "messages"), orderBy("ts", "asc"));
    return onSnapshot(q, (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [orderId]);
  return msgs;
};

const useOrder = (orderId) => {
  const [order, setOrder] = useState(null);
  useEffect(() => {
    if (!orderId) return;
    return onSnapshot(doc(db, "orders", orderId), (s) => {
      if (s.exists()) setOrder({ id: s.id, ...s.data() });
    });
  }, [orderId]);
  return order;
};

const useVendorQueue = () => {
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("payment_status", "==", "paid"),
      where("order_status", "in", ["paid", "preparing", "ready"]),
      orderBy("payment_time", "asc")
    );
    return onSnapshot(q, (s) => setQueue(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);
  return queue;
};

const useAllOrders = () => {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
    return onSnapshot(q, (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);
  return orders;
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Nunito:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --fire: #e8450a; --fire2: #ff6b35; --gold: #f5a623; --dark: #0e0905;
    --dark2: #1c1309; --ink: #1e1208; --cream: #fdf8f2; --warm: #f5ede0;
    --muted: #8b6347; --border: rgba(232,69,10,0.14); --radius: 16px;
    --font-h: 'Syne', sans-serif; --font-b: 'Nunito', sans-serif;
    --shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  html, body, #root { height: 100%; font-family: var(--font-b); background: var(--cream); color: var(--ink); }
  body { -webkit-font-smoothing: antialiased; overscroll-behavior: none; }
  input, select, textarea { font-family: var(--font-b); }
  ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: var(--fire); border-radius: 2px; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes pop { 0% { transform:scale(0.9); opacity:0; } 100% { transform:scale(1); opacity:1; } }

  .fade-up { animation: fadeUp 0.45s ease both; }
  .fade-up-1 { animation: fadeUp 0.45s 0.08s ease both; }
  .fade-up-2 { animation: fadeUp 0.45s 0.16s ease both; }
  .fade-up-3 { animation: fadeUp 0.45s 0.24s ease both; }
  .fade-up-4 { animation: fadeUp 0.45s 0.32s ease both; }

  .page { min-height: 100dvh; padding-bottom: 80px; }
  .wrap { max-width: 480px; margin: 0 auto; padding: 0 16px; }
  .wrap-wide { max-width: 860px; margin: 0 auto; padding: 0 16px; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 13px 22px; border: none; border-radius: 12px; cursor: pointer;
    font-family: var(--font-h); font-weight: 700; font-size: 14px; letter-spacing: 0.02em;
    transition: all 0.18s ease; text-decoration: none; white-space: nowrap;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
  .btn-fire { background: var(--fire); color: #fff; }
  .btn-fire:hover { background: var(--fire2); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(232,69,10,0.35); }
  .btn-fire:active { transform: translateY(0); }
  .btn-out { background: transparent; color: var(--fire); border: 2px solid var(--fire); }
  .btn-out:hover { background: var(--fire); color: #fff; }
  .btn-ghost { background: rgba(0,0,0,0.05); color: var(--muted); }
  .btn-ghost:hover { background: rgba(0,0,0,0.09); }
  .btn-full { width: 100%; }
  .btn-sm { padding: 8px 14px; font-size: 12px; border-radius: 9px; }

  .card { background: #fff; border-radius: var(--radius); border: 1.5px solid var(--border); box-shadow: var(--shadow); }

  .badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }

  .topbar { background: var(--dark); padding: 14px 20px; position: sticky; top: 0; z-index: 60; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .topbar-inner { display: flex; align-items: center; gap: 12px; max-width: 480px; margin: 0 auto; }
  .topbar h1 { font-family: var(--font-h); color: #fff; font-size: 19px; }
  .topbar .sub { color: rgba(255,255,255,0.4); font-size: 12px; }

  .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--dark2); display: flex; justify-content: space-around; padding: 10px 0 calc(10px + env(safe-area-inset-bottom)); z-index: 80; border-top: 1px solid rgba(255,255,255,0.07); }
  .bottom-nav button { display: flex; flex-direction: column; align-items: center; gap: 3px; color: rgba(255,255,255,0.38); background: none; border: none; cursor: pointer; font-size: 10px; font-family: var(--font-b); font-weight: 600; padding: 4px 16px; transition: color 0.2s; letter-spacing: 0.03em; }
  .bottom-nav button.active { color: var(--fire2); }
  .bottom-nav button svg { width: 21px; height: 21px; }

  .field label { display: block; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .field input, .field textarea, .field select { width: 100%; padding: 12px 14px; border: 2px solid var(--border); border-radius: 10px; font-size: 14px; color: var(--ink); background: #fff; outline: none; transition: border-color 0.2s; }
  .field input:focus, .field textarea:focus, .field select:focus { border-color: var(--fire); }

  .option-pill { flex: 1; padding: 12px 8px; border-radius: 12px; cursor: pointer; text-align: center; border: 2px solid var(--border); background: #fff; transition: all 0.15s; }
  .option-pill.sel { border-color: var(--fire); background: rgba(232,69,10,0.06); }
  .option-pill .emoji { font-size: 22px; margin-bottom: 4px; }
  .option-pill .name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .option-pill .desc { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .option-pill .xtra { font-size: 10px; color: var(--fire); font-weight: 700; margin-top: 3px; }

  .row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .row:last-child { border-bottom: none; }
  .row .lbl { color: var(--muted); font-size: 13px; }
  .row .val { font-weight: 600; font-size: 13px; color: var(--ink); text-align: right; max-width: 60%; }

  .msg-bubble-me { background: var(--fire); color: #fff; border-radius: 16px 16px 4px 16px; }
  .msg-bubble-them { background: #fff; color: var(--ink); border-radius: 16px 16px 16px 4px; border: 1px solid var(--border); }

  .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--fire); border-radius: 50%; animation: spin 0.7s linear infinite; margin: 40px auto; }

  .notif { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background: var(--dark); color: #fff; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; z-index: 999; box-shadow: 0 8px 24px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 8px; animation: pop 0.25s ease; border: 1px solid rgba(255,255,255,0.1); max-width: 90vw; }

  .qty-btn { width: 34px; height: 34px; border-radius: 9px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; transition: all 0.15s; }

  .addons-item { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-radius: 10px; cursor: pointer; border: 2px solid var(--border); background: #fff; transition: all 0.15s; margin-bottom: 8px; }
  .addons-item.sel { border-color: var(--fire); background: rgba(232,69,10,0.06); }

  .status-track { display: flex; flex-direction: column; gap: 0; }
  .status-step { display: flex; align-items: flex-start; gap: 12px; }
  .status-step .line { display: flex; flex-direction: column; align-items: center; }
  .status-step .dot { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; font-size: 10px; }
  .status-step .connector { width: 2px; height: 32px; margin: 3px 0; }
  .status-step .info { padding-bottom: 8px; }
  .status-step .step-label { font-weight: 700; font-size: 13px; }
  .status-step .step-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }

  .vendor-card { background: #fff; border-radius: 14px; border: 1.5px solid var(--border); padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.18s; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .vendor-card:hover { border-color: var(--fire); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,69,10,0.1); }
  .vendor-card .order-no { font-family: var(--font-h); font-size: 28px; font-weight: 800; color: var(--fire); }

  .pulse-ring { animation: pulse 1.8s ease infinite; }
`;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="notif">
      <span>{msg.icon || "🍜"}</span>
      <span>{msg.text}</span>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((text, icon = "🍜") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, text, icon }]);
  }, []);
  const remove = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const ToastContainer = () => (
    <>
      {toasts.slice(-1).map((t) => (
        <Toast key={t.id} msg={t} onClose={() => remove(t.id)} />
      ))}
    </>
  );
  return { show, ToastContainer };
}

function StatusBadge({ status, large }) {
  const s = STATUS_INFO[status] || STATUS_INFO.pending;
  return (
    <span className="badge" style={{
      background: s.bg, color: s.color,
      fontSize: large ? "12px" : "10px",
      padding: large ? "5px 12px" : "3px 9px"
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function MessageThread({ orderId, role }) {
  const msgs = useMessages(orderId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await sendMsg(orderId, role, text.trim());
    setText(""); setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{
        height: 260, overflowY: "auto", padding: "12px", background: "var(--warm)",
        borderRadius: "12px 12px 0 0", border: "1.5px solid var(--border)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {msgs.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 16 }}>
            💬 No messages yet
          </p>
        )}
        {msgs.map((m) => {
          const isMe = m.sender === role;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              <div className={isMe ? "msg-bubble-me" : "msg-bubble-them"}
                style={{ padding: "9px 14px", maxWidth: "75%", fontSize: 13, lineHeight: 1.45 }}>
                {m.text}
              </div>
              <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, paddingInline: 4 }}>
                {m.sender === "vendor" ? "👨‍🍳 Vendor" : "🧑 You"} · {fmtTime(m.ts)}
              </span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#fff", borderRadius: "0 0 12px 12px", border: "1.5px solid var(--border)", borderTop: "none" }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Type a message…"
          style={{ flex: 1, padding: "10px 13px", borderRadius: 9, border: "2px solid var(--border)", fontSize: 13, outline: "none" }} />
        <button onClick={send} disabled={sending || !text.trim()} className="btn btn-fire btn-sm" style={{ padding: "10px 14px" }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ─── CUSTOMER PAGES ───────────────────────────────────────────────────────────
function HomePage({ nav, savedOrderId }) {
  return (
    <div className="page" style={{ minHeight: "100dvh", position: "relative", background: "#0e0905" }}>

      {/* Full-bleed background image */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `url(${NOODLE_BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }} />

      {/* Dark overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.68) 40%, rgba(14,9,5,0.96) 100%)",
      }} />

      {/* All content sits on top */}
      <div style={{ position: "relative", zIndex: 2, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* Hero */}
        <div style={{ flex: 1, padding: "56px 24px 32px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div className="wrap">

            <div className="fade-up" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.4)",
              borderRadius: 20, padding: "5px 14px", marginBottom: 20,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 2s ease infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", letterSpacing: "0.1em" }}>OPEN NOW</span>
            </div>

            <h1 className="fade-up-1" style={{
              fontFamily: "var(--font-h)", color: "#fff",
              fontSize: "clamp(48px, 13vw, 72px)", fontWeight: 800,
              lineHeight: 1.0, marginBottom: 8,
              textShadow: "0 2px 20px rgba(0,0,0,0.9)",
            }}>
              Joy's<br /><span style={{ color: "var(--fire)" }}>Kitchen</span>
            </h1>

            <p className="fade-up-2" style={{
              color: "rgba(255,255,255,0.75)", fontSize: 15,
              marginBottom: 32, lineHeight: 1.65, maxWidth: 290,
              textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            }}>
              🌶️ Fresh noodles, cooked to order.<br />Spicy. Savory. Fiery. Flavourful.
            </p>

            <div className="fade-up-3" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-fire"
                onClick={() => nav("menu")}
                style={{ fontSize: 16, padding: "16px 32px", borderRadius: 14, boxShadow: "0 6px 24px rgba(232,69,10,0.5)" }}
              >
                Order Now →
              </button>
              {savedOrderId && (
                <button
                  className="btn btn-ghost"
                  onClick={() => nav("order", { orderId: savedOrderId })}
                  style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, border: "1.5px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
                >
                  📦 Track My Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "18px 0",
        }}>
          <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[["🔥", "Made Fresh"], ["⚡", "5–10 Min"], ["🏆", "First Paid First"]].map(([ic, lb]) => (
              <div key={lb} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "8px 0" }}>
                <span style={{ fontSize: 22 }}>{ic}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lb}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Menu preview */}
        <div style={{ padding: "28px 0 100px" }}>
          <div className="wrap">
            <h2 style={{ fontFamily: "var(--font-h)", color: "#fff", fontSize: 22, marginBottom: 18, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
              Today's Menu
            </h2>
            {MENU.map((item, i) => (
              <div
                key={item.id}
                onClick={() => nav("customize", { noodleId: item.id })}
                className="fade-up"
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", marginBottom: 10, borderRadius: 14,
                  cursor: "pointer",
                  background: item.id === "medium" ? "rgba(232,69,10,0.18)" : "rgba(255,255,255,0.07)",
                  border: `1.5px solid ${item.id === "medium" ? "rgba(232,69,10,0.4)" : "rgba(255,255,255,0.1)"}`,
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s",
                  animationDelay: `${i * 0.08}s`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(232,69,10,0.6)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = item.id === "medium" ? "rgba(232,69,10,0.4)" : "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "none"; }}
              >
                <span style={{ fontSize: 36 }}>🍜</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: "var(--font-h)", color: "#fff", fontSize: 17, fontWeight: 700 }}>{item.name}</span>
                    <span className="badge" style={{
                      background: item.id === "medium" ? "var(--fire)" : "rgba(255,255,255,0.12)",
                      color: item.id === "medium" ? "#fff" : "rgba(255,255,255,0.55)", fontSize: 9,
                    }}>{item.tag}</span>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>~{item.time} min · {item.serves}</span>
                </div>
                <span style={{ fontFamily: "var(--font-h)", color: "var(--fire2)", fontSize: 19, fontWeight: 800 }}>{fmt(item.price)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
function MenuPage({ nav }) {
  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1 style={{ fontFamily: "var(--font-h)", color: "#fff", fontSize: 21 }}>🍜 Our Menu</h1>
            <div className="sub">Pick your noodle size</div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 20 }}>
        <div style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#92610a" }}>First Paid, First Prepared</p>
            <p style={{ color: "#a07420", fontSize: 12, marginTop: 2 }}>Payment confirms your spot in the queue automatically.</p>
          </div>
        </div>

        {MENU.map((item, i) => (
          <div key={item.id} onClick={() => nav("customize", { noodleId: item.id })}
            className={`card fade-up`}
            style={{ padding: 20, marginBottom: 14, cursor: "pointer", animationDelay: `${i * 0.1}s`, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--fire)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 68, height: 68, borderRadius: 14, background: "linear-gradient(135deg, rgba(232,69,10,0.1), rgba(245,166,35,0.08))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0, border: "1.5px solid var(--border)" }}>🍜</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: "var(--font-h)", fontSize: 20, fontWeight: 700 }}>{item.name}</h2>
                  <span className="badge" style={{ background: item.id === "medium" ? "var(--fire)" : "#f3f4f6", color: item.id === "medium" ? "#fff" : "#6b7280" }}>{item.tag}</span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>~{item.time} min prep · {item.serves}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-h)", fontSize: 26, fontWeight: 800, color: "var(--fire)" }}>{fmt(item.price)}</span>
                  <button className="btn btn-fire btn-sm">Choose →</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomizePage({ nav, noodleId, toast }) {
  const noodle = MENU.find((n) => n.id === noodleId);
  const [qty, setQty] = useState(1);
  const [spice, setSpice] = useState("medium");
  const [egg, setEgg] = useState("none");
  const [addons, setAddons] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!noodle) { nav("menu"); return null; }

  const eggExtra = EGGS.find((e) => e.id === egg)?.extra || 0;
  const addonTotal = addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price || 0), 0);
  const unit = noodle.price + eggExtra + addonTotal;
  const total = unit * qty;

  const toggleAddon = (id) => setAddons((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const proceed = async () => {
    if (!name.trim()) { toast("Please enter your name", "⚠️"); return; }
    setLoading(true);
    try {
      const ref = await placeOrder({
        customer_name: name.trim(), customer_phone: phone.trim(),
        noodle_type: noodle.id, noodle_name: noodle.name,
        quantity: qty, spice_option: spice, egg_option: egg,
        add_ons: addons, unit_price: unit, total_price: total, note: note.trim(),
      });
      localStorage.setItem("last_order_id", ref.id);
      nav("payment", { orderId: ref.id });
    } catch (e) {
      toast("Failed to place order. Check connection.", "❌");
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner">
          <button onClick={() => nav("menu")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}>
            ← 
          </button>
          <div>
            <h1>Customise</h1>
            <div className="sub">{noodle.name}</div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 130 }}>

        {/* Details */}
        <div className="card fade-up" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Your Details</p>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Adeyemi" />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080x xxxx xxxx" type="tel" />
          </div>
        </div>

        {/* Quantity */}
        <div className="card fade-up-1" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Quantity</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-h)", fontSize: 17, fontWeight: 700 }}>{noodle.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))} style={{ background: "var(--warm)", border: "1.5px solid var(--border)", color: "var(--fire)" }}>−</button>
              <span style={{ fontFamily: "var(--font-h)", fontSize: 26, fontWeight: 800, minWidth: 30, textAlign: "center" }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty(Math.min(10, qty + 1))} style={{ background: "var(--fire)", border: "none", color: "#fff" }}>+</button>
            </div>
          </div>
        </div>

        {/* Spice */}
        <div className="card fade-up-2" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Spice Level</p>
          <div style={{ display: "flex", gap: 8 }}>
            {SPICES.map((s) => (
              <div key={s.id} className={`option-pill ${spice === s.id ? "sel" : ""}`} onClick={() => setSpice(s.id)}>
                <div className="emoji">{s.emoji}</div>
                <div className="name">{s.label}</div>
                <div className="desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Egg */}
        <div className="card fade-up-3" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Egg Option</p>
          <div style={{ display: "flex", gap: 8 }}>
            {EGGS.map((e) => (
              <div key={e.id} className={`option-pill ${egg === e.id ? "sel" : ""}`} onClick={() => setEgg(e.id)}>
                <div className="emoji">{e.emoji}</div>
                <div className="name">{e.label}</div>
                {e.extra > 0 && <div className="xtra">+{fmt(e.extra)}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div className="card fade-up-4" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            Add-ons <span style={{ textTransform: "none", fontWeight: 400, fontSize: 11 }}>(optional)</span>
          </p>
          {ADDONS.map((a) => (
            <div key={a.id} className={`addons-item ${addons.includes(a.id) ? "sel" : ""}`} onClick={() => toggleAddon(a.id)}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{a.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--fire)", fontWeight: 700, fontSize: 13 }}>+{fmt(a.price)}</span>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: addons.includes(a.id) ? "var(--fire)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" }}>
                  {addons.includes(a.id) ? "✓" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Special Note</p>
          <div className="field">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any requests for the chef…" rows={3} style={{ resize: "none" }} />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--dark)", padding: "14px 20px calc(14px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(255,255,255,0.07)", zIndex: 70 }}>
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Total</div>
              <div style={{ fontFamily: "var(--font-h)", color: "var(--fire2)", fontSize: 30, fontWeight: 800 }}>{fmt(total)}</div>
            </div>
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
              <div>{qty}× {noodle.name}</div>
              <div>{SPICES.find((s) => s.id === spice)?.label} · {EGGS.find((e) => e.id === egg)?.emoji}</div>
            </div>
          </div>
          <button className="btn btn-fire btn-full" onClick={proceed} disabled={loading} style={{ padding: 15, fontSize: 15 }}>
            {loading ? "Placing Order…" : "Review & Pay →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentPage({ nav, orderId, toast }) {
  const order = useOrder(orderId);
  const [method, setMethod] = useState("transfer");
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (order?.payment_status === "paid") nav("order", { orderId }); }, [order, nav, orderId]);

  const copy = (val, lbl) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(lbl); toast(`${lbl} copied!`, "📋");
    setTimeout(() => setCopied(""), 2000);
  };

  const confirm = async () => {
    setConfirming(true);
    toast("Verifying payment…", "⏳");
    await new Promise((r) => setTimeout(r, 2000)); // simulate API call
    try {
      await markPaid(orderId);
      toast("Payment confirmed! You're in the queue 🎉", "✅");
    } catch {
      toast("Verification failed. Try again.", "❌");
      setConfirming(false);
    }
  };

  const METHODS = [
    { id: "transfer", icon: "🏦", name: "Bank Transfer", fields: [{ k: "Bank", v: "OPay" }, { k: "Account No.", v: "8012345678" }, { k: "Account Name", v: "Joy's Kitchen" }] },
    { id: "opay",     icon: "📱", name: "OPay",          fields: [{ k: "OPay Tag", v: "@joyskitchen" }, { k: "Phone", v: "08012345678" }] },
    { id: "ussd",     icon: "💳", name: "USSD / Card",   fields: [{ k: "GTB USSD", v: "*737*2*Amount*0812345678#" }, { k: "Zenith", v: "*966*2*Amount*0812345678#" }] },
  ];

  if (!order) return <div className="spinner" />;

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner">
          <button onClick={() => nav("menu")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}>←</button>
          <div><h1>Payment</h1><div className="sub">Complete to enter queue</div></div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 120 }}>
        {/* Amount card */}
        <div className="fade-up" style={{ background: "linear-gradient(145deg, #b03006, var(--fire), #e85a25)", borderRadius: 20, padding: "28px 24px", marginBottom: 24, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Amount Due</p>
          <div style={{ fontFamily: "var(--font-h)", color: "#fff", fontSize: 52, fontWeight: 800 }}>{fmt(order.total_price)}</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 8 }}>
            Order #{shortId(orderId)} · ⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </p>
        </div>

        {/* Method selector */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Payment Method</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {METHODS.map((m) => (
            <div key={m.id} onClick={() => setMethod(m.id)} style={{ flex: 1, padding: "12px 6px", borderRadius: 12, cursor: "pointer", textAlign: "center", border: `2px solid ${method === m.id ? "var(--fire)" : "var(--border)"}`, background: method === m.id ? "rgba(232,69,10,0.06)" : "#fff", transition: "all 0.15s" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: method === m.id ? "var(--fire)" : "var(--ink)" }}>{m.name}</div>
            </div>
          ))}
        </div>

        {/* Fields */}
        {(() => {
          const m = METHODS.find((x) => x.id === method);
          return (
            <div className="card fade-up-1" style={{ padding: 20, marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{m.icon} {m.name} Details</p>
              {m.fields.map(({ k, v }) => (
                <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", background: "var(--warm)", borderRadius: 10, border: "1.5px solid var(--border)", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: v.startsWith("*") || /^\d+$/.test(v) ? "monospace" : "inherit" }}>{v}</div>
                  </div>
                  <button onClick={() => copy(v, k)} style={{ background: copied === k ? "rgba(16,185,129,0.1)" : "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8, fontSize: 16, color: copied === k ? "#059669" : "var(--muted)" }}>
                    {copied === k ? "✓" : "⧉"}
                  </button>
                </div>
              ))}
            </div>
          );
        })()}

        <div style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 12, padding: "13px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "#92610a", lineHeight: 1.6 }}>
            ⚠️ After transferring, tap <strong>"I've Paid"</strong>. Your order enters the queue by payment time — <em>first paid = first cooked!</em>
          </p>
        </div>

        <button className="btn btn-fire btn-full" onClick={confirm} disabled={confirming} style={{ padding: 16, fontSize: 15, marginBottom: 10 }}>
          {confirming ? "⏳ Verifying…" : "✅ I've Paid — Confirm Order"}
        </button>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, lineHeight: 1.6 }}>
          Demo mode: tap to simulate payment. Production connects to OPay/Flutterwave API.
        </p>
      </div>
    </div>
  );
}

function OrderStatusPage({ nav, orderId, toast }) {
  const order = useOrder(orderId);
  const [tab, setTab] = useState("status");

  if (!order) return <div className="spinner" />;

  const steps = [
    { key: "paid",      label: "Order Paid",         sub: "Payment confirmed" },
    { key: "preparing", label: "Being Prepared",      sub: "Chef is cooking your noodles" },
    { key: "ready",     label: "Ready for Pickup",    sub: "Come collect your order" },
    { key: "completed", label: "Order Completed",     sub: "Enjoy your meal! 😊" },
  ];

  const statusOrder = ["paid", "preparing", "ready", "completed"];
  const currentIdx = statusOrder.indexOf(order.order_status);

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner">
          <button onClick={() => nav("home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}>←</button>
          <div><h1>Order Status</h1><div className="sub">#{shortId(orderId)}</div></div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 20 }}>
        {/* Big status */}
        <div className="card fade-up" style={{ padding: 24, marginBottom: 16, textAlign: "center", background: "linear-gradient(135deg, #fff 60%, var(--warm) 100%)" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>
            {order.order_status === "preparing" ? "👨‍🍳" : order.order_status === "ready" ? "🎉" : order.order_status === "completed" ? "✅" : "⏳"}
          </div>
          <StatusBadge status={order.order_status} large />
          <div style={{ marginTop: 14, fontFamily: "var(--font-h)", fontSize: 13, color: "var(--muted)" }}>
            Hi <strong style={{ color: "var(--ink)" }}>{order.customer_name}</strong> · Order #{shortId(orderId)}
          </div>
          <div style={{ marginTop: 8, fontFamily: "var(--font-h)", fontSize: 26, fontWeight: 800, color: "var(--fire)" }}>
            {fmt(order.total_price)}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--warm)", borderRadius: 12, padding: 4 }}>
          {["status", "details", "messages"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "var(--fire)" : "var(--muted)",
              fontWeight: 700, fontSize: 12, textTransform: "capitalize",
              fontFamily: "var(--font-b)", boxShadow: tab === t ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s"
            }}>{t}</button>
          ))}
        </div>

        {tab === "status" && (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>Order Progress</p>
            <div className="status-track">
              {steps.map((step, i) => {
                const done = currentIdx >= i;
                const active = currentIdx === i;
                return (
                  <div key={step.key} className="status-step">
                    <div className="line">
                      <div className="dot" style={{ background: done ? "var(--fire)" : "var(--border)", width: 22, height: 22 }}>
                        {done && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
                      </div>
                      {i < steps.length - 1 && <div className="connector" style={{ background: done ? "var(--fire)" : "var(--border)" }} />}
                    </div>
                    <div className="info">
                      <div className="step-label" style={{ color: done ? "var(--ink)" : "var(--muted)", fontWeight: active ? 800 : 600 }}>{step.label}</div>
                      <div className="step-sub">{step.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "details" && (
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Order Summary</p>
            <div className="row"><span className="lbl">Item</span><span className="val">{order.noodle_name}</span></div>
            <div className="row"><span className="lbl">Quantity</span><span className="val">× {order.quantity}</span></div>
            <div className="row"><span className="lbl">Spice</span><span className="val">{SPICES.find((s) => s.id === order.spice_option)?.label || order.spice_option}</span></div>
            <div className="row"><span className="lbl">Egg</span><span className="val">{EGGS.find((e) => e.id === order.egg_option)?.label || order.egg_option}</span></div>
            {order.add_ons?.length > 0 && <div className="row"><span className="lbl">Add-ons</span><span className="val">{order.add_ons.join(", ")}</span></div>}
            {order.note && <div className="row"><span className="lbl">Note</span><span className="val">{order.note}</span></div>}
            <div className="row"><span className="lbl">Paid</span><span className="val" style={{ color: "var(--fire)", fontFamily: "var(--font-h)", fontSize: 18 }}>{fmt(order.total_price)}</span></div>
            <div className="row"><span className="lbl">Paid at</span><span className="val">{fmtTime(order.payment_time)}</span></div>
          </div>
        )}

        {tab === "messages" && (
          <div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Chat directly with Joy's Kitchen</p>
            <MessageThread orderId={orderId} role="customer" />
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

// ─── VENDOR PAGES ─────────────────────────────────────────────────────────────
function VendorLogin({ nav, toast }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const attempt = () => {
    if (pin === VENDOR_PIN) {
      sessionStorage.setItem("vendor_auth", "true");
      nav("vendor_queue");
    } else {
      setError(true);
      toast("Wrong PIN. Try again.", "❌");
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>👨‍🍳</div>
          <h1 style={{ fontFamily: "var(--font-h)", color: "#fff", fontSize: 30, fontWeight: 800 }}>Vendor Login</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 6 }}>Joy's Kitchen Dashboard</p>
        </div>

        <div className="card fade-up-1" style={{ padding: 28 }}>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Vendor PIN</label>
            <input
              type="password" value={pin} onChange={(e) => { setPin(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && attempt()}
              placeholder="Enter PIN"
              style={{ fontSize: 22, letterSpacing: 6, textAlign: "center", borderColor: error ? "var(--fire)" : "var(--border)" }}
            />
            {error && <p style={{ color: "var(--fire)", fontSize: 12, marginTop: 6 }}>Incorrect PIN</p>}
          </div>
          <button className="btn btn-fire btn-full" onClick={attempt} style={{ padding: 15 }}>
            Login →
          </button>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 11, marginTop: 14 }}>Default demo PIN: 1234</p>
        </div>

        <button onClick={() => nav("home")} className="btn btn-ghost" style={{ width: "100%", marginTop: 16, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          ← Back to Customer App
        </button>
      </div>
    </div>
  );
}

function VendorNav({ current, nav, logout }) {
  return (
    <nav className="bottom-nav">
      {[
        { id: "vendor_queue", icon: "📋", label: "Queue" },
        { id: "vendor_dashboard", icon: "📊", label: "Dashboard" },
        { id: "vendor_sales", icon: "💰", label: "Sales" },
      ].map((item) => (
        <button key={item.id} onClick={() => nav(item.id)} className={current === item.id ? "active" : ""}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
      <button onClick={logout} style={{ color: "rgba(255,255,255,0.25)" }}>
        <span style={{ fontSize: 20 }}>🚪</span>
        Logout
      </button>
    </nav>
  );
}

function VendorQueuePage({ nav, toast, activePage }) {
  const queue = useVendorQueue();
  const [sound] = useState(() => {
    try { return new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2UyESZjpNLlsWQlAiVnp9rpvHAtACpnptzpwXMzACtrp93px3Y4ACxxqODpx3s+ADB2refmyX9DADd9re/nyIJIAD6Dsvfmyn9MAEV");
    } catch { return null; }
  });
  const prevLen = useRef(0);

  useEffect(() => {
    if (queue.length > prevLen.current) {
      toast(`New order from ${queue[queue.length - 1]?.customer_name}!`, "🔔");
      sound?.play().catch(() => {});
    }
    prevLen.current = queue.length;
  }, [queue.length, queue, toast, sound]);

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner" style={{ maxWidth: 900 }}>
          <div style={{ flex: 1 }}>
            <h1>Order Queue</h1>
            <div className="sub">First paid → first prepared · {queue.length} active</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {queue.length > 0 && <span className="badge" style={{ background: "var(--fire)", color: "#fff", fontSize: 12, padding: "5px 12px" }} className="pulse-ring">{queue.length} orders</span>}
          </div>
        </div>
      </div>

      <div className="wrap-wide" style={{ paddingTop: 20 }}>
        {queue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🍜</div>
            <h2 style={{ fontFamily: "var(--font-h)", fontSize: 22, color: "var(--muted)", fontWeight: 700 }}>Queue is clear!</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>New paid orders will appear here automatically.</p>
          </div>
        ) : (
          queue.map((order, i) => (
            <div key={order.id} className="vendor-card fade-up" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => nav("vendor_order", { orderId: order.id })}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ textAlign: "center", minWidth: 52 }}>
                  <div className="order-no">#{i + 1}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: -4 }}>in queue</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-h)", fontSize: 18, fontWeight: 800 }}>{order.customer_name}</span>
                    <StatusBadge status={order.order_status} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
                    {[
                      ["🍜", MENU.find((m) => m.id === order.noodle_type)?.name || order.noodle_name],
                      ["🔢", `× ${order.quantity}`],
                      ["🌶️", SPICES.find((s) => s.id === order.spice_option)?.label || order.spice_option],
                      ["🥚", EGGS.find((e) => e.id === order.egg_option)?.label || order.egg_option],
                    ].map(([ic, val]) => (
                      <div key={ic} style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{ic}</span><span style={{ color: "var(--ink)", fontWeight: 600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    <span style={{ fontFamily: "var(--font-h)", fontSize: 20, fontWeight: 800, color: "var(--fire)" }}>{fmt(order.total_price)}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Paid {fmtTime(order.payment_time)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <VendorNav current="vendor_queue" nav={nav} logout={() => { sessionStorage.removeItem("vendor_auth"); nav("home"); }} />
    </div>
  );
}

function VendorDashboardPage({ nav, toast }) {
  const queue = useVendorQueue();
  const allOrders = useAllOrders();
  const today = allOrders.filter((o) => {
    if (!o.payment_time) return false;
    const d = o.payment_time.toDate ? o.payment_time.toDate() : new Date();
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  });
  const todaySales = today.reduce((s, o) => s + (o.total_price || 0), 0);

  const stats = [
    { label: "Active Queue", value: queue.length, icon: "📋", color: "#2563eb" },
    { label: "Orders Today", value: today.length, icon: "📦", color: "var(--fire)" },
    { label: "Sales Today", value: fmt(todaySales), icon: "💰", color: "#059669" },
    { label: "All-time Orders", value: allOrders.length, icon: "📊", color: "#7c3aed" },
  ];

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner" style={{ maxWidth: 900 }}>
          <div>
            <h1>Dashboard</h1>
            <div className="sub">Joy's Kitchen Overview</div>
          </div>
        </div>
      </div>

      <div className="wrap-wide" style={{ paddingTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.label} className="card fade-up" style={{ padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-h)", fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Queue preview */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Active Queue</p>
            <button onClick={() => nav("vendor_queue")} className="btn btn-out btn-sm">View All</button>
          </div>
          {queue.length === 0 && <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>No active orders</p>}
          {queue.slice(0, 3).map((o, i) => (
            <div key={o.id} onClick={() => nav("vendor_order", { orderId: o.id })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
              <span style={{ fontFamily: "var(--font-h)", fontSize: 22, fontWeight: 800, color: "var(--fire)", minWidth: 30 }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.customer_name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{MENU.find((m) => m.id === o.noodle_type)?.name} · {fmtTime(o.payment_time)}</div>
              </div>
              <StatusBadge status={o.order_status} />
            </div>
          ))}
        </div>
      </div>
      <VendorNav current="vendor_dashboard" nav={nav} logout={() => { sessionStorage.removeItem("vendor_auth"); nav("home"); }} />
    </div>
  );
}

function VendorOrderPage({ nav, orderId, toast }) {
  const order = useOrder(orderId);
  const [updating, setUpdating] = useState(false);
  const [tab, setTab] = useState("details");

  if (!order) return <div className="spinner" />;

  const changeStatus = async (status) => {
    setUpdating(true);
    await updateStatus(orderId, status);
    toast(`Status updated: ${STATUS_INFO[status]?.label}`, "✅");
    setUpdating(false);
  };

  const nextStatuses = {
    paid: [{ s: "preparing", label: "Start Preparing 🍳", color: "#7c3aed" }],
    preparing: [{ s: "ready", label: "Mark as Ready 🎉", color: "#059669" }],
    ready: [{ s: "completed", label: "Complete Order ✅", color: "#6b7280" }],
  };

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner" style={{ maxWidth: 900 }}>
          <button onClick={() => nav("vendor_queue")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}>←</button>
          <div>
            <h1>{order.customer_name}'s Order</h1>
            <div className="sub">#{shortId(orderId)} · {fmtTime(order.payment_time)}</div>
          </div>
        </div>
      </div>

      <div className="wrap-wide" style={{ paddingTop: 20, paddingBottom: 100 }}>
        {/* Status + action */}
        <div className="card fade-up" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <StatusBadge status={order.order_status} large />
            <span style={{ fontFamily: "var(--font-h)", fontSize: 22, fontWeight: 800, color: "var(--fire)" }}>{fmt(order.total_price)}</span>
          </div>
          {nextStatuses[order.order_status]?.map(({ s, label, color }) => (
            <button key={s} className="btn btn-full" disabled={updating} onClick={() => changeStatus(s)}
              style={{ background: color, color: "#fff", padding: 14, fontSize: 15, marginBottom: 8 }}>
              {updating ? "Updating…" : label}
            </button>
          ))}
          {["cancelled", "completed"].includes(order.order_status) && (
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>This order is {order.order_status}.</p>
          )}
          {order.order_status !== "cancelled" && !["completed"].includes(order.order_status) && (
            <button className="btn btn-full btn-ghost btn-sm" disabled={updating} onClick={() => changeStatus("cancelled")} style={{ color: "#ef4444", marginTop: 4 }}>
              Cancel Order
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--warm)", borderRadius: 12, padding: 4 }}>
          {["details", "messages"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t ? "#fff" : "transparent", color: tab === t ? "var(--fire)" : "var(--muted)", fontWeight: 700, fontSize: 12, textTransform: "capitalize", fontFamily: "var(--font-b)", transition: "all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="card" style={{ padding: 20 }}>
            <div className="row"><span className="lbl">Customer</span><span className="val">{order.customer_name}</span></div>
            {order.customer_phone && <div className="row"><span className="lbl">Phone</span><span className="val">{order.customer_phone}</span></div>}
            <div className="row"><span className="lbl">Noodle</span><span className="val">{MENU.find((m) => m.id === order.noodle_type)?.name}</span></div>
            <div className="row"><span className="lbl">Qty</span><span className="val">× {order.quantity}</span></div>
            <div className="row"><span className="lbl">Spice</span><span className="val">{SPICES.find((s) => s.id === order.spice_option)?.label}</span></div>
            <div className="row"><span className="lbl">Egg</span><span className="val">{EGGS.find((e) => e.id === order.egg_option)?.label}</span></div>
            {order.add_ons?.length > 0 && <div className="row"><span className="lbl">Add-ons</span><span className="val">{order.add_ons.map((id) => ADDONS.find((a) => a.id === id)?.label || id).join(", ")}</span></div>}
            {order.note && <div className="row"><span className="lbl">Note 📝</span><span className="val" style={{ color: "var(--fire)", fontStyle: "italic" }}>{order.note}</span></div>}
            <div className="row"><span className="lbl">Paid</span><span className="val" style={{ fontFamily: "var(--font-h)", fontSize: 18, color: "var(--fire)" }}>{fmt(order.total_price)}</span></div>
            <div className="row"><span className="lbl">Payment Time</span><span className="val">{fmtTime(order.payment_time)}</span></div>
          </div>
        )}

        {tab === "messages" && (
          <div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Message {order.customer_name}</p>
            <MessageThread orderId={orderId} role="vendor" />
          </div>
        )}
      </div>
      <VendorNav current="vendor_queue" nav={nav} logout={() => { sessionStorage.removeItem("vendor_auth"); nav("home"); }} />
    </div>
  );
}

function VendorSalesPage({ nav, toast }) {
  const allOrders = useAllOrders();
  const paid = allOrders.filter((o) => o.payment_status === "paid");
  const today = new Date();
  const todayOrders = paid.filter((o) => {
    if (!o.payment_time) return false;
    const d = o.payment_time.toDate ? o.payment_time.toDate() : new Date(0);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const totalToday = todayOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalAll = paid.reduce((s, o) => s + (o.total_price || 0), 0);

  return (
    <div className="page" style={{ background: "var(--cream)" }}>
      <div className="topbar">
        <div className="topbar-inner" style={{ maxWidth: 900 }}>
          <div><h1>Sales History</h1><div className="sub">Joy's Kitchen earnings</div></div>
        </div>
      </div>

      <div className="wrap-wide" style={{ paddingTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Today's Revenue", value: fmt(totalToday), sub: `${todayOrders.length} orders`, icon: "📅", bg: "#d1fae5", color: "#059669" },
            { label: "All-time Revenue", value: fmt(totalAll), sub: `${paid.length} orders`, icon: "💰", bg: "#dbeafe", color: "#2563eb" },
          ].map((s) => (
            <div key={s.label} className="fade-up" style={{ background: s.bg, borderRadius: 16, padding: "18px 16px", border: `1.5px solid ${s.color}30` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-h)", fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 3 }}>{s.sub}</div>
              <div style={{ fontSize: 11, color: s.color, opacity: 0.7 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Recent Orders</p>
          {allOrders.slice(0, 20).map((o, i) => (
            <div key={o.id} onClick={() => nav("vendor_order", { orderId: o.id })}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < 19 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{o.customer_name}</span>
                  <StatusBadge status={o.order_status} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {MENU.find((m) => m.id === o.noodle_type)?.name} · {fmtTime(o.payment_time || o.created_at)}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-h)", fontWeight: 800, color: o.payment_status === "paid" ? "var(--fire)" : "var(--muted)" }}>
                {o.payment_status === "paid" ? fmt(o.total_price) : "Unpaid"}
              </span>
            </div>
          ))}
          {allOrders.length === 0 && <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>No orders yet</p>}
        </div>
      </div>
      <VendorNav current="vendor_sales" nav={nav} logout={() => { sessionStorage.removeItem("vendor_auth"); nav("home"); }} />
    </div>
  );
}

// ─── MAIN APP ROUTER ──────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [params, setParams] = useState({});
  const [vendorAuth, setVendorAuth] = useState(() => sessionStorage.getItem("vendor_auth") === "true");
  const { show: toast, ToastContainer } = useToast();

  const nav = useCallback((target, p = {}) => {
    // Guard vendor pages
    if (target.startsWith("vendor_") && target !== "vendor_login") {
      if (!sessionStorage.getItem("vendor_auth")) { setPage("vendor_login"); return; }
    }
    setPage(target); setParams(p);
    window.scrollTo(0, 0);
  }, []);

  const savedOrderId = localStorage.getItem("last_order_id");

  // Customer bottom nav
  const CustomerBottomNav = () => (
    <nav className="bottom-nav">
      {[
        { id: "home", icon: "🏠", label: "Home" },
        { id: "menu", icon: "🍜", label: "Menu" },
        ...(savedOrderId ? [{ id: "order", icon: "📦", label: "My Order", orderId: savedOrderId }] : []),
        { id: "vendor_login", icon: "👨‍🍳", label: "Vendor" },
      ].map((item) => (
        <button key={item.id} onClick={() => nav(item.id, item.orderId ? { orderId: item.orderId } : {})}
          className={page === item.id ? "active" : ""}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );

  const pageProps = { nav, toast, orderId: params.orderId, noodleId: params.noodleId };

  return (
    <>
      <style>{STYLES}</style>
      <ToastContainer />

      {page === "home"            && <><HomePage {...pageProps} savedOrderId={savedOrderId} /><CustomerBottomNav /></>}
      {page === "menu"            && <><MenuPage {...pageProps} /><CustomerBottomNav /></>}
      {page === "customize"       && <CustomizePage {...pageProps} />}
      {page === "payment"         && <PaymentPage {...pageProps} />}
      {page === "order"           && <OrderStatusPage {...pageProps} />}

      {page === "vendor_login"    && <VendorLogin {...pageProps} />}
      {page === "vendor_queue"    && <VendorQueuePage {...pageProps} activePage={page} />}
      {page === "vendor_dashboard"&& <VendorDashboardPage {...pageProps} />}
      {page === "vendor_order"    && <VendorOrderPage {...pageProps} />}
      {page === "vendor_sales"    && <VendorSalesPage {...pageProps} />}
    </>
  );
}