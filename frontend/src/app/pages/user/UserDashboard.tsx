import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Wifi, Phone, CreditCard, Star, ArrowRight, Bell,
  TrendingUp, Gift, Zap, RefreshCw, Plus, ChevronRight,
  Shield, Clock, AlertTriangle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function CircleProgress({ pct, size = 100, strokeW = 8, color = "#0055A5", bg = "#EFF6FF" }: {
  pct: number; size?: number; strokeW?: number; color?: string; bg?: string;
}) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={strokeW} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />
    </svg>
  );
}

const TRANSACTIONS = [
  { icon: "📦", label: "Gia hạn gói TK135", date: "08/06/2026", amount: -135000, type: "debit" },
  { icon: "💳", label: "Nạp tiền VNPay", date: "05/06/2026", amount: 200000, type: "credit" },
  { icon: "➕", label: "Mua thêm 5GB data", date: "03/06/2026", amount: -25000, type: "debit" },
  { icon: "🎁", label: "Thưởng điểm thành viên", date: "01/06/2026", amount: 0, type: "points", points: 500 },
  { icon: "📦", label: "Gia hạn gói TK135", date: "08/05/2026", amount: -135000, type: "debit" },
];

const NOTIFICATIONS = [
  { icon: "⚡", title: "Gói cước sắp hết hạn", body: "TK135 của bạn hết hạn vào 10/07. Gia hạn ngay để không bị gián đoạn!", color: "#F59E0B", time: "2 giờ trước", action: "Gia hạn" },
  { icon: "🎁", title: "Ưu đãi sinh nhật đang chờ", body: "Nhân dịp tháng sinh nhật, MobiFone tặng bạn +5GB data miễn phí!", color: "#22C55E", time: "1 ngày trước", action: "Nhận ngay" },
  { icon: "📊", title: "Đã dùng 80% data tháng", body: "Bạn đã dùng 68/120GB data tháng này. Mua thêm với giá ưu đãi!", color: "#0055A5", time: "3 ngày trước", action: "Mua thêm" },
];

