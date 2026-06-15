import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, ChevronDown, HelpCircle, Wifi, CreditCard, Smartphone, Globe, Zap
} from "lucide-react";

const FAQS: { cat: string; icon: React.ElementType; items: { q: string; a: string }[] }[] = [
  {
    cat: "Gói cước", icon: Zap,
    items: [
      { q: "Tôi có thể thay đổi gói cước bao lâu một lần?", a: "Bạn có thể thay đổi gói cước bất kỳ lúc nào. Gói mới sẽ có hiệu lực ngay sau khi đăng ký thành công. Gói cũ sẽ kết thúc vào ngày hết hạn. Lưu ý: phí gói cũ đã thanh toán sẽ không được hoàn lại." },
      { q: "Cách đăng ký gói cước TK135 nhanh nhất?", a: "Bạn có thể đăng ký TK135 qua nhiều cách:\n• Soạn TK135 gửi 9084\n• Ứng dụng MobiFone My Account\n• Trang web mobifone.vn\n• Gọi tổng đài 18001090\nGói sẽ kích hoạt ngay lập tức sau khi thanh toán thành công." },
      { q: "Data còn dư có được chuyển sang tháng sau không?", a: "Thông thường data dư cuối kỳ sẽ không được chuyển sang kỳ tiếp theo. Tuy nhiên, với một số gói đặc biệt như MAX299 Elite, data dư sẽ được tích lũy và cộng dồn vào tháng sau (tối đa 30GB)." },
    ]
  },
  {
    cat: "Thanh toán", icon: CreditCard,
    items: [
      { q: "MobiFone hỗ trợ những phương thức thanh toán nào?", a: "MobiFone hỗ trợ đa dạng phương thức: Thẻ ngân hàng nội địa/quốc tế, Ví điện tử (MoMo, VNPay, ZaloPay), Nạp thẻ cào, Chuyển khoản ngân hàng, và thanh toán tại điểm giao dịch MobiFone trên toàn quốc." },
      { q: "Tôi muốn lấy hóa đơn điện tử, làm thế nào?", a: "Để nhận hóa đơn điện tử, bạn cần đăng nhập vào tài khoản MobiFone My Account → Lịch sử giao dịch → Chọn giao dịch cần xuất hóa đơn → Yêu cầu hóa đơn. Hóa đơn sẽ được gửi qua email trong vòng 24h." },
    ]
  },
  {
    cat: "Kỹ thuật", icon: Wifi,
    items: [
      { q: "Tại sao tôi không bắt được sóng 5G?", a: "Để sử dụng 5G bạn cần: (1) Điện thoại hỗ trợ 5G (iPhone 12+, Samsung S21+...), (2) Gói cước 5G (TK99 trở lên), (3) Ở trong vùng phủ sóng 5G (hiện có ở 63 tỉnh thành). Kiểm tra vùng phủ sóng tại mobifone.vn/coverage-map." },
      { q: "Làm thế nào để kiểm tra data còn lại?", a: "Bạn có thể kiểm tra data còn lại bằng nhiều cách:\n• Soạn KT gửi 999 (miễn phí)\n• Ứng dụng MobiFone My Account → Mục 'Quản lý tài khoản'\n• Gọi *101# → Xem thông tin tài khoản\n• Gọi 18001090" },
    ]
  },
  {
    cat: "eSIM", icon: Smartphone,
    items: [
      { q: "Điện thoại nào hỗ trợ eSIM MobiFone?", a: "MobiFone eSIM hiện hỗ trợ: iPhone XS/XR trở lên, Samsung Galaxy S20+, S21+, S22+, S23+, Note 20 Ultra, Google Pixel 3+, và nhiều dòng máy khác. Danh sách đầy đủ tại mobifone.vn/esim-compatible." },
      { q: "Chuyển từ SIM vật lý sang eSIM có mất số không?", a: "Không! Khi chuyển đổi từ SIM vật lý sang eSIM, bạn giữ nguyên số điện thoại, gói cước và toàn bộ data còn lại. Quá trình chuyển đổi mất khoảng 15-30 phút. SIM vật lý sẽ bị hủy sau khi eSIM được kích hoạt thành công." },
    ]
  },
  {
    cat: "Roaming", icon: Globe,
    items: [
      { q: "Đăng ký roaming quốc tế như thế nào?", a: "Để đăng ký roaming: Soạn ROAMING gửi 9084, hoặc đăng ký trực tiếp tại cửa hàng MobiFone trước khi xuất cảnh tối thiểu 24h. Khuyến nghị đăng ký gói roaming ngày (tính từ 0h) để tối ưu chi phí." },
    ]
  },
];

