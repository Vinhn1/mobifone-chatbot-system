import { useState } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, MapPin, Calendar, Lock, Bell, Shield, Camera, Check, ChevronRight, Star } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TIER_STYLE = {
  Silver: { bg: "linear-gradient(135deg,#94A3B8,#64748B)", text: "white", shadow: "0 4px 16px rgba(100,116,139,0.4)" },
  Gold: { bg: "linear-gradient(135deg,#F59E0B,#D97706)", text: "white", shadow: "0 4px 16px rgba(245,158,11,0.4)" },
  Diamond: { bg: "linear-gradient(135deg,#8B5CF6,#6D28D9)", text: "white", shadow: "0 4px 16px rgba(139,92,246,0.4)" },
};

function InfoRow({ icon: Icon, label, value, editable = false, onEdit }: {
  icon: React.ElementType; label: string; value: string; editable?: boolean; onEdit?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} style={{ color: "#64748B" }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 600, marginBottom: 1 }}>{label.toUpperCase()}</div>
        <div style={{ color: "#0F172A", fontWeight: 600, fontSize: 14 }}>{value}</div>
      </div>
      {editable && (
        <button onClick={onEdit} style={{ color: "#0055A5", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
          Sửa
        </button>
      )}
    </div>
  );
}

export function UserProfile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<"info" | "security" | "notifications">("info");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    sms: true, email: true, promo: true, renewal: true, news: false, security: true
  });
  const tier = user?.tier ?? "Silver";
  const tierStyle = TIER_STYLE[tier];

  const handleSave = () => {
    setSaved(true);
    setEditing(null);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", maxWidth: 800, margin: "0 auto" }}>
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "white", borderRadius: 20, padding: 24, border: "1.5px solid #E2E8F0", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg,#0055A5,#F39C12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 28, fontWeight: 900,
              boxShadow: "0 4px 20px rgba(0,85,165,0.3)",
              border: "3px solid white",
            }}
          >
            {user?.name?.charAt(0)}
          </div>
          <button
            style={{
              position: "absolute", bottom: -2, right: -2,
              width: 26, height: 26, borderRadius: "50%",
              background: "#0055A5", border: "2px solid white",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Camera size={12} color="white" />
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ color: "#0F172A", fontSize: "1.3rem", fontWeight: 900, marginBottom: 4 }}>{user?.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: tierStyle.bg, ...{ color: tierStyle.text }, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, boxShadow: tierStyle.shadow }}>
              <Star size={11} /> {tier} Member
            </span>
            <span style={{ color: "#94A3B8", fontSize: 13 }}>Tham gia từ {user?.joinDate}</span>
          </div>
          <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>ID: {user?.id} · Gói: {user?.package}</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
            <div style={{ color: "#16A34A", fontWeight: 800, fontSize: "1.2rem" }}>{user?.points?.toLocaleString()}</div>
            <div style={{ color: "#22C55E", fontSize: 11 }}>Điểm thưởng</div>
          </div>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
            <div style={{ color: "#0055A5", fontWeight: 800, fontSize: "1.2rem" }}>{user?.balance?.toLocaleString("vi-VN")}đ</div>
            <div style={{ color: "#0055A5", fontSize: 11 }}>Số dư</div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {[
          { key: "info", label: "👤 Thông tin" },
          { key: "security", label: "🔒 Bảo mật" },
          { key: "notifications", label: "🔔 Thông báo" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tab === t.key ? "#0055A5" : "transparent", color: tab === t.key ? "white" : "#64748B", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "white", borderRadius: 20, padding: 24, border: "1.5px solid #E2E8F0" }}>
          <InfoRow icon={User} label="Họ và tên" value={user?.name ?? ""} editable onEdit={() => { setEditing("name"); setEditValue(user?.name ?? ""); }} />
          <InfoRow icon={Phone} label="Số điện thoại" value={user?.phone ?? ""} />
          <InfoRow icon={Mail} label="Email" value={user?.email ?? ""} editable onEdit={() => { setEditing("email"); setEditValue(user?.email ?? ""); }} />
          <InfoRow icon={Calendar} label="Ngày sinh" value={user?.dob ?? ""} editable onEdit={() => { setEditing("dob"); setEditValue(user?.dob ?? ""); }} />
          <InfoRow icon={MapPin} label="Địa chỉ" value={user?.address ?? ""} editable onEdit={() => { setEditing("address"); setEditValue(user?.address ?? ""); }} />

          {editing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 16, padding: 16, background: "#F8FAFC", borderRadius: 12, border: "1.5px solid #BFDBFE" }}
            >
              <label style={{ color: "#64748B", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
                CHỈNH SỬA {editing.toUpperCase()}
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  style={{ flex: 1, border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "9px 14px", fontSize: 14, outline: "none", color: "#0F172A", fontFamily: "'Outfit',sans-serif", background: "white" }}
                />
                <button onClick={handleSave} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0055A5,#00B4FF)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                  Lưu
                </button>
                <button onClick={() => setEditing(null)} style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", color: "#64748B", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                  Huỷ
                </button>
              </div>
            </motion.div>
          )}

          {saved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "8px 14px" }}>
              <Check size={14} /> Đã lưu thay đổi thành công!
            </motion.div>
          )}
        </motion.div>
      )}

      {tab === "security" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: Lock, title: "Đổi mật khẩu", desc: "Cập nhật mật khẩu đăng nhập", color: "#0055A5" },
            { icon: Shield, title: "Xác thực 2 lớp (2FA)", desc: "Bảo vệ tài khoản bằng OTP SMS", color: "#22C55E", badge: "Đã bật" },
            { icon: Phone, title: "Đổi số điện thoại xác thực", desc: "Cập nhật số điện thoại nhận OTP", color: "#F39C12" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.title} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = s.color}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}12`, border: `1.5px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    {s.title}
                    {s.badge && <span style={{ background: "#DCFCE7", color: "#16A34A", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{s.badge}</span>}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: 13 }}>{s.desc}</div>
                </div>
                <ChevronRight size={16} style={{ color: "#CBD5E1" }} />
              </div>
            );
          })}
        </motion.div>
      )}

      {tab === "notifications" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "white", borderRadius: 20, padding: 24, border: "1.5px solid #E2E8F0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { key: "sms", label: "Thông báo SMS", desc: "Nhận tin nhắn về giao dịch và dịch vụ" },
              { key: "email", label: "Thông báo Email", desc: "Hóa đơn, báo cáo sử dụng hàng tháng" },
              { key: "promo", label: "Ưu đãi và khuyến mãi", desc: "Flash deals, gói cước mới, quà tặng" },
              { key: "renewal", label: "Nhắc gia hạn", desc: "Thông báo trước khi gói cước hết hạn 7 ngày" },
              { key: "news", label: "Tin tức MobiFone", desc: "Sản phẩm mới, sự kiện, và bản tin" },
              { key: "security", label: "Cảnh báo bảo mật", desc: "Đăng nhập lạ, thay đổi mật khẩu" },
            ].map(n => (
              <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F8FAFC" }}>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                  <div style={{ color: "#94A3B8", fontSize: 13 }}>{n.desc}</div>
                </div>
                <button
                  onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                  style={{
                    width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                    background: notifications[n.key as keyof typeof notifications] ? "#0055A5" : "#E2E8F0",
                    position: "relative", transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "white",
                    position: "absolute", top: 3,
                    left: notifications[n.key as keyof typeof notifications] ? 23 : 3,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  }} />
                </button>
              </div>
            ))}
          </div>
          <button style={{ marginTop: 20, width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#0055A5,#00B4FF)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", boxShadow: "0 4px 16px rgba(0,85,165,0.3)" }}>
            Lưu cài đặt thông báo
          </button>
        </motion.div>
      )}
    </div>
  );
}
