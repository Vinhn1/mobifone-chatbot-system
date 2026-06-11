import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, ChevronDown, Phone, MessageSquare, Mail,
  MapPin, Zap, HelpCircle, Wifi, CreditCard, Smartphone, Globe
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
  { icon: "💬", label: "Chat Zalo", sub: "Phản hồi trong 2 phút", color: "#0068FF", action: "Chat ngay" },
  { icon: "📞", label: "Hotline 18001090", sub: "24/7 · Miễn phí", color: "#22C55E", action: "Gọi ngay" },
  { icon: "✉️", label: "Email hỗ trợ", sub: "cskh@mobifone.vn", color: "#F39C12", action: "Gửi email" },
  { icon: "📍", label: "Cửa hàng gần nhất", sub: "Hơn 500 điểm GD", color: "#A855F7", action: "Tìm đường" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: "1.5px solid",
        borderColor: open ? "#0055A5" : "#E2E8F0",
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color 0.2s",
        background: "white",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ color: "#0F172A", fontWeight: 600, fontSize: 15, flex: 1 }}>{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ flexShrink: 0 }}
        >
          <ChevronDown size={18} style={{ color: open ? "#0055A5" : "#94A3B8" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 20px 18px",
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.7,
                borderTop: "1px solid #F1F5F9",
                paddingTop: 14,
                whiteSpace: "pre-line",
              }}
            >
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
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #001F3F 0%, #00132A 70%, #0A0A1A 100%)",
          padding: "100px 0 70px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,85,165,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <HelpCircle size={40} style={{ color: "#60B4FF", marginBottom: 14 }} />
            <h1 style={{ color: "white", fontSize: "clamp(1.8rem,5vw,2.8rem)", fontWeight: 900, marginBottom: 12 }}>
              Chúng tôi có thể{" "}
              <span style={{ background: "linear-gradient(90deg,#F39C12,#FF5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                giúp gì
              </span>{" "}
              cho bạn?
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginBottom: 28 }}>
              Tìm câu trả lời nhanh hoặc liên hệ đội ngũ hỗ trợ của chúng tôi
            </p>

            {/* Glassy search bar */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: searchFocused ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                backdropFilter: "blur(20px)",
                border: `1.5px solid ${searchFocused ? "rgba(0,180,255,0.6)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 16, padding: "0 20px", height: 58,
                boxShadow: searchFocused ? "0 0 0 4px rgba(0,180,255,0.08)" : "none",
                transition: "all 0.25s",
              }}
            >
              <Search size={20} style={{ color: searchFocused ? "#60B4FF" : "rgba(255,255,255,0.4)", flexShrink: 0, transition: "color 0.2s" }} />
              <input
                placeholder="Tìm kiếm câu hỏi, hướng dẫn..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "white", fontSize: 16, fontFamily: "'Outfit', sans-serif",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contact shortcuts */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {CONTACTS.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "16px 18px",
                borderRadius: 14,
                border: "1.5px solid #E2E8F0",
                cursor: "pointer",
                transition: "all 0.2s",
                background: "white",
              }}
              whileHover={{ borderColor: c.color, boxShadow: `0 4px 20px ${c.color}18`, y: -2 }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${c.color}12`,
                  border: `1.5px solid ${c.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}
              >
                {c.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>{c.label}</div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>{c.sub}</div>
              </div>
              <button
                style={{
                  flexShrink: 0,
                  padding: "5px 12px", borderRadius: 8,
                  background: `${c.color}12`,
                  border: `1px solid ${c.color}30`,
                  color: c.color,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap",
                }}
              >
                {c.action}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ color: "#F39C12", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Câu hỏi thường gặp</div>
          <h2 style={{ color: "#0F172A", fontSize: "clamp(1.5rem,4vw,2.2rem)", fontWeight: 800 }}>
            FAQ
          </h2>
        </div>

        {!search && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
            {FAQS.map(({ cat, icon: Icon }) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 10,
                  border: `1.5px solid ${activeCategory === cat ? "#0055A5" : "#E2E8F0"}`,
                  background: activeCategory === cat ? "#EFF6FF" : "white",
                  color: activeCategory === cat ? "#0055A5" : "#64748B",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
                }}
              >
                <Icon size={15} />
                {cat}
              </button>
            ))}
          </div>
        )}

        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredFAQs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#94A3B8" }}>
              <Search size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 16 }}>Không tìm thấy kết quả cho "{search}"</p>
              <p style={{ fontSize: 14, marginTop: 6 }}>Thử từ khóa khác hoặc liên hệ hỗ trợ trực tiếp.</p>
            </div>
          ) : (
            filteredFAQs.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
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
          style={{
            marginTop: 48,
            borderRadius: 20,
            background: "linear-gradient(135deg, #001F3F 0%, #003466 100%)",
            padding: "36px",
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,31,63,0.2)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <h3 style={{ color: "white", fontWeight: 800, fontSize: "1.4rem", marginBottom: 8 }}>
            Vẫn chưa tìm được câu trả lời?
          </h3>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, marginBottom: 20 }}>
            Trợ lý AI MobiFone sẵn sàng hỗ trợ bạn 24/7. Nhấn vào icon chat ở góc dưới phải để bắt đầu!
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,180,255,0.15)", border: "1px solid rgba(0,180,255,0.3)", borderRadius: 20, padding: "6px 16px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E" }} />
            <span style={{ color: "#60B4FF", fontSize: 13, fontWeight: 600 }}>Trợ lý AI đang online</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