const CONTACTS = [
  { icon: "💬", label: "Chat Zalo", sub: "Phản hồi trong 2 phút", color: "#0068FF", colorBg: "bg-blue-50", colorBorder: "border-blue-100", action: "Chat ngay" },
  { icon: "📞", label: "Hotline 18001090", sub: "24/7 · Miễn phí", color: "#10B981", colorBg: "bg-emerald-50", colorBorder: "border-emerald-100", action: "Gọi ngay" },
  { icon: "✉️", label: "Email hỗ trợ", sub: "cskh@mobifone.vn", color: "#F59E0B", colorBg: "bg-amber-50", colorBorder: "border-amber-100", action: "Gửi email" },
  { icon: "📍", label: "Cửa hàng gần nhất", sub: "Hơn 500 điểm GD", color: "#8B5CF6", colorBg: "bg-purple-50", colorBorder: "border-purple-100", action: "Tìm đường" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
        open ? "border-[#0055A5] shadow-md shadow-[#0055A5]/5" : "border-slate-200/60"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 bg-transparent border-none cursor-pointer text-left font-outfit"
      >
        <span className="text-slate-800 font-bold text-sm sm:text-base flex-1">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className={open ? "text-[#0055A5]" : "text-slate-400"} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-3.5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 bg-slate-50/50 whitespace-pre-line">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SupportPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Gói cước");
  const [searchFocused, setSearchFocused] = useState(false);

  const activeFAQs = FAQS.find(f => f.cat === activeCategory);
  const filteredFAQs = search
    ? FAQS.flatMap(f => f.items).filter(item => item.q.toLowerCase().includes(search.toLowerCase()))
    : activeFAQs?.items ?? [];

  return (
    <div className="bg-slate-50 min-h-screen font-outfit">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0B192C] via-[#0055A5] to-[#0B192C] py-20 px-6 relative overflow-hidden text-center">
        {/* Glow Effects */}
        <div className="absolute top-[-100px] right-[-50px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(228,0,43,0.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(0,180,255,0.15)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <HelpCircle size={40} className="text-[#00B4FF] mx-auto mb-4" />
            <h1 className="text-white text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Chúng tôi có thể{" "}
              <span className="bg-gradient-to-r from-[#FFD200] to-[#E4002B] bg-clip-text text-transparent">
                giúp gì
              </span>{" "}
              cho bạn?
            </h1>
            <p className="text-white/60 text-sm sm:text-base font-medium max-w-md mx-auto mb-8">
              Tìm câu trả lời nhanh hoặc liên hệ với đội ngũ chăm sóc khách hàng của MobiFone.
            </p>

            {/* Glassy search bar */}
            <div
              className={`flex items-center gap-3 rounded-2xl px-4.5 h-14 transition-all duration-200 border shadow-inner ${
                searchFocused
                  ? "bg-white/12 border-[#00B4FF] shadow-[0_0_0_4px_rgba(0,180,255,0.08)]"
                  : "bg-white/8 border-white/15 focus-within:border-white/30"
              }`}
            >
              <Search size={18} className={`shrink-0 transition-colors duration-200 ${searchFocused ? "text-[#00B4FF]" : "text-white/40"}`} />
              <input
                placeholder="Tìm kiếm câu hỏi, hướng dẫn..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-semibold placeholder-white/40"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="bg-white/10 hover:bg-white/20 border-none rounded-full w-6 h-6 cursor-pointer text-white flex items-center justify-center text-xs shrink-0 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contact shortcuts */}
      <div className="bg-white border-b border-slate-200/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACTS.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.015, y: -2 }}
              className="flex items-center gap-3.5 p-4 rounded-2xl border border-slate-200/60 bg-white cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300"
            >
              <div className={`w-11 h-11 rounded-xl ${c.colorBg} border ${c.colorBorder} flex items-center justify-center text-xl shrink-0`}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-800 font-bold text-sm truncate">{c.label}</div>
                <div className="text-slate-400 text-xs font-semibold truncate mt-0.5">{c.sub}</div>
              </div>
              <button
                className={`shrink-0 px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all duration-200 hover:brightness-95 active:scale-95 ${
                  c.label === "Chat Zalo"
                    ? "bg-[#0068FF] text-white border-none shadow-sm shadow-blue-500/10"
                    : c.label.includes("Hotline")
                    ? "bg-[#10B981] text-white border-none shadow-sm shadow-emerald-500/10"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {c.action}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ section */}
      <div className="max-w-[760px] mx-auto px-6 py-12 pb-24">
        <div className="text-center mb-8">
          <div className="text-[#FF9900] text-[10px] font-bold tracking-widest uppercase mb-1.5">Câu hỏi thường gặp</div>
          <h2 className="text-slate-800 text-2xl sm:text-3xl font-black tracking-tight">Trả lời nhanh thắc mắc</h2>
        </div>

        {!search && (
          <div className="flex gap-2 justify-center flex-wrap mb-8">
            {FAQS.map(({ cat, icon: Icon }) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 ${
                  activeCategory === cat
                    ? "border-[#0055A5] bg-[#0055A5]/5 text-[#0055A5]"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon size={14} />
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3.5">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200/50 rounded-3xl text-slate-400">
              <Search size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-bold text-sm">Không tìm thấy kết quả cho "{search}"</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng kiểm tra lại từ khóa hoặc đổi chủ đề.</p>
            </div>
          ) : (
            filteredFAQs.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <FAQItem {...item} />
              </motion.div>
            ))
          )}
        </div>

        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 rounded-3xl bg-gradient-to-br from-[#0B192C] to-[#0055A5] p-8 text-center shadow-lg shadow-[#0055A5]/10 text-white relative overflow-hidden"
        >
          {/* Decorative Wave */}
          <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

          <div className="text-3xl mb-3">🤖</div>
          <h3 className="text-white font-extrabold text-lg sm:text-xl mb-2">
            Vẫn chưa tìm thấy thông tin bạn cần?
          </h3>
          <p className="text-white/60 text-xs sm:text-sm font-medium max-w-md mx-auto mb-6">
            Trợ lý AI của MobiFone luôn túc trực 24/7 để trả lời mọi thắc mắc về gói cước, eSIM hoặc các dịch vụ khác. Click bong bóng chat để thử ngay!
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399] animate-pulse" />
            <span className="text-white text-xs font-bold">Trợ lý AI đang online</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
