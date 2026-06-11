import { Link } from "react-router";
import { Phone, Facebook, Youtube, Twitter, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer
      style={{
        fontFamily: "'Outfit', sans-serif",
        background: "#00132A",
        borderTop: "1px solid rgba(0,85,165,0.15)",
        padding: "60px 0 32px",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0055A5, #00B4FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} color="white" />
              </div>
              <span style={{ color: "white", fontSize: 18, fontWeight: 800 }}>
                Mobi<span style={{ color: "#F39C12" }}>Fone</span>
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
              Tổng Công ty Viễn thông MobiFone — Kết nối mọi người, mọi lúc, mọi nơi.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[Facebook, Youtube, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.4)",
                    transition: "all 0.2s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(0,85,165,0.2)"; el.style.borderColor = "rgba(0,85,165,0.4)"; el.style.color = "#60B4FF"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,0.05)"; el.style.borderColor = "rgba(255,255,255,0.08)"; el.style.color = "rgba(255,255,255,0.4)"; }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: "Dịch vụ", links: [{ label: "Gói cước 4G/5G", to: "/packages" }, { label: "eSIM", to: "/esim" }, { label: "Roaming Quốc tế", to: "/packages" }, { label: "Khuyến mãi", to: "/promotions" }] },
            { title: "Hỗ trợ", links: [{ label: "Trung tâm hỗ trợ", to: "/support" }, { label: "Tra cứu gói cước", to: "/packages" }, { label: "Đổi SIM 5G", to: "/esim" }, { label: "Liên hệ CSKH", to: "/support" }] },
            { title: "Về MobiFone", links: [{ label: "Giới thiệu", to: "/" }, { label: "Tin tức", to: "/" }, { label: "Tuyển dụng", to: "/" }, { label: "Admin Portal", to: "/admin" }] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{col.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map(link => (
                  <Link
                    key={link.label}
                    to={link.to}
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#F39C12"}
                    onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)"}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 22,
            display: "flex", flexWrap: "wrap",
            justifyContent: "space-between", alignItems: "center", gap: 10,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
            © 2026 Tổng Công ty Viễn thông MobiFone. Bảo lưu mọi quyền.
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Chính sách bảo mật", "Điều khoản sử dụng", "Cookie"].map(t => (
              <a key={t} href="#" style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.6)"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.25)"}
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
