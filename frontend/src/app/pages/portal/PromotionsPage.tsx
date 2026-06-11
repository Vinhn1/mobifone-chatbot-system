import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Zap, Flame, Clock, TrendingUp, Tag, ArrowRight } from "lucide-react";

function useCountdown(targetSeconds: number) {
  const [timeLeft, setTimeLeft] = useState(targetSeconds);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  return { h, m, s, done: timeLeft === 0 };
}

function CountdownTimer({ seconds }: { seconds: number }) {
  const { h, m, s, done } = useCountdown(seconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {[pad(h), pad(m), pad(s)].map((val, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 36, height: 36, borderRadius: 8,
              background: "rgba(0,0,0,0.08)",
              color: done ? "#EF4444" : "#0F172A",
              fontWeight: 800, fontSize: 16,
              fontFamily: "'Outfit', sans-serif",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {val}
          </span>
          {i < 2 && <span style={{ color: "#94A3B8", fontWeight: 700, fontSize: 16 }}>:</span>}
        </span>
      ))}
    </div>
  );
}

function SoldProgress({ pct }: { pct: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: "#64748B", fontSize: 12, fontWeight: 500 }}>Đã bán</span>
        <span style={{ color: pct > 80 ? "#EF4444" : "#F39C12", fontSize: 12, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            height: "100%",
            borderRadius: 3,
            background: pct > 80
              ? "linear-gradient(90deg, #EF4444, #DC2626)"
              : "linear-gradient(90deg, #F39C12, #FF5722)",
          }}
        />
      </div>
    </div>
  );
}

const DEALS = [
  {
    badge: "FLASH SALE", badgeColor: "#EF4444",
    icon: "⚡", name: "TK199 Super", category: "Data",
    originalPrice: "199.000đ", discountedPrice: "139.000đ", discount: "30%",
    data: "6GB/ngày · 30 ngày", features: ["Gọi miễn phí mọi mạng", "Roaming ASEAN", "TV360"],
    color: "#EF4444", secondsLeft: 3 * 3600 + 45 * 60 + 20, soldPct: 87,
  },
  {
    badge: "HOT DEAL", badgeColor: "#F39C12",
    icon: "🎁", name: "TK135 Plus", category: "Data",
    originalPrice: "135.000đ", discountedPrice: "99.000đ", discount: "27%",
    data: "4GB/ngày · 30 ngày", features: ["Nội mạng miễn phí", "20p ngoại mạng", "5G Ready"],
    color: "#F39C12", secondsLeft: 8 * 3600 + 12 * 60 + 5, soldPct: 64,
  },
  {
    badge: "eSIM PROMO", badgeColor: "#0055A5",
    icon: "📱", name: "eSIM Premium", category: "eSIM",
    originalPrice: "135.000đ", discountedPrice: "Free", discount: "100%",
    data: "10GB · 30 ngày", features: ["Phí kích hoạt miễn phí", "Chuyển từ SIM vật lý", "5G Ready"],
    color: "#0055A5", secondsLeft: 24 * 3600, soldPct: 41,
  },
  {
    badge: "MEMBER VIP", badgeColor: "#A855F7",
    icon: "👑", name: "MAX299 Elite", category: "Unlimited",
    originalPrice: "299.000đ", discountedPrice: "199.000đ", discount: "33%",
    data: "Không giới hạn · 30 ngày", features: ["Tất cả mạng miễn phí", "Roaming 10 nước", "Cloud 50GB"],
    color: "#A855F7", secondsLeft: 12 * 3600 + 30 * 60, soldPct: 29,
  },
  {
    badge: "STUDENT", badgeColor: "#22C55E",
    icon: "🎓", name: "S49 Sinh viên", category: "Data",
    originalPrice: "79.000đ", discountedPrice: "49.000đ", discount: "38%",
    data: "500MB/ngày · 30 ngày", features: ["4G LTE", "Dành cho sinh viên", "SMS miễn phí"],
    color: "#22C55E", secondsLeft: 36 * 3600, soldPct: 52,
  },
  {
    badge: "BUNDLE", badgeColor: "#06B6D4",
    icon: "📦", name: "Smart Bundle", category: "Voice + Data",
    originalPrice: "250.000đ", discountedPrice: "175.000đ", discount: "30%",
    data: "3GB/ngày + 1000p gọi · 30 ngày", features: ["Nội + ngoại mạng", "SMS 500 tin", "MobiFone TV+"],
    color: "#06B6D4", secondsLeft: 5 * 3600 + 20 * 60, soldPct: 73,
  },
];

