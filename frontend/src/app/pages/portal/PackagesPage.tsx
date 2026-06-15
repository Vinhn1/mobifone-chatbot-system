import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Wifi, Phone, Zap, Star, Check, Filter, Search } from "lucide-react";

type Category = "all" | "data" | "voice" | "unlimited";

const PACKAGES = [
  { id: "TK79", name: "TK79", price: "79.000đ", data: "2GB/ngày", voice: "30p/ngày", validity: "30 ngày", category: "data" as const, features: ["4G LTE", "SMS miễn phí", "MobiFone TV"], color: "#64748B", popular: false },
  { id: "TK99", name: "TK99", price: "99.000đ", data: "3GB/ngày", voice: "Nội mạng miễn phí", validity: "30 ngày", category: "data" as const, features: ["5G Ready", "SMS miễn phí", "MobiFone TV"], color: "#0055A5", popular: false },
  { id: "TK135", name: "TK135", price: "135.000đ", data: "4GB/ngày", voice: "Nội mạng miễn phí + 20p ngoại mạng", validity: "30 ngày", category: "data" as const, features: ["5G Ready", "SMS miễn phí", "MobiFone TV+", "Cloud 5GB"], color: "#E4002B", popular: true },
  { id: "TK199", name: "TK199", price: "199.000đ", data: "6GB/ngày", voice: "Tất cả mạng miễn phí", validity: "30 ngày", category: "unlimited" as const, features: ["5G Ultra", "Roaming ASEAN", "TV360 1 tháng", "Cloud 20GB"], color: "#7C3AED", popular: false },
  { id: "V90", name: "V90", price: "90.000đ", data: "1GB/ngày", voice: "1000p nội mạng", validity: "30 ngày", category: "voice" as const, features: ["4G LTE", "SMS 500 tin"], color: "#059669", popular: false },
  { id: "V150", name: "V150", price: "150.000đ", data: "2GB/ngày", voice: "Không giới hạn nội mạng", validity: "30 ngày", category: "voice" as const, features: ["5G Ready", "SMS 1000 tin", "Gọi quốc tế -30%"], color: "#0284C7", popular: false },
  { id: "MAX299", name: "MAX299", price: "299.000đ", data: "Không giới hạn", voice: "Tất cả mạng miễn phí", validity: "30 ngày", category: "unlimited" as const, features: ["5G Ultra", "Roaming 10 nước", "TV360", "Cloud 50GB", "Priority Support"], color: "#DC2626", popular: false },
  { id: "S49", name: "S49", price: "49.000đ", data: "500MB/ngày", voice: "10p/ngày", validity: "30 ngày", category: "data" as const, features: ["4G LTE", "Gói sinh viên"], color: "#4F46E5", popular: false },
];

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Tất cả", icon: Filter },
  { key: "data", label: "Gói Data", icon: Wifi },
  { key: "voice", label: "Gói Gọi", icon: Phone },
  { key: "unlimited", label: "Không giới hạn", icon: Zap },
];

export function PackagesPage() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = PACKAGES.filter(p => {
    const matchCat = category === "all" || p.category === category;
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) || p.price.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="bg-slate-50 min-h-screen font-outfit">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0B192C] via-[#0055A5] to-[#0B192C] py-20 px-6 relative overflow-hidden text-center">
        {/* Glow Effects */}
        <div className="absolute top-[-100px] right-[-50px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(228,0,43,0.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(0,180,255,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="text-[#FFD200] text-xs font-bold tracking-widest uppercase mb-3.5">
            MobiFone Portal
          </div>
          <h1 className="text-white text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
            Tìm gói cước{" "}
            <span className="bg-gradient-to-r from-[#FFD200] to-[#E4002B] bg-clip-text text-transparent">
              hoàn hảo
            </span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base font-medium max-w-xl mx-auto mb-8">
            Hơn {PACKAGES.length} gói cước linh hoạt với ưu đãi khủng, tốc độ mạng vượt trội.
          </p>

          {/* Search container */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 bg-white/8 backdrop-blur-md border border-white/15 focus-within:border-white/30 focus-within:bg-white/12 rounded-2xl px-4.5 h-12 shadow-inner transition-all duration-200">
              <Search size={16} className="text-white/40 shrink-0" />
              <input
                placeholder="Tìm tên gói cước (Ví dụ: TK135, TK99...)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-semibold placeholder-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="bg-white border-b border-slate-200/60 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto py-3 items-center scrollbar-none">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 ${
                  category === key
                    ? "border-[#0055A5] bg-[#0055A5]/5 text-[#0055A5]"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="text-slate-400 text-xs font-semibold shrink-0">
              Tìm thấy <span className="text-slate-700 font-bold">{filtered.length}</span> gói cước
            </div>
          </div>
        </div>
      </div>

      {/* Package grid */}
      <div className="max-w-7xl mx-auto px-6 py-10 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200/50 rounded-3xl text-slate-400">
            <Search size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-bold text-sm">Không tìm thấy gói cước phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Thử lại với từ khóa khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-3xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
                style={{
                  border: pkg.popular ? `2px solid ${pkg.color}` : "1px solid rgba(226, 232, 240, 0.8)",
                  boxShadow: pkg.popular ? `0 8px 24px ${pkg.color}15` : "0 2px 6px rgba(0,0,0,0.02)",
                }}
              >
                <div>
                  {pkg.popular && (
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5"
                      style={{ background: `linear-gradient(90deg, ${pkg.color}, #FFD200)` }}
                    />
                  )}
                  {pkg.popular && (
                    <div
                      className="absolute top-3 right-3 text-white rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-xs"
                      style={{ background: `linear-gradient(135deg, ${pkg.color}, #FF9900)` }}
                    >
                      <Star size={9} className="fill-current" /> Phổ biến
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        background: `${pkg.color}08`,
                        borderColor: `${pkg.color}20`,
                      }}
                    >
                      <Wifi size={18} style={{ color: pkg.color }} />
                    </div>
                    <div>
                      <div className="font-black text-base" style={{ color: pkg.color }}>
                        {pkg.name}
                      </div>
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        Chu kỳ {pkg.validity}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-slate-800 text-2xl font-black tracking-tight">{pkg.price}</span>
                      <span className="text-slate-400 text-xs font-semibold">/chu kỳ</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${pkg.color}08` }}
                        >
                          <Wifi size={13} style={{ color: pkg.color }} />
                        </div>
                        <span className="text-slate-700 text-xs font-bold">
                          Data: <span className="text-slate-900 font-extrabold">{pkg.data}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${pkg.color}08` }}
                        >
                          <Phone size={13} style={{ color: pkg.color }} />
                        </div>
                        <span className="text-slate-700 text-xs font-bold truncate max-w-[200px]" title={pkg.voice}>
                          Gọi: <span className="text-slate-900 font-extrabold">{pkg.voice}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1 mb-6">
                    {pkg.features.map(f => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border"
                        style={{
                          background: `${pkg.color}06`,
                          color: pkg.color,
                          borderColor: `${pkg.color}15`,
                        }}
                      >
                        <Check size={8} className="stroke-[3]" /> {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("/login")}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer border-none transition-all active:scale-95 text-center shadow-xs"
                    style={{
                      background: pkg.popular ? `linear-gradient(135deg, ${pkg.color}, ${pkg.color}CC)` : `${pkg.color}10`,
                      color: pkg.popular ? "white" : pkg.color,
                    }}
                  >
                    Đăng ký ngay
                  </button>
                  <button className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-slate-300 text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer transition-all">
                    Chi tiết
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
