import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Wifi, Phone, Zap, Globe, Star, Check, Filter, Search } from "lucide-react";

type Category = "all" | "data" | "voice" | "unlimited";

const PACKAGES = [
  { id: "TK79", name: "TK79", price: "79.000đ", data: "2GB/ngày", voice: "30p/ngày", validity: "30 ngày", category: "data" as const, features: ["4G LTE", "SMS miễn phí", "MobiFone TV"], color: "#64748B", popular: false },
  { id: "TK99", name: "TK99", price: "99.000đ", data: "3GB/ngày", voice: "Nội mạng miễn phí", validity: "30 ngày", category: "data" as const, features: ["5G Ready", "SMS miễn phí", "MobiFone TV"], color: "#0055A5", popular: false },
  { id: "TK135", name: "TK135", price: "135.000đ", data: "4GB/ngày", voice: "Nội mạng miễn phí + 20p ngoại mạng", validity: "30 ngày", category: "data" as const, features: ["5G Ready", "SMS miễn phí", "MobiFone TV+", "Cloud 5GB"], color: "#F39C12", popular: true },
  { id: "TK199", name: "TK199", price: "199.000đ", data: "6GB/ngày", voice: "Tất cả mạng miễn phí", validity: "30 ngày", category: "unlimited" as const, features: ["5G Ultra", "Roaming ASEAN", "TV360 1 tháng", "Cloud 20GB"], color: "#A855F7", popular: false },
  { id: "V90", name: "V90", price: "90.000đ", data: "1GB/ngày", voice: "1000p nội mạng", validity: "30 ngày", category: "voice" as const, features: ["4G LTE", "SMS 500 tin"], color: "#22C55E", popular: false },
  { id: "V150", name: "V150", price: "150.000đ", data: "2GB/ngày", voice: "Không giới hạn nội mạng", validity: "30 ngày", category: "voice" as const, features: ["5G Ready", "SMS 1000 tin", "Gọi quốc tế -30%"], color: "#06B6D4", popular: false },
  { id: "MAX299", name: "MAX299", price: "299.000đ", data: "Không giới hạn", voice: "Tất cả mạng miễn phí", validity: "30 ngày", category: "unlimited" as const, features: ["5G Ultra", "Roaming 10 nước", "TV360", "Cloud 50GB", "Priority Support"], color: "#EF4444", popular: false },
  { id: "S49", name: "S49", price: "49.000đ", data: "500MB/ngày", voice: "10p/ngày", validity: "30 ngày", category: "data" as const, features: ["4G LTE", "Gói sinh viên"], color: "#8B5CF6", popular: false },
];

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Tất cả", icon: Filter },
  { key: "data", label: "Gói Data", icon: Wifi },
  { key: "voice", label: "Gói Gọi", icon: Phone },
  { key: "unlimited", label: "Không giới hạn", icon: Zap },
];

export function PackagesPage() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = PACKAGES.filter(p => {
    const matchCat = category === "all" || p.category === category;
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) || p.price.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #001F3F 0%, #00132A 100%)",
          padding: "100px 0 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,85,165,0.25) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ color: "#F39C12", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Gói cước</div>
          <h1 style={{ color: "white", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900, marginBottom: 14 }}>
            Tìm gói cước{" "}
            <span style={{ background: "linear-gradient(90deg,#F39C12,#FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              hoàn hảo
            </span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, marginBottom: 32 }}>
            Hơn {PACKAGES.length} gói cước linh hoạt, giá cả minh bạch
          </p>

          {/* Search */}
          <div style={{ maxWidth: 400, margin: "0 auto" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: 14, padding: "0 16px", height: 50,
              }}
            >
              <Search size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
              <input
                placeholder="Tìm gói cước (VD: TK135, 199k...)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "white", fontSize: 14, fontFamily: "'Outfit', sans-serif",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 64, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "12px 0" }}>
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                style={{
                  flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 10,
                  border: `1.5px solid ${category === key ? "#0055A5" : "#E2E8F0"}`,
                  background: category === key ? "#EFF6FF" : "white",
                  color: category === key ? "#0055A5" : "#64748B",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ color: "#94A3B8", fontSize: 13, display: "flex", alignItems: "center", flexShrink: 0 }}>
              {filtered.length} gói
            </div>
          </div>
        </div>
      </div>

      {/* Package grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {filtered.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: "white",
                border: pkg.popular ? `2px solid ${pkg.color}` : "1.5px solid #E2E8F0",
                borderRadius: 20,
                padding: 24,
                position: "relative",
                overflow: "hidden",
                boxShadow: pkg.popular ? `0 8px 32px ${pkg.color}22` : "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.3s",
                cursor: "pointer",
              }}
              whileHover={{ y: -4, boxShadow: `0 16px 40px ${pkg.color}22` }}
            >
              {pkg.popular && (
                <div
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${pkg.color}, ${pkg.color}80)`,
                  }}
                />
              )}
              {pkg.popular && (
                <div
                  style={{
                    position: "absolute", top: 14, right: 14,
                    background: `linear-gradient(135deg, ${pkg.color}, ${pkg.color}BB)`,
                    color: "white", borderRadius: 20,
                    padding: "2px 10px", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <Star size={9} /> PHỔ BIẾN
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${pkg.color}15`,
                    border: `1.5px solid ${pkg.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Wifi size={18} style={{ color: pkg.color }} />
                </div>
                <div>
                  <div style={{ color: pkg.color, fontWeight: 800, fontSize: 18 }}>{pkg.name}</div>
                  <div style={{ color: "#94A3B8", fontSize: 11 }}>{pkg.validity}</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
                  <span style={{ color: "#0F172A", fontSize: "1.6rem", fontWeight: 900 }}>{pkg.price}</span>
                  <span style={{ color: "#94A3B8", fontSize: 12 }}>/tháng</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${pkg.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Wifi size={13} style={{ color: pkg.color }} />
                    </div>
                    <span style={{ color: "#334155", fontSize: 13, fontWeight: 500 }}>{pkg.data}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${pkg.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Phone size={13} style={{ color: pkg.color }} />
                    </div>
                    <span style={{ color: "#334155", fontSize: 13, fontWeight: 500 }}>{pkg.voice}</span>
                  </div>
                </div>
              </div>

              {/* Feature tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
                {pkg.features.map(f => (
                  <span
                    key={f}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: `${pkg.color}10`,
                      color: pkg.color,
                      border: `1px solid ${pkg.color}25`,
                      borderRadius: 20, padding: "2px 8px",
                      fontSize: 11, fontWeight: 500,
                    }}
                  >
                    <Check size={9} /> {f}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10,
                    background: pkg.popular ? `linear-gradient(135deg, ${pkg.color}, ${pkg.color}CC)` : `${pkg.color}15`,
                    border: pkg.popular ? "none" : `1.5px solid ${pkg.color}40`,
                    color: pkg.popular ? "white" : pkg.color,
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif",
                    boxShadow: pkg.popular ? `0 4px 16px ${pkg.color}40` : "none",
                    transition: "all 0.2s",
                  }}
                >
                  Đăng ký ngay
                </button>
                <button
                  style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: "#F8FAFC",
                    border: "1.5px solid #E2E8F0",
                    color: "#64748B", fontSize: 13, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Chi tiết
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
