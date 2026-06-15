import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Check, Smartphone, QrCode, Download, Wifi, Zap } from "lucide-react";

const STEPS = [
  { icon: QrCode, title: "Chọn gói eSIM", desc: "Chọn gói data phù hợp với nhu cầu của bạn và hoàn tất thanh toán online." },
  { icon: Download, title: "Nhận QR Code", desc: "QR Code sẽ được gửi qua email và hiển thị ngay trên màn hình sau khi thanh toán." },
  { icon: Smartphone, title: "Quét QR bằng điện thoại", desc: "Vào Cài đặt > Di động/Cellular > Thêm eSIM > Quét mã QR vừa nhận." },
  { icon: Wifi, title: "Kết nối ngay!", desc: "eSIM được kích hoạt trong vài giây. Tận hưởng tốc độ 5G không giới hạn!" },
];

const PLANS = [
  { name: "Basic", data: "1GB", days: 7, price: "29.000đ", color: "#64748B", popular: false },
  { name: "Standard", data: "3GB", days: 30, price: "79.000đ", color: "#0055A5", popular: false },
  { name: "Premium", data: "10GB", days: 30, price: "135.000đ", color: "#FF9900", popular: true },
  { name: "Unlimited", data: "∞ GB", days: 30, price: "199.000đ", color: "#A855F7", popular: false },
];

