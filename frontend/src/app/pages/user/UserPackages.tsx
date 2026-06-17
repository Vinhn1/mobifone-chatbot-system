import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Wifi, Phone, Check, Zap, RefreshCw, Plus, ChevronRight, Package, X, Copy, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ADDONS = [
  { icon: "📶", name: "Thêm 5GB data", price: 25000, desc: "Hiệu lực 30 ngày", color: "#0055A5" },
  { icon: "📶", name: "Thêm 10GB data", price: 45000, desc: "Tiết kiệm hơn 10%", color: "#0055A5", best: true },
  { icon: "📶", name: "Thêm 20GB data", price: 80000, desc: "Tiết kiệm 20%", color: "#0055A5" },
  { icon: "📞", name: "Gọi thêm 50 phút", price: 20000, desc: "Ngoại mạng", color: "#22C55E" },
  { icon: "📡", name: "Roaming 1 ngày", price: 49000, desc: "ASEAN 3G/4G", color: "#A855F7" },
  { icon: "🌍", name: "Roaming 7 ngày", price: 299000, desc: "ASEAN unlimited", color: "#A855F7", best: true },
];

const UPGRADE_PACKAGES = [
  { name: "TK199", price: 199000, data: "6GB/ngày", voice: "Tất cả mạng miễn phí", color: "#A855F7", features: ["Roaming ASEAN", "TV360 1 tháng", "Cloud 20GB"] },
  { name: "MAX299", price: 299000, data: "Không giới hạn", voice: "Tất cả mạng miễn phí", color: "#EF4444", features: ["Roaming 10 nước", "Cloud 50GB", "Priority Support 24/7"] },
];

const getPackageData = (codeUpper: string) => {
  let dataTotal = 120;
  let voiceTotal = 600;
  let name = codeUpper + " Ultra";

  if (codeUpper === 'TK79') {
    dataTotal = 60;
    voiceTotal = 900;
  } else if (codeUpper === 'TK99') {
    dataTotal = 90;
    voiceTotal = 600;
  } else if (codeUpper === 'TK135') {
    dataTotal = 120;
    voiceTotal = 620;
  } else if (codeUpper === 'TK199') {
    dataTotal = 180;
    voiceTotal = 1000;
  } else if (codeUpper === 'V90') {
    dataTotal = 30;
    voiceTotal = 1000;
  } else if (codeUpper === 'V150') {
    dataTotal = 60;
    voiceTotal = 1000;
  } else if (codeUpper === 'MAX299') {
    dataTotal = 999;
    voiceTotal = 2000;
  } else if (codeUpper === 'S49') {
    dataTotal = 15;
    voiceTotal = 300;
  }

  return {
    packageCode: codeUpper,
    package: name,
    dataTotalGB: dataTotal,
    dataUsedGB: 0,
    voiceTotalMin: voiceTotal,
    voiceUsedMin: 0,
    packageExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN"),
  };
};

const getAddonDetails = (index: number) => {
  let code = "D5";
  let syntax = "DK D5";
  let value = 5;
  let isVoice = false;

  if (index === 0) {
    code = "D5";
    syntax = "DK D5";
    value = 5;
  } else if (index === 1) {
    code = "D10";
    syntax = "DK D10";
    value = 10;
  } else if (index === 2) {
    code = "D20";
    syntax = "DK D20";
    value = 20;
  } else if (index === 3) {
    code = "V50";
    syntax = "DK V50";
    value = 50;
    isVoice = true;
  } else if (index === 4) {
    code = "RU1";
    syntax = "DK RU1";
    value = 1;
  } else if (index === 5) {
    code = "RU7";
    syntax = "DK RU7";
    value = 7;
  }

  return { code, syntax, value, isVoice };
};

