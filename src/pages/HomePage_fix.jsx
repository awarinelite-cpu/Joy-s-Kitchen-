// ══════════════════════════════════════════════════════════
// STEP 1: Add this line near the top of App.jsx,
//         right after your imports, before const MENU = [
// ══════════════════════════════════════════════════════════

const NOODLE_BG = "/NOODLES_images.jpg";
// ^ Put the image file in your /public folder in your project.
//   If using Vite, any file in /public is served at the root URL.
//   Upload NOODLES_images.jpg to: your-project/public/NOODLES_images.jpg

// ══════════════════════════════════════════════════════════
// STEP 2: Replace your entire HomePage function with this:
// ══════════════════════════════════════════════════════════

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

      {/* Dark overlay — fades from semi-dark at top to nearly solid at bottom */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.68) 40%, rgba(14,9,5,0.96) 100%)",
      }} />

      {/* All content sits on top */}
      <div style={{ position: "relative", zIndex: 2, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* ── Hero ── */}
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

        {/* ── Stats strip ── */}
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

        {/* ── Menu preview ── */}
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
