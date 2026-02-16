import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#0B0F1A",
  surface: "#111827",
  surfaceLight: "#1A2236",
  accent: "#00D4AA",
  accentDim: "rgba(0,212,170,0.12)",
  accentGlow: "rgba(0,212,170,0.3)",
  danger: "#FF4757",
  dangerDim: "rgba(255,71,87,0.12)",
  warning: "#FFB830",
  warningDim: "rgba(255,184,48,0.12)",
  text: "#E8ECF1",
  textMuted: "#7B8CA8",
  border: "#1E2A3F",
  borderLight: "#2A3A52",
};

const platformIcons = {
  Telegram: "💬",
  "Google Search": "🔍",
  "Torrent Site": "🏴‍☠️",
  Cyberlocker: "📦",
  "File Share": "📁",
  Discord: "🎮",
  "Pirate Forum": "🕸️",
  "Social Media": "📱",
};

const riskColors = {
  Critical: COLORS.danger,
  High: "#FF6B35",
  Medium: COLORS.warning,
  Low: COLORS.textMuted,
};

const generateScanResults = (productName, productPrice) => {
  const templates = [
    { platform: "Telegram", type: "Channel", risk: "Critical", source: `t.me/free_${productName.toLowerCase().replace(/\s/g, "_")}_download`, viewers: "12,400 members", est: Math.floor(productPrice * 0.35 * 124) },
    { platform: "Telegram", type: "Group", risk: "Critical", source: `t.me/premium_courses_leaked`, viewers: "45,200 members", est: Math.floor(productPrice * 0.15 * 452) },
    { platform: "Telegram", type: "Bot", risk: "High", source: `t.me/coursedl_bot`, viewers: "8,300 users", est: Math.floor(productPrice * 0.2 * 83) },
    { platform: "Google Search", type: "Indexed Page", risk: "High", source: `freedownload-hub.cc/${productName.toLowerCase().replace(/\s/g, "-")}`, viewers: "~2,100 visits/mo", est: Math.floor(productPrice * 0.25 * 21) },
    { platform: "Google Search", type: "Indexed Page", risk: "Medium", source: `getitfree.to/courses/${productName.toLowerCase().replace(/\s/g, "-")}`, viewers: "~890 visits/mo", est: Math.floor(productPrice * 0.2 * 9) },
    { platform: "Cyberlocker", type: "Direct Download", risk: "High", source: `megaupload.nz/file/${Math.random().toString(36).substring(7)}`, viewers: "1,340 downloads", est: Math.floor(productPrice * 0.3 * 13) },
    { platform: "Torrent Site", type: "Torrent", risk: "Medium", source: `1337x.to/torrent/${Math.floor(Math.random() * 999999)}`, viewers: "267 seeders", est: Math.floor(productPrice * 0.4 * 3) },
    { platform: "Discord", type: "Server", risk: "High", source: `discord.gg/freecourses2026`, viewers: "6,800 members", est: Math.floor(productPrice * 0.1 * 68) },
    { platform: "Pirate Forum", type: "Forum Post", risk: "Medium", source: `blackhatworld.com/threads/${Math.floor(Math.random() * 99999)}`, viewers: "3,200 views", est: Math.floor(productPrice * 0.15 * 32) },
    { platform: "Social Media", type: "Post/Reel", risk: "Low", source: `tiktok.com/@freecourselinks`, viewers: "18K views", est: Math.floor(productPrice * 0.02 * 180) },
  ];
  const count = 4 + Math.floor(Math.random() * 5);
  const shuffled = templates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

function GlowButton({ children, onClick, variant = "primary", size = "md", disabled = false, style = {} }) {
  const base = {
    border: "none",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s ease",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...style,
  };
  const sizes = {
    sm: { padding: "8px 16px", fontSize: 13 },
    md: { padding: "12px 24px", fontSize: 14 },
    lg: { padding: "16px 32px", fontSize: 16 },
  };
  const variants = {
    primary: { background: COLORS.accent, color: "#0B0F1A", boxShadow: `0 0 20px ${COLORS.accentGlow}` },
    secondary: { background: "transparent", color: COLORS.accent, border: `1px solid ${COLORS.accent}`, boxShadow: "none" },
    danger: { background: COLORS.danger, color: "#fff", boxShadow: `0 0 20px rgba(255,71,87,0.3)` },
    ghost: { background: "transparent", color: COLORS.textMuted, boxShadow: "none" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant] }}>
      {children}
    </button>
  );
}