export function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rechargeAmt, setRechargeAmt] = useState(100000);
  const dataUsedPct = Math.round(((user?.dataUsedGB ?? 0) / (user?.dataTotalGB ?? 1)) * 100);
  const voiceUsedPct = Math.round(((user?.voiceUsedMin ?? 0) / (user?.voiceTotalMin ?? 1)) * 100);
  const daysLeft = 29;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Outfit',sans-serif" }}>
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          borderRadius: 20,
          background: "linear-gradient(135deg, #001F3F 0%, #003466 50%, #0055A5 100%)",
          padding: "24px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,156,18,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: 100, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,255,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 4 }}>Chào buổi sáng 👋</div>
          <div style={{ color: "white", fontSize: "1.6rem", fontWeight: 900, marginBottom: 6 }}>
            {user?.name?.split(" ").slice(-2).join(" ")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 12px", color: "white", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <Star size={11} style={{ color: "#F39C12" }} /> {user?.tier} Member
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
              SĐT: {user?.phone}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, position: "relative" }}>
          <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 18px", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 2 }}>Số dư</div>
            <div style={{ color: "white", fontSize: "1.2rem", fontWeight: 800 }}>
              {user?.balance?.toLocaleString("vi-VN")}đ
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 18px", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 2 }}>Điểm</div>
            <div style={{ color: "#F39C12", fontSize: "1.2rem", fontWeight: 800 }}>
              {user?.points?.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Current package card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ background: "white", borderRadius: 20, padding: 24, border: "1.5px solid #E2E8F0", gridColumn: "span 2" }}
          className="lg:col-span-2"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>GÓI CỨC HIỆN TẠI</div>
              <div style={{ color: "#0F172A", fontSize: "1.4rem", fontWeight: 900 }}>{user?.package}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Clock size={12} style={{ color: "#94A3B8" }} />
                <span style={{ color: "#94A3B8", fontSize: 13 }}>Hết hạn {user?.packageExpiry}</span>
                <span style={{ background: daysLeft < 7 ? "#FEF2F2" : "#F0FDF4", color: daysLeft < 7 ? "#EF4444" : "#16A34A", borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                  {daysLeft < 7 ? `⚠ Còn ${daysLeft} ngày` : `✓ Còn ${daysLeft} ngày`}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => navigate("/packages")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
              >
                <RefreshCw size={13} /> Đổi gói
              </button>
              <button
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0055A5,#00B4FF)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif", boxShadow: "0 4px 14px rgba(0,85,165,0.35)" }}
              >
                <RefreshCw size={13} /> Gia hạn ngay
              </button>
            </div>
          </div>

          {/* Usage gauges */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {/* Data */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <CircleProgress pct={dataUsedPct} size={90} strokeW={9} color={dataUsedPct > 80 ? "#EF4444" : "#0055A5"} bg="#EFF6FF" />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#0F172A", fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{dataUsedPct}%</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <Wifi size={14} style={{ color: "#0055A5" }} />
                  <span style={{ color: "#64748B", fontSize: 12, fontWeight: 600 }}>DATA</span>
                </div>
                <div style={{ color: "#0F172A", fontWeight: 800, fontSize: "1.1rem" }}>{user?.dataUsedGB}GB</div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>/ {user?.dataTotalGB}GB tháng này</div>
                {dataUsedPct > 75 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                    <AlertTriangle size={11} style={{ color: "#F59E0B" }} />
                    <span style={{ color: "#F59E0B", fontSize: 11, fontWeight: 600 }}>Sắp hết data</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ width: 1, background: "#F1F5F9" }} />

            {/* Voice */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <CircleProgress pct={voiceUsedPct} size={90} strokeW={9} color="#22C55E" bg="#F0FDF4" />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#0F172A", fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{voiceUsedPct}%</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <Phone size={14} style={{ color: "#22C55E" }} />
                  <span style={{ color: "#64748B", fontSize: 12, fontWeight: 600 }}>GỌI ĐIỆN</span>
                </div>
                <div style={{ color: "#0F172A", fontWeight: 800, fontSize: "1.1rem" }}>{user?.voiceUsedMin} phút</div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>/ {user?.voiceTotalMin} phút tháng này</div>
                <div style={{ color: "#22C55E", fontSize: 11, fontWeight: 600, marginTop: 4 }}>Còn {(user?.voiceTotalMin ?? 0) - (user?.voiceUsedMin ?? 0)} phút</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div style={{ color: "#64748B", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>THAO TÁC NHANH</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {[
            { icon: "💳", label: "Nạp tiền", color: "#22C55E", action: () => {} },
            { icon: "📦", label: "Gia hạn gói", color: "#0055A5", action: () => {} },
            { icon: "➕", label: "Mua thêm data", color: "#F39C12", action: () => {} },
            { icon: "📱", label: "Đổi sang eSIM", color: "#A855F7", action: () => navigate("/esim") },
            { icon: "🎁", label: "Đổi điểm", color: "#EF4444", action: () => {} },
            { icon: "🔧", label: "Hỗ trợ kỹ thuật", color: "#06B6D4", action: () => navigate("/support") },
          ].map(qa => (
            <button
              key={qa.label}
              onClick={qa.action}
              style={{
                background: "white", border: "1.5px solid #E2E8F0", borderRadius: 14,
                padding: "16px 12px", cursor: "pointer", textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                transition: "all 0.2s", fontFamily: "'Outfit',sans-serif",
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = qa.color; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 8px 20px ${qa.color}20`; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#E2E8F0"; el.style.transform = "none"; el.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 22 }}>{qa.icon}</span>
              <span style={{ color: "#334155", fontSize: 13, fontWeight: 600 }}>{qa.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, flexWrap: "wrap" }}>
        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: "white", borderRadius: 20, border: "1.5px solid #E2E8F0", overflow: "hidden" }}
        >
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 15 }}>Lịch sử giao dịch</div>
            <button style={{ color: "#0055A5", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Xem tất cả →</button>
          </div>
          <div>
            {TRANSACTIONS.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: i < TRANSACTIONS.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                  {t.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#0F172A", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                  <div style={{ color: "#94A3B8", fontSize: 12 }}>{t.date}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {t.type === "points"
                    ? <span style={{ color: "#F39C12", fontWeight: 700, fontSize: 14 }}>+{t.points} điểm</span>
                    : <span style={{ color: t.type === "credit" ? "#22C55E" : "#EF4444", fontWeight: 700, fontSize: 14 }}>
                        {t.type === "credit" ? "+" : ""}{t.amount.toLocaleString("vi-VN")}đ
                      </span>
                  }
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notifications + Loyalty */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Loyalty points */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ background: "linear-gradient(135deg,#001F3F,#003466)", borderRadius: 20, padding: "20px", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>ĐIỂM THƯỞNG</div>
                <div style={{ color: "#F39C12", fontSize: "1.8rem", fontWeight: 900 }}>{user?.points?.toLocaleString()}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(243,156,18,0.15)", border: "1px solid rgba(243,156,18,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={20} style={{ color: "#F39C12" }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Lên Diamond cần thêm</span>
                <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{(10000 - (user?.points ?? 0)).toLocaleString()} điểm</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#F39C12,#FF5722)", width: `${Math.min(((user?.points ?? 0) / 10000) * 100, 100)}%` }} />
              </div>
            </div>
            <button style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1px solid rgba(243,156,18,0.3)", background: "rgba(243,156,18,0.1)", color: "#F39C12", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
              🎁 Đổi điểm lấy ưu đãi
            </button>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ background: "white", borderRadius: 20, border: "1.5px solid #E2E8F0", overflow: "hidden", flex: 1 }}
          >
            <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>Thông báo</div>
              <span style={{ background: "#EFF6FF", color: "#0055A5", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{NOTIFICATIONS.length}</span>
            </div>
            <div>
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} style={{ padding: "12px 16px", borderBottom: i < NOTIFICATIONS.length - 1 ? "1px solid #F8FAFC" : "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${n.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ color: "#64748B", fontSize: 12, lineHeight: 1.4, marginBottom: 6 }}>{n.body}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#94A3B8", fontSize: 11 }}>{n.time}</span>
                      <button style={{ color: n.color, fontSize: 12, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                        {n.action} →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
