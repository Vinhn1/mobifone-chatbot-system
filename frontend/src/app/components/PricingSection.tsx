import { motion } from "motion/react";
import { Check } from "lucide-react";

const plans = [
  {
    name: "TK79",
    price: "79.000đ",
    period: "/tháng",
    highlight: false,
    color: "text-blue-600",
    colorHex: "#0055A5",
    colorBg: "bg-blue-50/60",
    colorBorder: "border-blue-100",
    btnClass: "border-blue-600/40 text-blue-600 hover:bg-blue-50/70",
    data: "2GB/ngày",
    features: ["60GB data/tháng", "Gọi nội mạng 30p/ngày", "SMS miễn phí nội mạng", "Hỗ trợ 4G LTE"],
  },
  {
    name: "TK135",
    price: "135.000đ",
    period: "/tháng",
    highlight: true,
    color: "text-red-600",
    colorHex: "#E4002B",
    colorBg: "bg-red-50/60",
    colorBorder: "border-red-200",
    btnClass: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-md shadow-red-500/25 border-none",
    badge: "Phổ biến nhất",
    data: "4GB/ngày",
    features: ["120GB data/tháng", "Gọi nội mạng miễn phí", "20p gọi ngoại mạng/ngày", "Hỗ trợ 5G", "Ưu tiên hỗ trợ VIP"],
  },
  {
    name: "TK199",
    price: "199.000đ",
    period: "/tháng",
    highlight: false,
    color: "text-indigo-600",
    colorHex: "#6366F1",
    colorBg: "bg-indigo-50/60",
    colorBorder: "border-indigo-100",
    btnClass: "border-indigo-600/40 text-indigo-600 hover:bg-indigo-50/70",
    data: "6GB/ngày",
    features: ["180GB data/tháng", "Gọi miễn phí mọi mạng", "Roaming 5 quốc gia ASEAN", "Hỗ trợ 5G Ultra", "VIP Support 24/7", "Tặng TV360 1 tháng"],
  },
];

export function PricingSection() {
  return (
    <section className="bg-white py-20 font-outfit border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-3">
            Bảng giá
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Chọn gói cước{" "}
            <span className="bg-gradient-to-r from-blue-600 to-red-500 bg-clip-text text-transparent">
              phù hợp
            </span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Linh hoạt, minh bạch, không phí ẩn. Nâng cấp hoặc hạ cấp bất cứ lúc nào.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={plan.highlight ? { y: -8, scale: 1.05 } : { y: -8, scale: 1.02 }}
              className={`rounded-3xl flex flex-col justify-between ${
                plan.highlight
                  ? "bg-white border-2 border-red-500 shadow-xl shadow-red-500/5 p-8 relative md:-translate-y-2 scale-102 hover:shadow-2xl"
                  : "bg-slate-50/80 border border-slate-200/50 hover:bg-white p-7 hover:border-slate-300 hover:shadow-lg transition-colors"
              } duration-300 cursor-pointer relative`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-400" />
              )}

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-xs font-bold tracking-wider uppercase ${plan.color}`}>
                    {plan.name}
                  </div>
                  {plan.badge && (
                    <span className="bg-gradient-to-r from-red-600 to-red-500 text-white rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-slate-900 text-3xl sm:text-4xl font-black">{plan.price}</span>
                  <span className="text-slate-400 text-xs">{plan.period}</span>
                </div>

                <div className={`inline-flex items-center gap-1.5 ${plan.colorBg} ${plan.color} border ${plan.colorBorder} rounded-full px-3 py-1 text-xs font-bold mb-6`}>
                  <span>📶</span>
                  <span>{plan.data}</span>
                </div>

                <div className="flex flex-col gap-3.5 mb-8">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full ${plan.colorBg} border ${plan.colorBorder} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Check size={11} style={{ color: plan.colorHex }} />
                      </div>
                      <span className="text-slate-600 text-xs sm:text-sm font-semibold">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button className={`w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all duration-250 hover:scale-102 active:scale-98 ${plan.btnClass}`}>
                Đăng ký ngay
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
