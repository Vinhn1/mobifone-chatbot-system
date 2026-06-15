import { Link } from "react-router";
import { Phone, Facebook, Youtube, Twitter } from "lucide-react";
import { MobiFoneLogo } from "./MobiFoneLogo";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200/60 py-14 font-outfit">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Logo & Intro */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="no-underline self-start">
              <MobiFoneLogo size={36} dark={true} />
            </Link>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-xs m-0">
              Tổng Công ty Viễn thông MobiFone — Kết nối mọi người, mọi lúc, mọi nơi.
            </p>
            <div className="flex gap-2.5 mt-2">
              {[Facebook, Youtube, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 no-underline shadow-xs"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {[
            {
              title: "Dịch vụ",
              links: [
                { label: "Gói cước 4G/5G", to: "/packages" },
                { label: "eSIM", to: "/esim" },
                { label: "Roaming Quốc tế", to: "/packages" },
                { label: "Khuyến mãi", to: "/promotions" },
              ],
            },
            {
              title: "Hỗ trợ",
              links: [
                { label: "Trung tâm hỗ trợ", to: "/support" },
                { label: "Tra cứu gói cước", to: "/packages" },
                { label: "Đổi SIM 5G", to: "/esim" },
                { label: "Liên hệ CSKH", to: "/support" },
              ],
            },
            {
              title: "Về MobiFone",
              links: [
                { label: "Giới thiệu", to: "/" },
                { label: "Tin tức", to: "/" },
                { label: "Tuyển dụng", to: "/" },
                { label: "Admin Portal", to: "/admin" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-slate-800 font-extrabold text-sm mb-4 tracking-wide uppercase">
                {col.title}
              </div>
              <div className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-slate-500 hover:text-red-500 text-xs sm:text-sm no-underline font-medium transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-slate-200/60 pt-6 flex flex-wrap justify-between items-center gap-4">
          <div className="text-slate-400 text-xs font-medium">
            © 2026 Tổng Công ty Viễn thông MobiFone. Bảo lưu mọi quyền.
          </div>
          <div className="flex gap-4">
            {["Chính sách bảo mật", "Điều khoản sử dụng", "Cookie"].map((t) => (
              <a
                key={t}
                href="#"
                className="text-slate-400 hover:text-slate-600 text-xs no-underline font-medium transition-colors"
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
