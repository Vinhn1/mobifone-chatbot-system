import { useState } from "react";
import { motion } from "motion/react";
import { Zap, Gift, MessageCircle, Shield, Globe, Headphones } from "lucide-react";

const cards = [
  {
    icon: Zap,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    iconBorder: "border-blue-100",
    glowColor: "rgba(0,85,165,0.1)",
    borderGlow: "border-blue-200",
    tag: "5G Speed",
    tagColor: "text-blue-600",
    title: "Siêu tốc độ 5G",
    desc: "Tốc độ tải xuống lên đến 2Gbps, độ trễ dưới 1ms. Kết nối mọi thiết bị không giới hạn.",
    badge: "Mới",
    badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: Gift,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    iconBorder: "border-red-100",
    glowColor: "rgba(228,0,43,0.1)",
    borderGlow: "border-red-200",
    tag: "Ưu đãi",
    tagColor: "text-red-600",
    title: "Cá nhân hóa ưu đãi",
    desc: "Hệ thống tự động đề xuất gói cước phù hợp nhất, tiết kiệm tối đa chi phí của bạn.",
    badge: "Hot",
    badgeClass: "bg-red-50 text-red-600 border-red-100",
  },
  {
    icon: MessageCircle,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    iconBorder: "border-indigo-100",
    glowColor: "rgba(79,70,229,0.1)",
    borderGlow: "border-indigo-200",
    tag: "Chăm sóc khách hàng",
    tagColor: "text-indigo-600",
    title: "Hỗ trợ 24/7",
    desc: "Kênh hỗ trợ trực tuyến giải quyết mọi vấn đề tức thì, không cần chờ đợi.",
    badge: "Live",
    badgeClass: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    icon: Shield,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    iconBorder: "border-emerald-100",
    glowColor: "rgba(16,185,129,0.1)",
    borderGlow: "border-emerald-200",
    tag: "Bảo mật",
    tagColor: "text-emerald-600",
    title: "Bảo mật tuyệt đối",
    desc: "Mã hóa đầu cuối, xác thực 2 lớp bảo vệ tài khoản và thông tin cá nhân của bạn.",
    badge: "",
    badgeClass: "",
  },
  {
    icon: Globe,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    iconBorder: "border-sky-100",
    glowColor: "rgba(0,180,255,0.1)",
    borderGlow: "border-sky-200",
    tag: "Quốc tế",
    tagColor: "text-sky-600",
    title: "Roaming toàn cầu",
    desc: "Kết nối tại hơn 200 quốc gia với gói roaming linh hoạt, dữ liệu không giới hạn.",
    badge: "",
    badgeClass: "",
  },
  {
    icon: Headphones,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    iconBorder: "border-rose-100",
    glowColor: "rgba(228,0,43,0.1)",
    borderGlow: "border-rose-200",
    tag: "VIP Care",
    tagColor: "text-rose-600",
    title: "Hỗ trợ VIP 24/7",
    desc: "Đường dây hỗ trợ ưu tiên dành riêng cho khách hàng cao cấp với thời gian phản hồi dưới 30 giây.",
    badge: "VIP",
    badgeClass: "bg-rose-50 text-rose-600 border-rose-100",
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
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`rounded-3xl bg-white border ${
        hovered ? card.borderGlow + " shadow-xl" : "border-slate-100 shadow-xs"
      } p-7 cursor-pointer transition-all duration-300 relative overflow-hidden`}
      style={{
        boxShadow: hovered ? `0 20px 40px -15px ${card.glowColor}` : "0 4px 12px rgba(0,0,0,0.01)",
      }}
    >
      {/* Background radial glow on hover */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none blur-2xl opacity-0 transition-opacity duration-500"
        style={{
          background: card.glowColor.replace("0.1", "0.3"),
          opacity: hovered ? 1 : 0,
        }}
      />

      <div className="flex items-start justify-between mb-5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.iconBg} border ${card.iconBorder} transition-transform duration-300 ${hovered ? "scale-110" : ""}`}>
          <Icon size={22} className={card.iconColor} />
        </div>
        {card.badge && (
          <span className={`border rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${card.badgeClass}`}>
            {card.badge.toUpperCase()}
          </span>
        )}
      </div>

      <div className={`text-[10px] font-bold tracking-widest uppercase mb-2 ${card.tagColor}`}>
        {card.tag}
      </div>
      <h3 className="text-slate-800 text-lg font-bold mb-2.5 leading-snug">
        {card.title}
      </h3>
      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed m-0">
        {card.desc}
      </p>
    </motion.div>
  );
}

export function FeatureCards() {
  return (
    <section className="bg-slate-50 py-20 font-outfit border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-3">
            Dịch vụ nổi bật
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Hệ sinh thái số{" "}
            <span className="bg-gradient-to-r from-blue-600 to-red-500 bg-clip-text text-transparent">
              toàn diện
            </span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Từ kết nối siêu tốc đến dịch vụ chăm sóc tận tâm, MobiFone đồng hành cùng bạn trong mọi khoảnh khắc số.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <FeatureCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
