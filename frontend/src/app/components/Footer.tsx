import { Link } from "react-router";
import { MobiFoneLogo } from "./MobiFoneLogo";
import {
  MessageSquare, Brain, BarChart3, Settings, Shield,
  Mail, Phone, MapPin, ExternalLink, ChevronRight, TrendingUp
} from "lucide-react";

const FOOTER_LINKS = {
  platform: {
    title: "Nền tảng",
    links: [
      { label: "Tính năng", href: "#features" },
      { label: "Cách hoạt động", href: "#how-it-works" },
      { label: "Bảo mật & Tuân thủ", href: "#security" },
    ],
  },
  modules: {
    title: "Modules",
    links: [
      { label: "Knowledge Base", href: "/admin/knowledge" },
      { label: "Chat Mining", href: "/admin/chat-mining" },
      { label: "Quản lý Leads", href: "/admin/leads" },
      { label: "Bot Configuration", href: "/admin/bot-config" },
      { label: "Prompt Playground", href: "/admin/playground" },
    ],
  },
  company: {
    title: "MobiFone",
    links: [
      { label: "Giới thiệu", href: "https://www.mobifone.vn/gioi-thieu", external: true },
      { label: "Trang chủ MobiFone", href: "https://www.mobifone.vn", external: true },
      { label: "Chính sách bảo mật", href: "https://www.mobifone.vn/chinh-sach-bao-mat", external: true },
    ],
  },
};

const STATS = [
  {
    icon: MessageSquare,
    value: "12K+",
    label: "Hội thoại / ngày",
    trend: "+18.4% tuần này",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    borderColor: "border-cyan-500/30 hover:border-cyan-400/60",
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
    iconColor: "text-white",
    glowColor: "shadow-cyan-500/25",
    valueColor: "text-cyan-300"
  },
  {
    icon: Brain,
    value: "94.2%",
    label: "Độ chính xác AI",
    trend: "Đạt chuẩn Enterprise",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    borderColor: "border-emerald-500/30 hover:border-emerald-400/60",
    iconBg: "bg-gradient-to-br from-emerald-400 to-teal-600",
    iconColor: "text-white",
    glowColor: "shadow-emerald-500/25",
    valueColor: "text-emerald-300"
  },
  {
    icon: BarChart3,
    value: "50+",
    label: "Chỉ số theo dõi",
    trend: "Real-time analytics",
    gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    borderColor: "border-purple-500/30 hover:border-purple-400/60",
    iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
    iconColor: "text-white",
    glowColor: "shadow-purple-500/25",
    valueColor: "text-purple-300"
  },
  {
    icon: Settings,
    value: "3",
    label: "AI Models tích hợp",
    trend: "GPT-4o · Gemini · Llama",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    borderColor: "border-amber-500/30 hover:border-amber-400/60",
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-600",
    iconColor: "text-white",
    glowColor: "shadow-amber-500/25",
    valueColor: "text-amber-300"
  },
];

export function Footer() {
  return (
    <footer className="relative bg-[#050a15] border-t border-white/8 font-outfit overflow-hidden">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#0055A5] to-transparent" />

      {/* Background decoration */}
      <div className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,85,165,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      {/* ── STATS STRIP REDESIGNED ── */}
      <div className="border-b border-white/8 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map(s => (
              <div
                key={s.label}
                className={`group relative overflow-hidden rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border ${s.borderColor} p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${s.glowColor}`}
              >
                {/* Subtle card background gradient glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-40 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none`} />

                <div className="relative z-10 flex items-center gap-4">
                  {/* Glowing Icon Box */}
                  <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 shadow-lg ${s.glowColor} group-hover:scale-110 transition-transform duration-300`}>
                    <s.icon size={22} className={s.iconColor} />
                  </div>

                  {/* Text metrics */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`text-2xl sm:text-3xl font-black ${s.valueColor} tracking-tight drop-shadow-sm`}>
                        {s.value}
                      </span>
                    </div>
                    <div className="text-white/80 font-bold text-xs truncate mt-0.5">
                      {s.label}
                    </div>
                    <div className="text-white/35 text-[10px] font-semibold flex items-center gap-1 mt-1 truncate">
                      <TrendingUp size={10} className="text-emerald-400 shrink-0" />
                      <span>{s.trend}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <MobiFoneLogo size={36} dark={false} />
              <div>
                <div className="text-white/90 font-black text-sm">MobiFone</div>
                <div className="text-white/30 text-[9px] font-semibold tracking-widest uppercase">AI Platform</div>
              </div>
            </div>

            <p className="text-white/40 text-sm leading-relaxed mb-6 max-w-xs">
              Nền tảng AI Chatbot thế hệ mới dành cho doanh nghiệp — tự động hóa CSKH, phân tích hội thoại thông minh và quản lý đội ngũ tập trung.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5">
              <a
                href="mailto:vttt4cmu@mobifone.vn"
                className="flex items-start gap-2.5 text-white/40 hover:text-blue-400 text-xs no-underline transition-colors group"
              >
                <Mail size={13} className="mt-0.5 shrink-0 text-white/25 group-hover:text-blue-400" />
                <span className="leading-relaxed">vttt4cmu@mobifone.vn</span>
              </a>
              <a
                href="tel:0774064999"
                className="flex items-start gap-2.5 text-white/40 hover:text-blue-400 text-xs no-underline transition-colors group"
              >
                <Phone size={13} className="mt-0.5 shrink-0 text-white/25 group-hover:text-blue-400" />
                <span className="leading-relaxed">077 406 4999</span>
              </a>
              <div className="flex items-start gap-2.5 text-white/40 text-xs">
                <MapPin size={13} className="mt-0.5 shrink-0 text-white/25" />
                <span className="leading-relaxed">Số 71, Đường Phan Ngọc Hiển, Phường Tân Thành, Tỉnh Cà Mau</span>
              </div>
            </div>
          </div>

          {/* Links columns */}
          {Object.values(FOOTER_LINKS).map(section => (
            <div key={section.title}>
              <h4 className="text-white/80 font-bold text-xs tracking-[0.08em] uppercase mb-4">{section.title}</h4>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {section.links.map(link => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs font-medium transition-colors duration-200 no-underline group"
                      >
                        <ChevronRight size={11} className="text-white/20 group-hover:text-[#0055A5] transition-colors" />
                        {link.label}
                        <ExternalLink size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                      </a>
                    ) : link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs font-medium transition-colors duration-200 no-underline group"
                      >
                        <ChevronRight size={11} className="text-white/20 group-hover:text-[#0055A5] transition-colors" />
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs font-medium transition-colors duration-200 no-underline group"
                      >
                        <ChevronRight size={11} className="text-white/20 group-hover:text-[#0055A5] transition-colors" />
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-white/25 text-[11px]">
            <span>© 2025 Tổng Công ty Viễn thông MobiFone</span>
            <span className="w-px h-3 bg-white/15" />
            <span>Bảo lưu mọi quyền</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/4 border border-white/8">
              <Shield size={11} className="text-emerald-400" />
              <span className="text-white/40 text-[10px] font-semibold">Hệ thống nội bộ · Chỉ dành cho nhân viên</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[10px] font-bold">Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