function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${glow ? COLORS.accent : COLORS.border}`,
      borderRadius: 12,
      padding: 24,
      boxShadow: glow ? `0 0 30px ${COLORS.accentDim}` : "0 2px 8px rgba(0,0,0,0.3)",
      transition: "all 0.3s ease",
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color = COLORS.accent }) {
  return (
    <Card style={{ textAlign: "center", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function ScanAnimation({ progress, phase }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke={COLORS.border} strokeWidth="4" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={COLORS.accent} strokeWidth="4"
            strokeDasharray={`${progress * 3.39} 339.292`} strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 0.5s ease" }} />
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 24, fontWeight: 700, color: COLORS.accent, fontFamily: "'DM Sans', sans-serif" }}>
          {progress}%
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
        {phase}
      </div>
      <div style={{ fontSize: 13, color: COLORS.textMuted, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
        Scanning across Telegram channels, Google indexed pages, cyberlockers, torrent sites, and file-sharing platforms...
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
        {["Telegram", "Google", "Cyberlockers", "Torrents", "Discord", "Forums"].map((p, i) => (
          <div key={p} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: progress > (i + 1) * 14 ? COLORS.accentDim : "rgba(255,255,255,0.03)",
            color: progress > (i + 1) * 14 ? COLORS.accent : COLORS.textMuted,
            border: `1px solid ${progress > (i + 1) * 14 ? COLORS.accent + "44" : COLORS.border}`,
            transition: "all 0.5s ease",
          }}>
            {progress > (i + 1) * 14 ? "✓ " : ""}{p}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfringementRow({ result, index, onTakedown }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("active");
  
  const handleTakedown = () => {
    setStatus("pending");
    onTakedown(index);
    setTimeout(() => setStatus("sent"), 1500);
  };

  return (
    <div style={{
      background: expanded ? COLORS.surfaceLight : "transparent",
      borderRadius: 8, padding: "14px 16px",
      border: `1px solid ${expanded ? COLORS.borderLight : "transparent"}`,
      transition: "all 0.2s ease",
      cursor: "pointer",
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20, width: 32, textAlign: "center" }}>{platformIcons[result.platform] || "🌐"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>{result.platform}</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
              background: riskColors[result.risk] + "22", color: riskColors[result.risk],
            }}>{result.risk}</span>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{result.type}</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {result.source}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 90 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.danger, fontFamily: "'DM Sans', sans-serif" }}>
            -${result.est.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>est. lost revenue</div>
        </div>
        <span style={{ color: COLORS.textMuted, fontSize: 12, marginLeft: 4, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 13, color: COLORS.textMuted }}>
            <div><strong style={{ color: COLORS.text }}>Audience:</strong> {result.viewers}</div>
            <div style={{ marginTop: 4 }}><strong style={{ color: COLORS.text }}>Detected:</strong> {new Date().toLocaleDateString()}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {status === "active" && (
              <>
                <GlowButton size="sm" onClick={handleTakedown}>⚡ Send DMCA Takedown</GlowButton>
                <GlowButton size="sm" variant="secondary">📄 Cease & Desist</GlowButton>
              </>
            )}
            {status === "pending" && (
              <span style={{ fontSize: 13, color: COLORS.warning, fontWeight: 600 }}>⏳ Generating notice...</span>
            )}
            {status === "sent" && (
              <span style={{ fontSize: 13, color: COLORS.accent, fontWeight: 600 }}>✅ DMCA Notice Sent — Tracking removal</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductGuardMVP() {
  const [screen, setScreen] = useState("landing");
  const [product, setProduct] = useState({ name: "", url: "", price: "", type: "course", keywords: "" });
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState("");
  const [results, setResults] = useState([]);
  const [takedowns, setTakedowns] = useState(0);
  const scanRef = useRef(null);

  const startScan = () => {
    if (!product.name || !product.price) return;
    setScreen("scanning");
    setScanProgress(0);
    const phases = [
      [15, "Indexing product metadata..."],
      [30, "Scanning Telegram channels & groups..."],
      [50, "Searching Google indexed pages..."],
      [65, "Checking cyberlockers & file hosts..."],
      [80, "Scanning torrent sites..."],
      [90, "Analyzing Discord servers & forums..."],
      [100, "Compiling threat report..."],
    ];
    let i = 0;
    scanRef.current = setInterval(() => {
      if (i < phases.length) {
        setScanProgress(phases[i][0]);
        setScanPhase(phases[i][1]);
        i++;
      } else {
        clearInterval(scanRef.current);
        const r = generateScanResults(product.name, parseFloat(product.price) || 97);
        setResults(r);
        setTimeout(() => setScreen("results"), 600);
      }
    }, 800);
  };

  useEffect(() => () => { if (scanRef.current) clearInterval(scanRef.current); }, []);

  const totalLost = results.reduce((s, r) => s + r.est, 0);
  const criticalCount = results.filter(r => r.risk === "Critical").length;

  const productTypes = [
    { id: "course", label: "Online Course" },
    { id: "indicator", label: "Trading Indicator" },
    { id: "software", label: "Software / SaaS" },
    { id: "template", label: "Template / Asset" },
    { id: "ebook", label: "eBook / Guide" },
    { id: "other", label: "Other Digital Product" },
  ];

  // ===== LANDING =====
  if (screen === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `linear-gradient(135deg, ${COLORS.accent}, #00B894)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: COLORS.bg,
              }}>P</div>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>ProductGuard<span style={{ color: COLORS.accent }}>.ai</span></span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, margin: "0 0 12px", letterSpacing: -0.5 }}>
              Is someone stealing<br />your digital product?
            </h1>
            <p style={{ fontSize: 16, color: COLORS.textMuted, lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
              Run a free piracy scan to discover where your courses, indicators, software, and digital products are being shared illegally.
            </p>
          </div>

          {/* Form */}
          <Card glow style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Product Name *</label>
              <input
                value={product.name}
                onChange={e => setProduct({ ...product, name: e.target.value })}
                placeholder="e.g. The Complete Day Trading Masterclass"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 8,
                  background: COLORS.surfaceLight, border: `1px solid ${COLORS.borderLight}`,
                  color: COLORS.text, fontSize: 15, outline: "none", boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Product URL</label>
                <input
                  value={product.url}
                  onChange={e => setProduct({ ...product, url: e.target.value })}
                  placeholder="https://your-product-page.com"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 8,
                    background: COLORS.surfaceLight, border: `1px solid ${COLORS.borderLight}`,
                    color: COLORS.text, fontSize: 15, outline: "none", boxSizing: "border-box",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>
              <div style={{ minWidth: 130 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Price (USD) *</label>
                <input
                  value={product.price}
                  onChange={e => setProduct({ ...product, price: e.target.value })}
                  placeholder="$297"
                  type="number"
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 8,
                    background: COLORS.surfaceLight, border: `1px solid ${COLORS.borderLight}`,
                    color: COLORS.text, fontSize: 15, outline: "none", boxSizing: "border-box",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Product Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {productTypes.map(t => (
                  <button key={t.id} onClick={() => setProduct({ ...product, type: t.id })} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: "pointer", transition: "all 0.2s",
                    background: product.type === t.id ? COLORS.accentDim : "transparent",
                    color: product.type === t.id ? COLORS.accent : COLORS.textMuted,
                    border: `1px solid ${product.type === t.id ? COLORS.accent + "66" : COLORS.borderLight}`,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Keywords (comma-separated)</label>
              <input
                value={product.keywords}
                onChange={e => setProduct({ ...product, keywords: e.target.value })}
                placeholder="e.g. day trading, forex, scalping strategy"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 8,
                  background: COLORS.surfaceLight, border: `1px solid ${COLORS.borderLight}`,
                  color: COLORS.text, fontSize: 15, outline: "none", boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            <GlowButton size="lg" onClick={startScan} disabled={!product.name || !product.price} style={{ width: "100%" }}>
              🔍 Run Free Piracy Scan
            </GlowButton>
          </Card>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { icon: "💬", label: "Telegram Channels" },
              { icon: "🔍", label: "Google Indexed Pages" },
              { icon: "📦", label: "Cyberlockers" },
              { icon: "🏴‍☠️", label: "Torrent Sites" },
              { icon: "🎮", label: "Discord Servers" },
              { icon: "🕸️", label: "Pirate Forums" },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMuted }}>
                <span>{p.icon}</span> {p.label}
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: COLORS.textMuted, marginTop: 24, opacity: 0.6 }}>
            This is an interactive MVP prototype. Scan results are simulated for demonstration.
          </p>
        </div>
      </div>
    );
  }

  // ===== SCANNING =====
  if (screen === "scanning") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 20px" }}>
          <Card>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: COLORS.accent, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Scanning for: {product.name}</span>
            </div>
            <ScanAnimation progress={scanProgress} phase={scanPhase} />
          </Card>
        </div>
      </div>
    );
  }

  // ===== RESULTS =====
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${COLORS.accent}, #00B894)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: COLORS.bg,
            }}>P</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>ProductGuard<span style={{ color: COLORS.accent }}>.ai</span></span>
          </div>
          <GlowButton size="sm" variant="secondary" onClick={() => { setScreen("landing"); setResults([]); setScanProgress(0); }}>
            ← New Scan
          </GlowButton>
        </div>

        {/* Alert banner */}
        <Card glow style={{ marginBottom: 24, background: "linear-gradient(135deg, rgba(0,212,170,0.06), rgba(255,71,87,0.06))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 40 }}>🚨</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                Scan Complete: <span style={{ color: COLORS.danger }}>{results.length} Infringements Found</span>
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: COLORS.textMuted }}>
                <strong style={{ color: COLORS.text }}>{product.name}</strong> — We found unauthorized copies of your product across {new Set(results.map(r => r.platform)).size} platforms.
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Infringements" value={results.length} sub={`${criticalCount} critical`} color={COLORS.danger} />
          <StatCard label="Est. Revenue Loss" value={`$${totalLost.toLocaleString()}`} sub="based on your price" color={COLORS.danger} />
          <StatCard label="Platforms" value={new Set(results.map(r => r.platform)).size} sub="sources detected" />
          <StatCard label="Takedowns Sent" value={takedowns} sub="DMCA notices" color={takedowns > 0 ? COLORS.accent : COLORS.textMuted} />
        </div>

        {/* Results list */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Detected Infringements</h3>
            <GlowButton size="sm" onClick={() => {
              setTakedowns(results.length);
            }}>
              ⚡ Takedown All ({results.length})
            </GlowButton>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {results.map((r, i) => (
              <InfringementRow key={i} result={r} index={i} onTakedown={() => setTakedowns(t => t + 1)} />
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Card style={{ background: `linear-gradient(135deg, ${COLORS.surfaceLight}, ${COLORS.surface})`, textAlign: "center" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>Protect {product.name} 24/7</h3>
          <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            This was a one-time scan. Pirates re-upload constantly. Upgrade to automated daily monitoring with instant takedowns starting at $29/month.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <GlowButton size="md">🛡️ Start Monitoring — $29/mo</GlowButton>
            <GlowButton size="md" variant="secondary">Compare Plans</GlowButton>
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            {["Daily automated scans", "1-click DMCA takedowns", "Revenue impact reports"].map(f => (
              <span key={f} style={{ fontSize: 12, color: COLORS.textMuted }}>✓ {f}</span>
            ))}
          </div>
        </Card>

        <p style={{ textAlign: "center", fontSize: 11, color: COLORS.textMuted, marginTop: 20, opacity: 0.5 }}>
          ProductGuard.ai MVP Prototype — Scan results are simulated for demonstration purposes
        </p>
      </div>
    </div>
  );
}
