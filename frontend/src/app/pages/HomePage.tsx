import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { useNavigate } from "react-router";
import {
  MessageSquare, Brain, Users, Settings, ArrowRight, CheckCircle,
  Zap, Shield, BarChart3, ChevronRight, Bot, Database, TrendingUp
} from "lucide-react";
import { MobiFoneLogo } from "../components/MobiFoneLogo";
import { Footer } from "../components/Footer";
import { useAuth } from "../context/AuthContext";

/* ─── Animated counter hook ─── */
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return { value, ref };
}

/* ─── Dashboard Mock Card ─── */
function DashboardMock() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-[#0055A5]/20 blur-3xl rounded-3xl scale-110" />
      <div className="relative bg-white/4 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 mx-3 h-5 bg-white/6 rounded-md flex items-center px-2">
            <span className="text-white/25 text-[9px] font-mono">admin.mobifone.ai/dashboard</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399] animate-pulse" />
        </div>

        <div className="p-4 space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Cuộc hội thoại", value: "12,841", color: "text-blue-400" },
              { label: "Độ chính xác", value: "94.2%", color: "text-emerald-400" },
              { label: "Phản hồi TB", value: "1.8s", color: "text-amber-400" },
            ].map(k => (
              <div key={k.label} className="bg-white/4 rounded-xl p-2.5 border border-white/6">
                <div className={`text-base font-black ${k.color}`}>{k.value}</div>
                <div className="text-white/35 text-[9px] font-semibold mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Chat preview */}
          <div className="bg-white/3 rounded-xl border border-white/6 p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[#0055A5]/60 flex items-center justify-center">
                <Bot size={11} className="text-blue-300" />
              </div>
              <span className="text-white/50 text-[10px] font-semibold">AI Chatbot · Live</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {[
              { msg: "Xin chào! Tôi cần hỗ trợ về gói 4G MAX.", side: "right", color: "bg-white/8" },
              { msg: "Chào bạn! Gói 4G MAX hiện có ưu đãi 120GB/tháng với giá 199.000đ...", side: "left", color: "bg-[#0055A5]/30" },
            ].map((c, i) => (
              <div key={i} className={`flex ${c.side === "right" ? "justify-end" : "justify-start"}`}>
                <div className={`${c.color} rounded-xl px-3 py-1.5 max-w-[80%]`}>
                  <p className="text-white/70 text-[9px] leading-relaxed">{c.msg}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
              <span className="text-white/25 text-[9px]">AI đang soạn phản hồi...</span>
            </div>
          </div>

          {/* Mini chart */}
          <div className="bg-white/3 rounded-xl border border-white/6 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-[10px] font-semibold">Hội thoại 7 ngày</span>
              <span className="text-emerald-400 text-[10px] font-bold">↑ +18.4%</span>
            </div>
            <div className="flex items-end gap-1 h-12">
              {[40, 65, 52, 78, 90, 70, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t"
                  style={{ height: `${h}%`, background: `rgba(0,85,165,${0.3 + h/200})` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ target, suffix, label, icon: Icon, colorClass = "from-[#0055A5] to-[#0099FF]", valueColor = "text-blue-400" }: {
  target: number; suffix: string; label: string; icon: React.ElementType; colorClass?: string; valueColor?: string;
}) {
  const { value, ref } = useCountUp(target, 1800);
  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-2xl sm:text-3xl font-black ${valueColor} tracking-tight`}>
            {value.toLocaleString()}<span className="text-white">{suffix}</span>
          </div>
          <div className="text-white/50 text-xs font-semibold mt-0.5 truncate">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon: Icon, title, desc, color, delay }: {
  icon: React.ElementType; title: string; desc: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/16 rounded-2xl p-6 transition-all duration-300 cursor-default"
    >
      <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={20} className="text-white" />
      </div>
      <h3 className="text-white font-bold text-base mb-2">{title}</h3>
      <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ─── Step ─── */
function Step({ number, title, desc, delay }: { number: string; title: string; desc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex gap-5"
    >
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-2xl bg-[#0055A5] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-900/40 shrink-0">
          {number}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-[#0055A5]/40 to-transparent mt-2" />
      </div>
      <div className="pb-8">
        <h4 className="text-white font-bold text-base mb-1">{title}</h4>
        <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ─── Main Landing Page ─── */
export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#080d1a] font-outfit overflow-x-hidden">
      {/* Global keyframes */}
      <style>{`
        @keyframes grid-flow {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
      `}</style>

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Animated grid bg */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(0,85,165,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,85,165,0.07) 1px, transparent 1px)", backgroundSize: "40px 40px", animation: "grid-flow 8s linear infinite" }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 -left-[200px] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(0,85,165,0.18)_0%,transparent_65%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(227,6,19,0.10)_0%,transparent_65%)] blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(0,85,165,0.12)_0%,transparent_65%)] blur-2xl pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-6 py-20">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7 bg-[#0055A5]/10 border border-[#0055A5]/25 text-blue-400 text-xs font-bold"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399] animate-pulse inline-block" />
                Powered by MobiFone AI · Phiên bản Enterprise
                <ChevronRight size={13} />
              </motion.div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.12] mb-6">
                <span className="block text-white">Nền tảng AI Chatbot</span>
                <span className="block mt-1">
                  <span className="bg-gradient-to-r from-[#0055A5] via-[#0099FF] to-[#0055A5] bg-clip-text text-transparent bg-[length:200%] animate-[shimmer_3s_linear_infinite]">
                    Thế hệ mới
                  </span>
                  {" "}
                  <span className="text-white">cho Doanh nghiệp</span>
                </span>
              </h1>

              <style>{`
                @keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
              `}</style>

              <p className="text-white/55 text-base sm:text-lg leading-relaxed mb-9 max-w-xl mx-auto lg:mx-0">
                Tự động hóa hỗ trợ khách hàng với AI tiên tiến. Tích hợp Knowledge Base thông minh,
                phân tích hội thoại chuyên sâu và quản lý nhân sự CSKH — tất cả trong một nền tảng.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10">
                <motion.button
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(user ? "/admin" : "/login")}
                  className="flex items-center gap-2.5 bg-[#0055A5] hover:bg-[#0044CC] text-white px-8 py-3.5 rounded-2xl font-bold text-sm cursor-pointer shadow-xl shadow-blue-900/50 hover:shadow-2xl hover:shadow-blue-900/60 transition-all duration-200 border-none"
                >
                  {user ? "Vào trang quản trị" : "Đăng nhập hệ thống"}
                  <ArrowRight size={17} />
                </motion.button>
                <motion.a
                  href="#features"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 bg-white/6 hover:bg-white/10 text-white/80 hover:text-white border border-white/12 hover:border-white/20 px-8 py-3.5 rounded-2xl font-semibold text-sm cursor-pointer transition-all duration-200 no-underline"
                >
                  Khám phá tính năng
                </motion.a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                {["Bảo mật dữ liệu", "SLA 99.9%", "Hỗ trợ 24/7"].map(b => (
                  <div key={b} className="flex items-center gap-1.5 text-white/40 text-xs font-semibold">
                    <CheckCircle size={13} className="text-emerald-500" />
                    {b}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right – Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="flex-1 flex items-center justify-center animate-float"
            >
              <DashboardMock />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════ STATS BAR ══════════════════ */}
      <section className="relative py-12 border-y border-white/8 bg-gradient-to-r from-white/[0.01] via-[#0055A5]/5 to-white/[0.01]">
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard target={12000} suffix="+" label="Hội thoại / ngày" icon={MessageSquare} colorClass="from-cyan-500 to-blue-600" valueColor="text-cyan-400" />
            <StatCard target={94} suffix=".2%" label="Độ chính xác AI" icon={Brain} colorClass="from-emerald-400 to-teal-600" valueColor="text-emerald-400" />
            <StatCard target={2} suffix="s" label="Thời gian phản hồi" icon={Zap} colorClass="from-amber-400 to-orange-600" valueColor="text-amber-400" />
            <StatCard target={3} suffix=" AI" label="Mô hình tích hợp" icon={Bot} colorClass="from-purple-500 to-indigo-600" valueColor="text-purple-400" />
          </div>
        </div>
      </section>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0055A5]/10 border border-[#0055A5]/20 text-blue-400 text-xs font-bold mb-4">
              <Shield size={12} />
              Bộ tính năng toàn diện
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Mọi thứ bạn cần để vận hành
              <br />
              <span className="text-[#0055A5]">Chatbot AI chuyên nghiệp</span>
            </h2>
            <p className="text-white/45 text-base max-w-2xl mx-auto">
              Từ quản lý kiến thức đến phân tích hội thoại — MobiFone AI Platform cung cấp đầy đủ công cụ
              để đội ngũ của bạn vận hành chatbot hiệu quả.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              icon={Database}
              title="Knowledge Base"
              desc="Quản lý tài liệu, crawl web tự động, xây dựng cơ sở kiến thức thông minh cho AI."
              color="bg-[#0055A5]"
              delay={0}
            />
            <FeatureCard
              icon={BarChart3}
              title="Chat Mining"
              desc="Phân tích sâu hội thoại, nhận diện chủ đề, xu hướng và hành vi khách hàng theo thời gian thực."
              color="bg-purple-600"
              delay={0.1}
            />
            <FeatureCard
              icon={Users}
              title="Quản lý Nhân sự"
              desc="Phân quyền Admin/CSKH, theo dõi hiệu suất, quản lý ca trực và tích hợp CRM leads."
              color="bg-emerald-600"
              delay={0.2}
            />
            <FeatureCard
              icon={Settings}
              title="Cấu hình Bot"
              desc="Tùy chỉnh tính cách AI, thiết lập quy tắc phản hồi, kiểm thử prompt và triển khai theo môi trường."
              color="bg-amber-600"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left – steps */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-10"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
                  <TrendingUp size={12} />
                  Triển khai nhanh chóng
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                  3 bước đến chatbot
                  <span className="text-emerald-400"> chuyên nghiệp</span>
                </h2>
                <p className="text-white/45 text-base leading-relaxed">
                  Quy trình triển khai đơn giản, được thiết kế cho đội ngũ không chuyên kỹ thuật.
                </p>
              </motion.div>

              <div className="flex flex-col">
                <Step number="01" title="Cấu hình Knowledge Base" desc="Tải lên tài liệu, kết nối URL, hoặc để AI tự crawl dữ liệu từ website của bạn. Hệ thống RAG sẽ tự động xử lý và lập chỉ mục." delay={0.1} />
                <Step number="02" title="Deploy & Kết nối Chatbot" desc="Cấu hình tính cách bot, thiết lập quy tắc phản hồi. Kiểm thử trên Prompt Playground trước khi đưa vào production." delay={0.2} />
                <Step number="03" title="Phân tích & Tối ưu liên tục" desc="Theo dõi hội thoại thời gian thực, khai thác insights qua Chat Mining, cải thiện độ chính xác AI theo chu kỳ." delay={0.3} />
              </div>
            </div>

            {/* Right – highlights */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              {[
                { icon: Brain, title: "AI đa mô hình", desc: "Tích hợp GPT-4o, Gemini, Llama — linh hoạt chuyển đổi theo nhu cầu", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/15" },
                { icon: Shield, title: "Bảo mật dữ liệu", desc: "Dữ liệu được mã hóa AES-256, tuân thủ tiêu chuẩn bảo mật doanh nghiệp", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
                { icon: Zap, title: "Hiệu suất cao", desc: "Xử lý đồng thời hàng nghìn hội thoại với độ trễ < 2 giây", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/15" },
                { icon: BarChart3, title: "Báo cáo chi tiết", desc: "Dashboard thời gian thực với 50+ metrics giúp tối ưu vận hành", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/15" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-start gap-4 p-4 rounded-2xl border ${item.bg}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${item.bg} border flex items-center justify-center shrink-0`}>
                    <item.icon size={17} className={item.color} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm mb-0.5">{item.title}</div>
                    <div className="text-white/40 text-xs leading-relaxed">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA SECTION (Ẩn khi đã đăng nhập) ══════════════════ */}
      {!user && (
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0055A5]/30 via-[#0044CC]/20 to-[#080d1a] border border-[#0055A5]/25 p-12 text-center"
            >
              {/* Inner glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,85,165,0.2)_0%,transparent_60%)]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-24 bg-gradient-to-b from-[#0055A5]/60 to-transparent" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0055A5]/15 border border-[#0055A5]/30 text-blue-300 text-xs font-bold mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Hệ thống đang hoạt động · Sẵn sàng triển khai
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                  Sẵn sàng nâng cao hiệu quả
                  <br />
                  <span className="text-[#4d9de0]">vận hành CSKH?</span>
                </h2>
                <p className="text-white/50 text-base mb-8 max-w-lg mx-auto">
                  Đăng nhập để bắt đầu quản lý chatbot AI của bạn ngay hôm nay.
                </p>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-3 bg-[#0055A5] hover:bg-[#0044CC] text-white px-10 py-4 rounded-2xl font-bold text-base cursor-pointer shadow-xl shadow-blue-900/60 hover:shadow-2xl hover:shadow-blue-900/70 transition-all duration-200 border-none"
                >
                  Đăng nhập ngay
                  <ArrowRight size={20} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════ FOOTER ══════════════════ */}
      <Footer />
    </div>
  );
}
