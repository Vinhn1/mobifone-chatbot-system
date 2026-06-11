import { motion } from "motion/react";
import { Check } from "lucide-react";

const plans = [
  {
    name: "TK79",
    price: "79.000đ",
    period: "/tháng",
    highlight: false,
    color: "#0055A5",
    data: "2GB/ngày",
    features: ["60GB data/tháng", "Gọi nội mạng 30p/ngày", "SMS miễn phí nội mạng", "Hỗ trợ 4G LTE"],
  },
  {
    name: "TK135",
    price: "135.000đ",
    period: "/tháng",
    highlight: true,
    color: "#F39C12",
    badge: "Phổ biến nhất",
    data: "4GB/ngày",
    features: ["120GB data/tháng", "Gọi nội mạng miễn phí", "20p gọi ngoại mạng/ngày", "Hỗ trợ 5G", "Ưu tiên hỗ trợ VIP"],
  },
  {
    name: "TK199",
    price: "199.000đ",
    period: "/tháng",
    highlight: false,
    color: "#A855F7",
    data: "6GB/ngày",
    features: ["180GB data/tháng", "Gọi miễn phí mọi mạng", "Roaming 5 quốc gia ASEAN", "Hỗ trợ 5G Ultra", "VIP Support 24/7", "Tặng TV360 1 tháng"],
  },
];

export function PricingSection() {
  return (
    <section
      style={{
        fontFamily: "'Outfit', sans-serif",
        background: "linear-gradient(180deg, #00132A 0%, #001F3F 100%)",
        padding: "80px 0",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div
            style={{
              color: "#F39C12",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Bảng giá
          </div>
          <h2
            style={{
              color: "white",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            Chọn gói cước{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #F39C12, #FF5722)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              phù hợp
            </span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            Linh hoạt, minh bạch, không phí ẩn. Nâng cấp hoặc hạ cấp bất cứ lúc nào.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-center">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              style={{
                borderRadius: 20,
                background: plan.highlight
                  ? "linear-gradient(145deg, rgba(243,156,18,0.15) 0%, rgba(0,31,63,0.9) 100%)"
                  : "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,31,63,0.7) 100%)",
                backdropFilter: "blur(20px)",
                border: plan.highlight
                  ? "1px solid rgba(243,156,18,0.4)"
                  : "1px solid rgba(255,255,255,0.1)",
                padding: plan.highlight ? "36px 28px" : "28px",
                position: "relative",
                overflow: "hidden",
                transform: plan.highlight ? "scale(1.04)" : "scale(1)",
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "linear-gradient(90deg, #F39C12, #FF5722)",
                  }}
                />
              )}
              {plan.badge && (
                <div
                  style={{
                    display: "inline-flex",
                    background: "linear-gradient(90deg, #F39C12, #FF5722)",
                    color: "white",
                    borderRadius: 20,
                    padding: "3px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div
                style={{
                  color: plan.color,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                {plan.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ color: "white", fontSize: "2rem", fontWeight: 900 }}>{plan.price}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{plan.period}</span>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: `${plan.color}22`,
                  color: plan.color,
                  border: `1px solid ${plan.color}44`,
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 20,
                }}
              >
                📶 {plan.data}
              </div>

              <div className="flex flex-col gap-3 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: `${plan.color}22`,
                        border: `1px solid ${plan.color}55`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={10} style={{ color: plan.color }} />
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500 }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <button
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: plan.highlight ? "none" : `1px solid ${plan.color}55`,
                  background: plan.highlight
                    ? "linear-gradient(135deg, #F39C12, #FF5722)"
                    : "transparent",
                  color: plan.highlight ? "white" : plan.color,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "all 0.2s",
                  boxShadow: plan.highlight ? "0 4px 20px rgba(243,156,18,0.4)" : "none",
                }}
              >
                Đăng ký ngay
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
