import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Check, Smartphone, QrCode, Download, Wifi, ArrowRight, Zap } from "lucide-react";

const STEPS = [
  { icon: QrCode, title: "Chọn gói eSIM", desc: "Chọn gói data phù hợp với nhu cầu của bạn và hoàn tất thanh toán online." },
  { icon: Download, title: "Nhận QR Code", desc: "QR Code sẽ được gửi qua email và hiển thị ngay trên màn hình sau khi thanh toán." },
  { icon: Smartphone, title: "Quét QR bằng điện thoại", desc: "Vào Cài đặt > Di động/Cellular > Thêm eSIM > Quét mã QR vừa nhận." },
  { icon: Wifi, title: "Kết nối ngay!", desc: "eSIM được kích hoạt trong vài giây. Tận hưởng tốc độ 5G không giới hạn!" },
];

const PLANS = [
  { name: "Basic", data: "1GB", days: 7, price: "29.000đ", color: "#64748B", popular: false },
  { name: "Standard", data: "3GB", days: 30, price: "79.000đ", color: "#0055A5", popular: false },
  { name: "Premium", data: "10GB", days: 30, price: "135.000đ", color: "#F39C12", popular: true },
  { name: "Unlimited", data: "∞ GB", days: 30, price: "199.000đ", color: "#A855F7", popular: false },
];

function PhoneMockup({ activeStep }: { activeStep: number }) {
  return (
    <div
      style={{
        width: 240,
        height: 440,
        borderRadius: 36,
        background: "linear-gradient(145deg, #1A1A2E 0%, #0D0D1A 100%)",
        border: "8px solid rgba(255,255,255,0.08)",
        position: "relative",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Notch */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 80, height: 22, background: "#0D0D1A", borderRadius: "0 0 16px 16px", zIndex: 10 }} />

      {/* Screen content */}
      <div style={{ position: "absolute", inset: 0, padding: "36px 12px 12px" }}>
        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
          <span style={{ color: "white", fontSize: 10, fontWeight: 600 }}>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Wifi size={10} color="white" />
            <span style={{ color: "white", fontSize: 10 }}>5G</span>
          </div>
        </div>

        {/* App screen */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 12,
            height: "calc(100% - 36px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 600, letterSpacing: 1.5 }}>CÀI ĐẶT · eSIM</div>

          {/* QR code visual */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxShadow: "0 0 20px rgba(0,85,165,0.3)",
            }}
          >
            {/* Fake QR pattern */}
            <div style={{ width: 90, height: 90, position: "relative" }}>
              {[0,1,2,3].map(r => [0,1,2,3].map(c => (
                <div
                  key={`${r}-${c}`}
                  style={{
                    position: "absolute",
                    left: c * 22,
                    top: r * 22,
                    width: 18,
                    height: 18,
                    background: (r + c) % 2 === 0 ? "#001F3F" : "transparent",
                    borderRadius: 2,
                  }}
                />
              )))}
            </div>
            {/* Scanner line */}
            {activeStep === 2 && (
              <motion.div
                animate={{ top: [12, 108, 12] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: 4,
                  right: 4,
                  height: 2,
                  background: "linear-gradient(90deg, transparent, #00B4FF, transparent)",
                  boxShadow: "0 0 8px #00B4FF",
                }}
              />
            )}
          </div>

          {activeStep >= 2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "white", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>MobiFone eSIM</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>Hướng camera vào mã QR</div>
            </div>
          )}

          {activeStep >= 3 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #22C55E, #16A34A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(34,197,94,0.5)",
              }}
            >
              <Check size={18} color="white" />
            </motion.div>
          )}

          {activeStep >= 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#22C55E", fontSize: 11, fontWeight: 700 }}>Kích hoạt thành công!</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, marginTop: 2 }}>MobiFone 5G · Premium 10GB</div>
            </div>
          )}
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 60, height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
    </div>
  );
}

