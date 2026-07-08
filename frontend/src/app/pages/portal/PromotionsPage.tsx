import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Flame, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function useCountdown(targetSeconds: number) {
  const [timeLeft, setTimeLeft] = useState(targetSeconds);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  return { h, m, s, done: timeLeft === 0 };
}

function CountdownTimer({ seconds }: { seconds: number }) {
  const { h, m, s, done } = useCountdown(seconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1">
      {[pad(h), pad(m), pad(s)].map((val, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className={`inline-flex items-center justify-center min-w-[34px] h-[34px] rounded-lg border font-black text-sm ${
              done ? "bg-red-50 text-red-500 border-red-200" : "bg-slate-100 text-slate-800 border-slate-200/50"
            }`}
          >
            {val}
          </span>
          {i < 2 && <span className="text-slate-400 font-bold text-sm">:</span>}
        </span>
      ))}
    </div>
  );
}

function SoldProgress({ pct, color }: { pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Đã bán</span>
        <span className="text-xs font-black" style={{ color: pct > 80 ? "#EF4444" : color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: pct > 80
              ? "linear-gradient(90deg, #EF4444, #DC2626)"
              : `linear-gradient(90deg, ${color}, ${color}CC)`,
          }}
        />
      </div>
    </div>
  );
}

const DEALS = [
  {
    badge: "FLASH SALE", badgeColor: "#E4002B",
    icon: "⚡", name: "TK199 Super", category: "Data",
    originalPrice: "199.000đ", discountedPrice: "139.000đ", discount: "30%",
    data: "6GB/ngày · 30 ngày", features: ["Gọi miễn phí mọi mạng", "Roaming ASEAN", "TV360"],
    color: "#E4002B", secondsLeft: 3 * 3600 + 45 * 60 + 20, soldPct: 87,
  },
  {
    badge: "HOT DEAL", badgeColor: "#FF9900",
    icon: "🎁", name: "TK135 Plus", category: "Data",
    originalPrice: "135.000đ", discountedPrice: "99.000đ", discount: "27%",
    data: "4GB/ngày · 30 ngày", features: ["Nội mạng miễn phí", "20p ngoại mạng", "5G Ready"],
    color: "#FF9900", secondsLeft: 8 * 3600 + 12 * 60 + 5, soldPct: 64,
  },
  {
    badge: "eSIM PROMO", badgeColor: "#0055A5",
    icon: "📱", name: "eSIM Premium", category: "eSIM",
    originalPrice: "135.000đ", discountedPrice: "Miễn phí", discount: "100%",
    data: "10GB · 30 ngày", features: ["Phí kích hoạt miễn phí", "Chuyển từ SIM vật lý", "5G Ready"],
    color: "#0055A5", secondsLeft: 24 * 3600, soldPct: 41,
  },
  {
    badge: "MEMBER VIP", badgeColor: "#8B5CF6",
    icon: "👑", name: "MAX299 Elite", category: "Unlimited",
    originalPrice: "299.000đ", discountedPrice: "199.000đ", discount: "33%",
    data: "Không giới hạn · 30 ngày", features: ["Tất cả mạng miễn phí", "Roaming 10 nước", "Cloud 50GB"],
    color: "#8B5CF6", secondsLeft: 12 * 3600 + 30 * 60, soldPct: 29,
  },
  {
    badge: "STUDENT", badgeColor: "#10B981",
    icon: "🎓", name: "S49 Sinh viên", category: "Data",
    originalPrice: "79.000đ", discountedPrice: "49.000đ", discount: "38%",
    data: "500MB/ngày · 30 ngày", features: ["4G LTE", "Dành cho sinh viên", "SMS miễn phí"],
    color: "#10B981", secondsLeft: 36 * 3600, soldPct: 52,
  },
  {
    badge: "BUNDLE", badgeColor: "#06B6D4",
    icon: "📦", name: "Smart Bundle", category: "Voice + Data",
    originalPrice: "250.000đ", discountedPrice: "175.000đ", discount: "30%",
    data: "3GB/ngày + 1000p gọi · 30 ngày", features: ["Nội + ngoại mạng", "SMS 500 tin", "MobiFone TV+"],
    color: "#06B6D4", secondsLeft: 5 * 3600 + 20 * 60, soldPct: 73,
  },
];

