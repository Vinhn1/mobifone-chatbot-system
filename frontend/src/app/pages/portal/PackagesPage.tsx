import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router";
import { Wifi, Phone, Zap, Star, Check, Filter, Search, X, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const API_BASE = "http://localhost:3000";

type Category = "all" | "data" | "voice" | "unlimited";

const PACKAGES = [
  { id: "TK79", name: "TK79", price: "79.000đ", data: "2GB/ngày", voice: "30p/ngày", validity: "30 ngày", category: "data" as const, features: ["4G LTE", "SMS miễn phí", "MobiFone TV"], color: "#64748B", popular: false, dataTotalGB: 60, voiceTotalMin: 900 },
  { id: "TK99", name: "TK99", price: "99.000đ", data: "3GB/ngày", voice: "Nội mạng miễn phí", validity: "30 ngày", category: "data" as const, features: ["5G Ready", "SMS miễn phí", "MobiFone TV"], color: "#0055A5", popular: false, dataTotalGB: 90, voiceTotalMin: 600 },
  { id: "TK135", name: "TK135", price: "135.000đ", data: "4GB/ngày", voice: "Nội mạng miễn phí + 20p ngoại mạng", validity: "30 ngày", category: "data" as const, features: ["5G Ready", "SMS miễn phí", "MobiFone TV+", "Cloud 5GB"], color: "#E4002B", popular: true, dataTotalGB: 120, voiceTotalMin: 620 },
  { id: "TK199", name: "TK199", price: "199.000đ", data: "6GB/ngày", voice: "Tất cả mạng miễn phí", validity: "30 ngày", category: "unlimited" as const, features: ["5G Ultra", "Roaming ASEAN", "TV360 1 tháng", "Cloud 20GB"], color: "#7C3AED", popular: false, dataTotalGB: 180, voiceTotalMin: 1000 },
  { id: "V90", name: "V90", price: "90.000đ", data: "1GB/ngày", voice: "1000p nội mạng", validity: "30 ngày", category: "voice" as const, features: ["4G LTE", "SMS 500 tin"], color: "#059669", popular: false, dataTotalGB: 30, voiceTotalMin: 1000 },
  { id: "V150", name: "V150", price: "150.000đ", data: "2GB/ngày", voice: "Không giới hạn nội mạng", validity: "30 ngày", category: "voice" as const, features: ["5G Ready", "SMS 1000 tin", "Gọi quốc tế -30%"], color: "#0284C7", popular: false, dataTotalGB: 60, voiceTotalMin: 1000 },
  { id: "MAX299", name: "MAX299", price: "299.000đ", data: "Không giới hạn", voice: "Tất cả mạng miễn phí", validity: "30 ngày", category: "unlimited" as const, features: ["5G Ultra", "Roaming 10 nước", "TV360", "Cloud 50GB", "Priority Support"], color: "#DC2626", popular: false, dataTotalGB: 999, voiceTotalMin: 2000 },
  { id: "S49", name: "S49", price: "49.000đ", data: "500MB/ngày", voice: "10p/ngày", validity: "30 ngày", category: "data" as const, features: ["4G LTE", "Gói sinh viên"], color: "#4F46E5", popular: false, dataTotalGB: 15, voiceTotalMin: 300 },
];

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Tất cả", icon: Filter },
  { key: "data", label: "Gói Data", icon: Wifi },
  { key: "voice", label: "Gói Gọi", icon: Phone },
  { key: "unlimited", label: "Không giới hạn", icon: Zap },
];