function PhoneMockup({ activeStep }: { activeStep: number }) {
  return (
    <div className="w-[240px] h-[440px] rounded-[36px] bg-gradient-to-b from-[#1A1A2E] to-[#0D0D1A] border-8 border-white/5 relative shadow-2xl shrink-0 overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#0D0D1A] rounded-b-2xl z-10" />

      {/* Screen content */}
      <div className="absolute inset-0 p-9 pt-10 flex flex-col">
        {/* Status bar */}
        <div className="flex justify-between mb-3 px-1">
          <span className="text-white text-[9px] font-bold">9:41</span>
          <div className="flex gap-1 items-center">
            <Wifi size={10} className="text-white" />
            <span className="text-white text-[9px] font-bold">5G</span>
          </div>
        </div>

        {/* App screen */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 h-[calc(100%-36px)] flex flex-col items-center gap-2.5">
          <div className="text-white/40 text-[8px] font-bold tracking-widest uppercase">Cài đặt · eSIM</div>

          {/* QR code visual */}
          <div className="w-28 h-28 rounded-xl bg-white flex items-center justify-center relative shadow-lg shadow-[#0055A5]/20">
            {/* Fake QR pattern */}
            <div className="w-20 h-20 relative">
              {[0, 1, 2, 3].map(r =>
                [0, 1, 2, 3].map(c => (
                  <div
                    key={`${r}-${c}`}
                    className="absolute rounded-xs"
                    style={{
                      left: c * 20,
                      top: r * 20,
                      width: 16,
                      height: 16,
                      background: (r + c) % 2 === 0 ? "#0B192C" : "transparent",
                    }}
                  />
                ))
              )}
            </div>
            {/* Scanner line */}
            {activeStep === 2 && (
              <motion.div
                animate={{ top: [10, 102, 10] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#00B4FF] to-transparent shadow-[0_0_8px_#00B4FF]"
              />
            )}
          </div>

          {activeStep >= 2 && (
            <div className="text-center">
              <div className="text-white text-[10px] font-bold">MobiFone eSIM</div>
              <div className="text-white/40 text-[8px] mt-0.5">Đang quét mã kích hoạt...</div>
            </div>
          )}

          {activeStep >= 3 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              <Check size={14} className="text-white stroke-[3]" />
            </motion.div>
          )}

          {activeStep >= 3 && (
            <div className="text-center">
              <div className="text-emerald-400 text-[10px] font-bold">Thành công!</div>
              <div className="text-white/40 text-[8px] mt-0.5">MobiFone 5G đã kích hoạt</div>
            </div>
          )}
        </div>
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white/20 rounded-full" />
    </div>
  );
}

export function ESIMPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(2);
  const navigate = useNavigate();

  return (
    <div className="bg-slate-50 min-h-screen font-outfit">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0B192C] via-[#0055A5] to-[#0B192C] py-24 px-6 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-[-100px] right-[-50px] w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(228,0,43,0.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-50px] w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(0,180,255,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 justify-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center lg:text-left max-w-xl"
            >
              <div className="inline-flex items-center gap-1.5 bg-[#00B4FF]/12 border border-[#00B4FF]/25 rounded-full px-4 py-1.5 mb-5 shadow-xs">
                <Zap size={14} className="text-[#00B4FF] animate-pulse" />
                <span className="text-[#00B4FF] text-xs font-bold uppercase tracking-wider">MobiFone eSIM Thế Hệ Mới</span>
              </div>
              <h1 className="text-white text-3xl sm:text-5xl font-black tracking-tight mb-5 leading-tight">
                Kích hoạt eSIM{" "}
                <span className="bg-gradient-to-r from-[#FFD200] to-[#E4002B] bg-clip-text text-transparent">
                  chỉ trong 5 phút
                </span>
              </h1>
              <p className="text-white/60 text-sm sm:text-base font-medium leading-relaxed mb-8">
                Bỏ qua SIM vật lý truyền thống. Chọn gói cước, nhận mã QR qua email và quét mã trực tiếp trên điện thoại để trải nghiệm mạng 5G siêu tốc tức thì.
              </p>
              <div className="flex flex-wrap gap-3.5 justify-center lg:justify-start">
                <button
                  onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FFD200] to-[#E4002B] text-white border-none font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Xem các gói eSIM
                </button>
                <button className="px-6 py-3 rounded-xl bg-transparent border border-white/20 hover:border-white/30 text-white font-bold text-sm cursor-pointer transition-all">
                  Kiểm tra tương thích máy
                </button>
              </div>
            </motion.div>

            {/* Right Column */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row items-center gap-8 justify-center"
            >
              <PhoneMockup activeStep={activeStep} />
              {/* Steps selection list */}
              <div className="flex flex-col gap-3 max-w-xs w-full">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === activeStep;
                  const isDone = i < activeStep;
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className={`flex items-start gap-3.5 p-4 rounded-2xl cursor-pointer border transition-all duration-200 ${
                        isActive
                          ? "bg-white/10 border-[#00B4FF]/40 shadow-lg shadow-[#0055A5]/15"
                          : "bg-white/3 border-white/5 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white transition-all duration-200 ${
                          isDone
                            ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20"
                            : isActive
                            ? "bg-gradient-to-br from-[#0055A5] to-[#00B4FF] shadow-md shadow-[#0055A5]/25"
                            : "bg-white/8 text-white/40"
                        }`}
                      >
                        {isDone ? <Check size={15} className="stroke-[3]" /> : <Icon size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold text-sm leading-snug ${isActive ? "text-white" : "text-white/60"}`}>
                          {i + 1}. {s.title}
                        </div>
                        {isActive && (
                          <div className="text-white/40 text-xs leading-normal mt-1.5 font-medium">
                            {s.desc}
                          </div>
                        )}
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
      <section id="plans" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[#FF9900] text-[10px] font-bold tracking-widest uppercase mb-1.5">Bảng giá eSIM</div>
            <h2 className="text-slate-800 text-2xl sm:text-3xl font-black tracking-tight mb-3">Chọn gói eSIM của bạn</h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-sm mx-auto">
              Mua và kích hoạt hoàn toàn trực tuyến. Không thủ tục phức tạp, không cần tới quầy giao dịch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedPlan(i)}
                className={`rounded-3xl p-6 cursor-pointer border transition-all duration-300 flex flex-col justify-between ${
                  selectedPlan === i
                    ? "bg-[#0B192C] text-white border-[#0055A5] shadow-xl shadow-[#0055A5]/10"
                    : "bg-white text-slate-800 border-slate-200/60 shadow-xs hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="font-bold text-[10px] tracking-widest uppercase"
                      style={{ color: selectedPlan === i ? "#00B4FF" : plan.color }}
                    >
                      {plan.name}
                    </div>
                    {plan.popular && (
                      <span className="bg-gradient-to-r from-[#FFD200] to-[#E4002B] text-white text-[8px] font-black tracking-wider uppercase rounded-full px-2 py-0.5 shadow-xs">
                        Phổ biến
                      </span>
                    )}
                  </div>

                  <div className="text-3xl font-black tracking-tight mb-1">{plan.data}</div>
                  <div
                    className={`text-xs font-semibold mb-4 ${
                      selectedPlan === i ? "text-white/55" : "text-slate-400"
                    }`}
                  >
                    Hạn sử dụng {plan.days} ngày
                  </div>
                  <div
                    className="text-lg font-black mb-6"
                    style={{ color: selectedPlan === i ? "#FFD200" : plan.color }}
                  >
                    {plan.price}
                  </div>
                </div>

                <button
                  onClick={() => navigate("/login")}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 text-center ${
                    selectedPlan === i
                      ? "bg-gradient-to-r from-[#FFD200] to-[#E4002B] text-white border-none shadow-md shadow-red-500/10"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {selectedPlan === i ? "Mua ngay" : "Chọn gói"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