export function PromotionsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { h, m, s } = useCountdown(23 * 3600 + 59 * 60 + 59);

  const categories = ["all", "Data", "eSIM", "Unlimited", "Voice + Data"];
  const filtered = activeCategory === "all" ? DEALS : DEALS.filter(d => d.category === activeCategory);

  const handleClaimOffer = (deal: typeof DEALS[0]) => {
    if (user && (user.role === "user" || user.role === "admin")) {
      let pkgCode = "TK135";
      if (deal.name.includes("199")) pkgCode = "TK199";
      else if (deal.name.includes("135")) pkgCode = "TK135";
      else if (deal.name.includes("299")) pkgCode = "MAX299";
      else if (deal.name.includes("49")) pkgCode = "S49";
      else if (deal.name.includes("eSIM")) pkgCode = "TK135";
      navigate(`/packages?code=${pkgCode}`);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-outfit">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#5C0612] via-[#E4002B] to-[#0B192C] py-20 px-6 relative overflow-hidden text-center">
        {/* Glow effects */}
        <div className="absolute top-[-100px] right-[-50px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(0,85,165,0.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(255,210,0,0.12)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-4.5 py-1.5 mb-5 shadow-xs">
              <Flame size={14} className="text-[#FFD200] animate-pulse" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">Flash Deals · Chỉ hôm nay</span>
            </div>
            <h1 className="text-white text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Ưu đãi{" "}
              <span className="bg-gradient-to-r from-[#FFD200] to-[#E4002B] bg-clip-text text-transparent">
                CỰC SỐC
              </span>{" "}
              đang diễn ra
            </h1>
            <p className="text-white/60 text-xs sm:text-sm font-semibold mb-6">
              Thời gian khuyến mãi còn lại:
            </p>

            {/* Big countdown */}
            <div className="flex justify-center gap-3.5 mb-6">
              {[{ v: String(h).padStart(2, "0"), l: "Giờ" }, { v: String(m).padStart(2, "0"), l: "Phút" }, { v: String(s).padStart(2, "0"), l: "Giây" }].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/8 backdrop-blur-md border border-white/15 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg">
                    {v}
                  </div>
                  <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-2">{l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Category filter */}
      <div className="bg-white border-b border-slate-200/60 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto py-3 items-center scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 ${
                  activeCategory === cat
                    ? "border-[#E4002B] bg-[#E4002B]/5 text-[#E4002B]"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {cat === "all" ? "Tất cả ưu đãi" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deal cards */}
      <div className="max-w-7xl mx-auto px-6 py-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((deal, i) => (
            <motion.div
              key={deal.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/60 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Card top */}
                <div
                  className="p-5 relative border-b"
                  style={{
                    background: `linear-gradient(135deg, ${deal.color}08 0%, ${deal.color}02 100%)`,
                    borderColor: `${deal.color}15`,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                        style={{
                          background: `${deal.color}08`,
                          borderColor: `${deal.color}20`,
                        }}
                      >
                        {deal.icon}
                      </div>
                      <div>
                        <div className="text-slate-800 font-extrabold text-base">{deal.name}</div>
                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                          {deal.category}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs"
                        style={{ backgroundColor: deal.badgeColor }}
                      >
                        {deal.badge}
                      </span>
                      <span className="bg-emerald-50 text-emerald-600 rounded-lg px-2 py-0.5 text-[10px] font-black">
                        -{deal.discount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 pb-0">
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-slate-800 text-2xl font-black tracking-tight" style={{ color: deal.color }}>
                      {deal.discountedPrice}
                    </span>
                    <span className="text-slate-400 text-xs font-semibold line-through">
                      {deal.originalPrice}
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs font-semibold mb-4">{deal.data}</div>

                  {/* Features */}
                  <div className="flex flex-col gap-2 mb-5">
                    {deal.features.map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <div
                          className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-black"
                          style={{
                            background: `${deal.color}08`,
                            borderColor: `${deal.color}25`,
                            color: deal.color,
                          }}
                        >
                          ✓
                        </div>
                        <span className="text-slate-600 text-xs font-medium">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Countdown + sold progress */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 mb-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock size={13} className="text-[#E4002B]" />
                        <span className="text-slate-800 text-xs font-bold">Còn lại:</span>
                      </div>
                      <CountdownTimer seconds={deal.secondsLeft} />
                    </div>
                    <SoldProgress pct={deal.soldPct} color={deal.color} />
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => handleClaimOffer(deal)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer border-none transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 text-white shadow-md shadow-slate-200/50"
                  style={{
                    background: `linear-gradient(135deg, ${deal.color}, ${deal.color}CC)`,
                  }}
                >
                  Lấy ưu đãi ngay <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