export function PromotionsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();
  const { h, m, s } = useCountdown(23 * 3600 + 59 * 60 + 59);

  const categories = ["all", "Data", "eSIM", "Unlimited", "Voice + Data"];
  const filtered = activeCategory === "all" ? DEALS : DEALS.filter(d => d.category === activeCategory);

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Hero banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #7C1010 0%, #B91C1C 30%, #001F3F 70%, #001F3F 100%)",
          padding: "100px 0 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative elements */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: 100, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,156,18,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 20, padding: "4px 14px", marginBottom: 16 }}>
              <Flame size={13} color="#FCA5A5" />
              <span style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 600 }}>Flash Deals · Hôm nay</span>
            </div>
            <h1 style={{ color: "white", fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: 10 }}>
              Ưu đãi{" "}
              <span style={{ background: "linear-gradient(90deg,#F39C12,#FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                SỐC
              </span>{" "}
              hôm nay
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, marginBottom: 28 }}>
              Chương trình kết thúc sau:
            </p>

            {/* Big countdown */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>
              {[{ v: String(h).padStart(2,"0"), l: "Giờ" }, { v: String(m).padStart(2,"0"), l: "Phút" }, { v: String(s).padStart(2,"0"), l: "Giây" }].map(({ v, l }) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 72, height: 72, borderRadius: 16,
                      background: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: "2.2rem", fontWeight: 900,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    }}
                  >
                    {v}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 6, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 64, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 4, padding: "10px 0", overflowX: "auto" }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: "7px 16px", borderRadius: 10,
                  border: `1.5px solid ${activeCategory === cat ? "#EF4444" : "#E2E8F0"}`,
                  background: activeCategory === cat ? "#FEF2F2" : "white",
                  color: activeCategory === cat ? "#EF4444" : "#64748B",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
                }}
              >
                {cat === "all" ? "Tất cả ưu đãi" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deal cards */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {filtered.map((deal, i) => (
            <motion.div
              key={deal.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                background: "white",
                borderRadius: 20,
                overflow: "hidden",
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                transition: "all 0.3s",
              }}
              whileHover={{ y: -4, boxShadow: `0 16px 40px ${deal.color}18, 0 2px 12px rgba(0,0,0,0.06)` }}
            >
              {/* Card top */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${deal.color}18 0%, ${deal.color}08 100%)`,
                  borderBottom: `2px solid ${deal.color}20`,
                  padding: "20px 20px 16px",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `${deal.color}18`,
                        border: `1.5px solid ${deal.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {deal.icon}
                    </div>
                    <div>
                      <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 17 }}>{deal.name}</div>
                      <div style={{ color: "#64748B", fontSize: 12 }}>{deal.category}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span
                      style={{
                        background: deal.badgeColor,
                        color: "white", borderRadius: 8,
                        padding: "3px 10px", fontSize: 10, fontWeight: 800,
                        letterSpacing: 0.5,
                      }}
                    >
                      {deal.badge}
                    </span>
                    <span
                      style={{
                        background: "#DCFCE7", color: "#16A34A",
                        borderRadius: 8, padding: "2px 8px",
                        fontSize: 11, fontWeight: 700,
                      }}
                    >
                      -{deal.discount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "16px 20px 20px" }}>
                {/* Price */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: deal.color, fontSize: "1.7rem", fontWeight: 900 }}>{deal.discountedPrice}</span>
                  <span style={{ color: "#94A3B8", fontSize: 14, textDecoration: "line-through" }}>{deal.originalPrice}</span>
                </div>
                <div style={{ color: "#64748B", fontSize: 13, marginBottom: 14 }}>{deal.data}</div>

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                  {deal.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${deal.color}18`, border: `1px solid ${deal.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: deal.color, fontSize: 8 }}>✓</span>
                      </div>
                      <span style={{ color: "#475569", fontSize: 13 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Countdown + sold progress */}
                <div
                  style={{
                    background: "#F8FAFC", borderRadius: 12,
                    padding: "12px 14px", marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Clock size={13} style={{ color: "#EF4444" }} />
                    <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 600 }}>Kết thúc sau:</span>
                    <div style={{ marginLeft: "auto" }}>
                      <CountdownTimer seconds={deal.secondsLeft} />
                    </div>
                  </div>
                  <SoldProgress pct={deal.soldPct} />
                </div>

                <button
                  onClick={() => navigate("/login")}
                  style={{
                    width: "100%", padding: "11px",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${deal.color}, ${deal.color}CC)`,
                    border: "none",
                    color: "white", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    boxShadow: `0 4px 16px ${deal.color}40`,
                    transition: "all 0.2s",
                  }}
                >
                  Lấy ưu đãi ngay <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