export function UserPackages() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"current" | "addons" | "upgrade">("current");
  const [selectedAddon, setSelectedAddon] = useState<number | null>(null);

  // Modals state
  const [regModal, setRegModal] = useState<{
    open: boolean;
    title: string;
    price: string;
    color: string;
    shortcode: string;
    syntax: string;
    type: "addon" | "upgrade" | "renew";
    code: string;
    value?: number;
    isVoice?: boolean;
  } | null>(null);

  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedSyntax, setCopiedSyntax] = useState(false);

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRenewClick = () => {
    if (!user) return;
    const code = user.packageCode || "TK135";
    const syntax = `GH ${code}`;
    const priceStr = "135.000đ"; // Standard renew price

    if (isMobileDevice()) {
      window.location.href = `sms:999?body=GH%20${code}`;
    }

    setRegModal({
      open: true,
      title: `Gia hạn gói ${code}`,
      price: priceStr,
      color: "#0055A5",
      shortcode: "999",
      syntax: syntax,
      type: "renew",
      code: code
    });
  };

  const handleAddonClick = () => {
    if (selectedAddon === null) return;
    const item = ADDONS[selectedAddon];
    const details = getAddonDetails(selectedAddon);

    if (isMobileDevice()) {
      window.location.href = `sms:999?body=DK%20${details.code}`;
    }

    setRegModal({
      open: true,
      title: item.name,
      price: `${item.price.toLocaleString("vi-VN")}đ`,
      color: item.color,
      shortcode: "999",
      syntax: details.syntax,
      type: "addon",
      code: details.code,
      value: details.value,
      isVoice: details.isVoice
    });
  };

  const handleUpgradeClick = (pkg: any) => {
    const code = pkg.name.toUpperCase();
    const syntax = `DK ${code}`;

    if (isMobileDevice()) {
      window.location.href = `sms:999?body=DK%20${code}`;
    }

    setRegModal({
      open: true,
      title: `Nâng cấp lên gói ${pkg.name}`,
      price: `${pkg.price.toLocaleString("vi-VN")}đ`,
      color: pkg.color,
      shortcode: "999",
      syntax: syntax,
      type: "upgrade",
      code: code
    });
  };

  const handleConfirmActivation = () => {
    if (!user || !regModal) return;

    if (regModal.type === "renew") {
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN");
      updateUser({
        dataUsedGB: 0,
        voiceUsedMin: 0,
        packageExpiry: newExpiry
      });
    } else if (regModal.type === "addon") {
      const val = regModal.value || 0;
      if (regModal.isVoice) {
        updateUser({
          voiceTotalMin: (user.voiceTotalMin || 0) + val
        });
      } else {
        updateUser({
          dataTotalGB: (user.dataTotalGB || 0) + val
        });
      }
      setSelectedAddon(null);
    } else if (regModal.type === "upgrade") {
      const pkgData = getPackageData(regModal.code);
      updateUser(pkgData);
      setTab("current");
    }

    setRegModal(null);
  };

  const dataUsedPct = Math.round(((user?.dataUsedGB ?? 0) / (user?.dataTotalGB ?? 1)) * 100);
  const voiceUsedPct = Math.round(((user?.voiceUsedMin ?? 0) / (user?.voiceTotalMin ?? 1)) * 100);

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: "#0F172A", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Quản lý gói cước</h1>
        <p style={{ color: "#64748B", fontSize: 14 }}>Xem thông tin, mua thêm, hoặc nâng cấp gói cước của bạn</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {[
          { key: "current", label: "📦 Gói hiện tại" },
          { key: "addons", label: "➕ Mua thêm" },
          { key: "upgrade", label: "⬆ Nâng cấp" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tab === t.key ? "#0055A5" : "transparent", color: tab === t.key ? "white" : "#64748B", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}
          >{t.label}</button>
        ))}
      </div>

      {tab === "current" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Package info card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ background: "white", borderRadius: 20, padding: 24, border: "1.5px solid #E2E8F0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ color: "#64748B", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>GÓI ĐANG DÙNG</div>
                <div style={{ color: "#0F172A", fontSize: "1.8rem", fontWeight: 900 }}>{user?.packageCode}</div>
                <div style={{ color: "#64748B", fontSize: 14 }}>Hết hạn: {user?.packageExpiry}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleRenewClick}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                >
                  <RefreshCw size={14} /> Gia hạn (135.000đ)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Data bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Wifi size={15} style={{ color: "#0055A5" }} />
                    <span style={{ color: "#334155", fontWeight: 600, fontSize: 14 }}>Data Internet</span>
                  </div>
                  <span style={{ color: dataUsedPct > 80 ? "#EF4444" : "#0F172A", fontWeight: 700, fontSize: 14 }}>
                    {user?.dataUsedGB}GB / {user?.dataTotalGB}GB
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "#EFF6FF", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dataUsedPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ height: "100%", borderRadius: 5, background: dataUsedPct > 80 ? "linear-gradient(90deg,#F59E0B,#EF4444)" : "linear-gradient(90deg,#0055A5,#00B4FF)" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ color: "#94A3B8", fontSize: 12 }}>{dataUsedPct}% đã dùng</span>
                  <span style={{ color: "#64748B", fontSize: 12 }}>Còn {user?.dataTotalGB! - user?.dataUsedGB!}GB</span>
                </div>
              </div>

              {/* Voice bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Phone size={15} style={{ color: "#22C55E" }} />
                    <span style={{ color: "#334155", fontWeight: 600, fontSize: 14 }}>Gọi điện ngoại mạng</span>
                  </div>
                  <span style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>
                    {user?.voiceUsedMin} / {user?.voiceTotalMin} phút
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "#F0FDF4", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${voiceUsedPct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#22C55E,#16A34A)" }}
                  />
                </div>
              </div>
            </div>

            {/* Features included */}
            <div style={{ marginTop: 20, borderTop: "1px solid #F1F5F9", paddingTop: 16 }}>
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>ĐÃ BAO GỒM TRONG GÓI</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Gọi nội mạng ∞", "5G Ready", "SMS miễn phí", "MobiFone TV", "Cloud 5GB", "Hỗ trợ ưu tiên"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "4px 10px" }}>
                    <Check size={11} style={{ color: "#22C55E" }} />
                    <span style={{ color: "#15803D", fontSize: 12, fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {tab === "addons" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {ADDONS.map((addon, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => setSelectedAddon(selectedAddon === i ? null : i)}
              style={{
                background: "white", borderRadius: 16, padding: 20,
                border: `1.5px solid ${selectedAddon === i ? addon.color : "#E2E8F0"}`,
                cursor: "pointer", transition: "all 0.2s", position: "relative",
                boxShadow: selectedAddon === i ? `0 8px 24px ${addon.color}20` : "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              {addon.best && (
                <div style={{ position: "absolute", top: -10, right: 16, background: "linear-gradient(135deg,#F39C12,#FF5722)", color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>
                  GIÁ TỐT NHẤT
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${addon.color}12`, border: `1.5px solid ${addon.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {addon.icon}
                </div>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 15 }}>{addon.name}</div>
                  <div style={{ color: "#94A3B8", fontSize: 12 }}>{addon.desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: addon.color, fontSize: "1.3rem", fontWeight: 900 }}>{addon.price.toLocaleString("vi-VN")}đ</div>
                <button
                  style={{ padding: "7px 16px", borderRadius: 9, border: "none", background: selectedAddon === i ? addon.color : `${addon.color}15`, color: selectedAddon === i ? "white" : addon.color, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}
                >
                  {selectedAddon === i ? "✓ Đã chọn" : "Chọn mua"}
                </button>
              </div>
            </motion.div>
          ))}
          {selectedAddon !== null && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ gridColumn: "1/-1", background: "linear-gradient(135deg,#0055A5,#003D7A)", borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
            >
              <div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Đã chọn: {ADDONS[selectedAddon].name}</div>
                <div style={{ color: "white", fontSize: "1.3rem", fontWeight: 900 }}>{ADDONS[selectedAddon].price.toLocaleString("vi-VN")}đ</div>
              </div>
              <button
                onClick={handleAddonClick}
                style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#F39C12,#FF5722)", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Outfit',sans-serif", boxShadow: "0 4px 16px rgba(243,156,18,0.4)" }}
              >
                Thanh toán ngay →
              </button>
            </motion.div>
          )}
        </div>
      )}

      {tab === "upgrade" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {UPGRADE_PACKAGES.map((pkg, i) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: "linear-gradient(145deg,#001F3F,#003466)", borderRadius: 20, padding: 24, border: `1.5px solid ${pkg.color}40`, boxShadow: `0 8px 32px ${pkg.color}20` }}
            >
              <div style={{ color: pkg.color, fontWeight: 700, fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>NÂNG CẤP LÊN</div>
              <div style={{ color: "white", fontSize: "1.8rem", fontWeight: 900, marginBottom: 4 }}>{pkg.name}</div>
              <div style={{ color: pkg.color, fontSize: "1.4rem", fontWeight: 800, marginBottom: 12 }}>{pkg.price.toLocaleString("vi-VN")}đ/tháng</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Wifi size={14} style={{ color: pkg.color }} />
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>{pkg.data}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Phone size={14} style={{ color: pkg.color }} />
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>{pkg.voice}</span>
                </div>
                {pkg.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={14} style={{ color: "#22C55E" }} />
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleUpgradeClick(pkg)}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${pkg.color},${pkg.color}BB)`, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", boxShadow: `0 4px 16px ${pkg.color}40` }}
              >
                Nâng cấp ngay →
              </button>
            </motion.div>
          ))}
        </div>
      )}
      {/* SMS Guide Dialog Modal */}
      <AnimatePresence>
        {regModal && regModal.open && (
          <div style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: "white",
                borderRadius: 24,
                padding: 24,
                maxWidth: 420,
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid #F1F5F9",
                position: "relative"
              }}
            >
              <button
                onClick={() => setRegModal(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94A3B8"
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: regModal.color }} />
                <h3 style={{ margin: 0, color: "#0F172A", fontWeight: 800, fontSize: 18 }}>
                  {regModal.type === "renew" ? "Gia hạn" : regModal.type === "upgrade" ? "Nâng cấp" : "Đăng ký"} gói cước
                </h3>
              </div>

              <p style={{ color: "#64748B", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px 0" }}>
                Để {regModal.type === "renew" ? "gia hạn" : regModal.type === "upgrade" ? "nâng cấp lên" : "đăng ký"} <strong>{regModal.title}</strong> ({regModal.price}), vui lòng soạn tin nhắn SMS trên thiết bị di động của bạn theo cú pháp:
              </p>

              <div style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600 }}>Đầu số gửi:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#0F172A", fontWeight: 800, fontSize: 14 }}>{regModal.shortcode}</span>
                    <button
                      onClick={() => {
                        copyToClipboard(regModal.shortcode);
                        setCopiedShort(true);
                        setTimeout(() => setCopiedShort(false), 1500);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94A3B8",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6,
                        display: "flex"
                      }}
                    >
                      {copiedShort ? <CheckCircle2 size={14} style={{ color: "#22C55E" }} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ height: "1px", backgroundColor: "#E2E8F0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600 }}>Cú pháp tin nhắn:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#E4002B", fontWeight: 800, fontSize: 14 }}>{regModal.syntax}</span>
                    <button
                      onClick={() => {
                        copyToClipboard(regModal.syntax);
                        setCopiedSyntax(true);
                        setTimeout(() => setCopiedSyntax(false), 1500);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94A3B8",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6,
                        display: "flex"
                      }}
                    >
                      {copiedSyntax ? <CheckCircle2 size={14} style={{ color: "#22C55E" }} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: 11,
                color: "#64748B",
                marginBottom: 24,
                backgroundColor: "#EFF6FF",
                border: "1px solid #DBEAFE",
                padding: 12,
                borderRadius: 12,
                lineHeight: 1.5
              }}>
                ℹ️ Bạn sẽ tự gửi tin nhắn SMS từ điện thoại của mình. Cước phí sẽ được nhà mạng trừ từ tài khoản điện thoại di động chính thức của bạn.
              </div>

              <button
                onClick={handleConfirmActivation}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  backgroundColor: "#0055A5",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  boxShadow: "0 4px 12px rgba(0, 85, 165, 0.25)"
                }}
              >
                XÁC NHẬN KÍCH HOẠT GÓI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