export function ESIMPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(2);
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #001F3F 0%, #00132A 60%, #0A0A1A 100%)",
          padding: "120px 0 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,85,165,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: 100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,156,18,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center", maxWidth: 600 }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,180,255,0.12)", border: "1px solid rgba(0,180,255,0.25)", borderRadius: 20, padding: "4px 14px", marginBottom: 18 }}>
                <Zap size={13} style={{ color: "#60B4FF" }} />
                <span style={{ color: "#60B4FF", fontSize: 12, fontWeight: 600 }}>Công nghệ eSIM thế hệ mới</span>
              </div>
              <h1
                style={{
                  color: "white",
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                  fontWeight: 900,
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}
              >
                Kích hoạt eSIM{" "}
                <span style={{ background: "linear-gradient(90deg, #F39C12, #FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  chỉ trong 5 phút
                </span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
                Không cần SIM vật lý. Kích hoạt ngay trên điện thoại của bạn. Hỗ trợ iPhone 12+, Samsung S21+, và hơn 200 dòng máy khác.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
                  style={{
                    padding: "13px 28px", borderRadius: 12,
                    background: "linear-gradient(135deg, #F39C12, #FF5722)",
                    border: "none", color: "white", fontWeight: 700, fontSize: 15,
                    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                    boxShadow: "0 8px 24px rgba(243,156,18,0.4)",
                  }}
                >
                  Xem các gói eSIM
                </button>
                <button
                  style={{
                    padding: "13px 28px", borderRadius: 12,
                    background: "transparent", border: "1px solid rgba(255,255,255,0.25)",
                    color: "white", fontWeight: 600, fontSize: 15,
                    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Kiểm tra tương thích
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
            >
              <PhoneMockup activeStep={activeStep} />
              {/* Steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === activeStep;
                  const isDone = i < activeStep;
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveStep(i)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 14,
                        padding: "14px 16px",
                        borderRadius: 14,
                        cursor: "pointer",
                        background: isActive ? "rgba(0,85,165,0.25)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? "rgba(0,180,255,0.4)" : "rgba(255,255,255,0.06)"}`,
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isDone ? "linear-gradient(135deg,#22C55E,#16A34A)" : isActive ? "linear-gradient(135deg,#0055A5,#00B4FF)" : "rgba(255,255,255,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: isActive ? "0 0 16px rgba(0,85,165,0.4)" : "none",
                        }}
                      >
                        {isDone ? <Check size={16} color="white" /> : <Icon size={16} color={isActive ? "white" : "rgba(255,255,255,0.4)"} />}
                      </div>
                      <div>
                        <div style={{ color: isActive ? "white" : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                          {i + 1}. {s.title}
                        </div>
                        {isActive && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.5 }}>{s.desc}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" style={{ padding: "72px 0", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#F39C12", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>Bảng giá eSIM</div>
            <h2 style={{ color: "#0F172A", fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 800, marginBottom: 12 }}>
              Chọn gói phù hợp với bạn
            </h2>
            <p style={{ color: "#64748B", fontSize: 16, maxWidth: 440, margin: "0 auto" }}>
              Mua và kích hoạt hoàn toàn online. Không cần đến cửa hàng.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelectedPlan(i)}
                style={{
                  borderRadius: 20,
                  padding: 24,
                  cursor: "pointer",
                  background: selectedPlan === i ? "linear-gradient(145deg, #001F3F, #003466)" : "white",
                  border: `2px solid ${selectedPlan === i ? plan.color : "#E2E8F0"}`,
                  boxShadow: selectedPlan === i ? `0 16px 40px ${plan.color}33` : "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.3s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute", top: 14, right: 14,
                      background: "linear-gradient(135deg, #F39C12, #FF5722)",
                      color: "white", borderRadius: 20,
                      padding: "2px 10px", fontSize: 10, fontWeight: 700,
                    }}
                  >
                    PHỔ BIẾN
                  </div>
                )}
                <div style={{ color: plan.color, fontWeight: 700, fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>{plan.name.toUpperCase()}</div>
                <div style={{ color: selectedPlan === i ? "white" : "#0F172A", fontSize: "2rem", fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{plan.data}</div>
                <div style={{ color: selectedPlan === i ? "rgba(255,255,255,0.5)" : "#64748B", fontSize: 13, marginBottom: 16 }}>
                  Hiệu lực {plan.days} ngày
                </div>
                <div style={{ color: plan.color, fontSize: "1.4rem", fontWeight: 800, marginBottom: 16 }}>{plan.price}</div>
                <button
                  style={{
                    width: "100%", padding: "10px", borderRadius: 10,
                    background: selectedPlan === i ? `linear-gradient(135deg, ${plan.color}, ${plan.color}BB)` : "transparent",
                    border: `1.5px solid ${plan.color}`,
                    color: selectedPlan === i ? "white" : plan.color,
                    fontWeight: 600, fontSize: 14, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
                  }}
                  onClick={() => navigate("/login")}
                >
                  {selectedPlan === i ? "Mua ngay →" : "Chọn gói"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
