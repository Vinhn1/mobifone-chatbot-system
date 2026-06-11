import { useState } from "react";
import { motion } from "motion/react";
import { Zap, Gift, MessageCircle, Shield, Globe, Headphones } from "lucide-react";

const cards = [
  {
    icon: Zap,
    iconColor: "#00B4FF",
    glowColor: "rgba(0,180,255,0.35)",
    borderGlow: "rgba(0,180,255,0.6)",
    tag: "5G",
    title: "Siêu tốc độ 5G",
    desc: "Tốc độ tải xuống lên đến 2Gbps, độ trễ dưới 1ms. Kết nối mọi thiết bị không giới hạn.",
    badge: "Mới",
    badgeColor: "#00B4FF",
  },
  {
    icon: Gift,
    iconColor: "#F39C12",
    glowColor: "rgba(243,156,18,0.35)",
    borderGlow: "rgba(243,156,18,0.6)",
    tag: "Ưu đãi",
    title: "Cá nhân hóa ưu đãi",
    desc: "AI phân tích hành vi để đề xuất gói cước phù hợp nhất, tiết kiệm tối đa chi phí của bạn.",
    badge: "Hot",
    badgeColor: "#FF5722",
  },
  {
    icon: MessageCircle,
    iconColor: "#A855F7",
    glowColor: "rgba(168,85,247,0.35)",
    borderGlow: "rgba(168,85,247,0.6)",
    tag: "AI",
    title: "Trợ lý ảo 24/7",
    desc: "Chatbot AI thông minh hỗ trợ giải quyết mọi vấn đề tức thì, không cần chờ đợi.",
    badge: "AI",
    badgeColor: "#A855F7",
  },
  {
    icon: Shield,
    iconColor: "#22C55E",
    glowColor: "rgba(34,197,94,0.35)",
    borderGlow: "rgba(34,197,94,0.6)",
    tag: "Bảo mật",
    title: "Bảo mật tuyệt đối",
    desc: "Mã hóa đầu cuối, xác thực 2 lớp bảo vệ tài khoản và thông tin cá nhân của bạn.",
    badge: "",
    badgeColor: "",
  },
  {
    icon: Globe,
    iconColor: "#0055A5",
    glowColor: "rgba(0,85,165,0.35)",
    borderGlow: "rgba(0,85,165,0.6)",
    tag: "Quốc tế",
    title: "Roaming toàn cầu",
    desc: "Kết nối tại hơn 200 quốc gia với gói roaming linh hoạt, dữ liệu không giới hạn.",
    badge: "",
    badgeColor: "",
  },
  {
    icon: Headphones,
    iconColor: "#EC4899",
    glowColor: "rgba(236,72,153,0.35)",
    borderGlow: "rgba(236,72,153,0.6)",
    tag: "VIP",
    title: "Hỗ trợ VIP",
    desc: "Đường dây hỗ trợ ưu tiên 24/7 dành riêng cho khách hàng cao cấp với thời gian phản hồi dưới 30 giây.",
    badge: "VIP",
    badgeColor: "#EC4899",
  },
];

function FeatureCard({ card, index }: { card: typeof cards[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        background: hovered
          ? "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(0,31,63,0.8) 100%)"
          : "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(0,31,63,0.6) 100%)",
        backdropFilter: "blur(20px)",
        border: hovered
          ? `1px solid ${card.borderGlow}`
          : "1px solid rgba(255,255,255,0.1)",
        boxShadow: hovered
          ? `0 20px 60px ${card.glowColor}, 0 0 0 1px ${card.borderGlow}`
          : "0 4px 24px rgba(0,0,0,0.2)",
        padding: "28px",
        cursor: "pointer",
        transform: hovered ? "translateY(-8px)" : "translateY(0px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow on hover */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: card.glowColor,
          filter: "blur(30px)",
          opacity: hovered ? 0.6 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${card.glowColor.replace("0.35", "0.2")}`,
            border: `1px solid ${card.glowColor}`,
            boxShadow: hovered ? `0 4px 20px ${card.glowColor}` : "none",
            transition: "box-shadow 0.3s",
          }}
        >
          <Icon size={24} style={{ color: card.iconColor }} />
        </div>
        {card.badge && (
          <span
            style={{
              background: `${card.badgeColor}22`,
              color: card.badgeColor,
              border: `1px solid ${card.badgeColor}55`,
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {card.badge}
          </span>
        )}
      </div>

      <div
        style={{
          color: card.iconColor,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {card.tag}
      </div>
      <h3
        style={{
          color: "white",
          fontSize: "1.15rem",
          fontWeight: 700,
          marginBottom: 10,
          lineHeight: 1.3,
        }}
      >
        {card.title}
      </h3>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        {card.desc}
      </p>
    </motion.div>
  );
}

export function FeatureCards() {
  return (
    <section
      style={{
        fontFamily: "'Outfit', sans-serif",
        background: "linear-gradient(180deg, #001F3F 0%, #00132A 100%)",
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
            Dịch vụ nổi bật
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
            Hệ sinh thái số{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #F39C12, #FF5722)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              toàn diện
            </span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
            Từ kết nối siêu tốc đến trợ lý AI thông minh, MobiFone đồng hành cùng bạn trong mọi khoảnh khắc số.
          </p>
        </motion.div>

        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
        >
          {cards.map((card, i) => (
            <FeatureCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