export function PackagesPage() {
  const { user, updateUser } = useAuth();
  const [packages, setPackages] = useState<any[]>(PACKAGES);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("all");
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get("code");

  useEffect(() => {
    let active = true;
    const fetchPackages = async () => {
      try {
        const response = await axios.get(`${API_BASE}/packages`);
        if (active && response.data && Array.isArray(response.data) && response.data.length > 0) {
          const mappedPackages = response.data.map(p => ({
            ...p,
            category: p.category as Category,
            features: Array.isArray(p.features) ? p.features : (typeof p.features === 'string' ? JSON.parse(p.features) : []),
          }));
          setPackages(mappedPackages);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách gói cước từ server:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPackages();
    return () => { active = false; };
  }, []);

  const getPackageData = (codeUpper: string) => {
    const pkg = packages.find(p => p.id === codeUpper);
    const dataTotal = pkg ? pkg.dataTotalGB : 120;
    const voiceTotal = pkg ? pkg.voiceTotalMin : 600;
    const name = codeUpper + " Ultra";

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
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const [regModal, setRegModal] = useState<{ open: boolean; packageCode: string; price: string; color: string; shortcode: string; syntax: string } | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedSyntax, setCopiedSyntax] = useState(false);

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegisterClick = (pkg: any) => {
    if (!user || (user.role !== "user" && user.role !== "admin")) {
      setLoginPromptOpen(true);
      return;
    }

    const code = pkg.name.toUpperCase();
    
    if (isMobileDevice()) {
      window.location.href = `sms:999?body=DK%20${code}`;
    }

    setRegModal({
      open: true,
      packageCode: code,
      price: pkg.price,
      color: pkg.color,
      shortcode: "999",
      syntax: `DK ${code}`
    });
  };

  useEffect(() => {
    if (!loading && codeParam && packages.length > 0) {
      const pkg = packages.find(p => p.id.toLowerCase() === codeParam.toLowerCase() || p.name.toLowerCase() === codeParam.toLowerCase());
      if (pkg) {
        handleRegisterClick(pkg);
      }
    }
  }, [loading, codeParam, packages, user]);

  const handleConfirmActivation = async () => {
    if (regModal) {
      if (user?.role === "admin") {
        alert("Tài khoản Quản trị viên (Admin) không thể đăng ký gói cước di động. Vui lòng sử dụng số điện thoại của Subscriber để thực hiện test chức năng này.");
        setRegModal(null);
        return;
      }
      try {
        await axios.post(`${API_BASE}/subscribers/packages/register`, {
          packageCode: regModal.packageCode
        });
        const pkgData = getPackageData(regModal.packageCode);
        updateUser(pkgData);
      } catch (error) {
        console.warn("Backend register package failed, falling back to local registration:", error);
        const pkgData = getPackageData(regModal.packageCode);
        updateUser(pkgData);
      }
      setRegModal(null);
      navigate("/dashboard/packages");
    }
  };

  const filtered = packages.filter(p => {
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
            Hơn {packages.length} gói cước linh hoạt với ưu đãi khủng, tốc độ mạng vượt trội.
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
                    onClick={() => handleRegisterClick(pkg)}
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

      {/* Modals */}
      <AnimatePresence>
        {loginPromptOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center relative"
            >
              <button
                onClick={() => setLoginPromptOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mb-4">
                <AlertCircle size={24} />
              </div>

              <h3 className="text-slate-800 font-black text-lg mb-2">Yêu cầu đăng nhập</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Vui lòng đăng nhập với tài khoản MobiFone để thực hiện đăng ký và quản lý các gói cước trực tuyến.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setLoginPromptOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 border-none cursor-pointer hover:bg-slate-200/80 transition-all"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[#0055A5] text-white border-none cursor-pointer shadow-md shadow-[#0055A5]/20 hover:bg-[#003D7A] transition-all"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {regModal && regModal.open && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col relative"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-slate-800 font-black text-lg flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: regModal.color }} />
                  Đăng ký gói {regModal.packageCode}
                </h3>
                <button
                  onClick={() => setRegModal(null)}
                  className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-slate-500 text-xs leading-relaxed mb-4">
                Để hoàn tất đăng ký gói cước <strong>{regModal.packageCode}</strong> ({regModal.price}), vui lòng thực hiện soạn tin nhắn SMS trên điện thoại của bạn với thông tin sau:
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold">Đầu số gửi:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 font-extrabold text-sm">{regModal.shortcode}</span>
                    <button
                      onClick={() => {
                        copyToClipboard(regModal.shortcode);
                        setCopiedShort(true);
                        setTimeout(() => setCopiedShort(false), 1500);
                      }}
                      className="bg-transparent border-none text-slate-400 hover:text-[#0055A5] cursor-pointer p-1 rounded-md hover:bg-slate-100 flex"
                    >
                      {copiedShort ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="h-[1px] bg-slate-200/60" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold">Cú pháp:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#E4002B] font-extrabold text-sm">{regModal.syntax}</span>
                    <button
                      onClick={() => {
                        copyToClipboard(regModal.syntax);
                        setCopiedSyntax(true);
                        setTimeout(() => setCopiedSyntax(false), 1500);
                      }}
                      className="bg-transparent border-none text-slate-400 hover:text-[#0055A5] cursor-pointer p-1 rounded-md hover:bg-slate-100 flex"
                    >
                      {copiedSyntax ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {!isMobileDevice() && (
                <a
                  href={`sms:${regModal.shortcode}?body=${encodeURIComponent(regModal.syntax)}`}
                  className="block text-center text-[#0055A5] text-xs font-bold underline mb-4 cursor-pointer hover:text-[#003D7A]"
                >
                  💬 Kích hoạt nhanh bằng ứng dụng tin nhắn của máy tính (Phone Link)
                </a>
              )}

              <div className="text-[11px] text-slate-400 mb-6 bg-blue-50/50 border border-blue-100/50 p-3 rounded-xl leading-relaxed">
                ℹ️ Phí cước dịch vụ sẽ được trừ trực tiếp từ tài khoản gốc của thuê bao MobiFone của bạn sau khi bạn nhấn gửi tin nhắn SMS thành công.
              </div>

              <button
                onClick={handleConfirmActivation}
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#0055A5] text-white border-none cursor-pointer shadow-md shadow-[#0055A5]/25 hover:bg-[#003D7A] active:scale-95 transition-all text-center"
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
