import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { Menu, X, ChevronDown, User, Package, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MobiFoneLogo } from "./MobiFoneLogo";

const NAV_LINKS = [
  { label: "Gói cước", path: "/packages" },
  { label: "eSIM", path: "/esim" },
  { label: "Khuyến mãi", path: "/promotions" },
  { label: "Hỗ trợ", path: "/support" },
];

const TIER_COLORS = {
  Silver: "text-slate-400",
  Gold: "text-amber-500",
  Diamond: "text-purple-500",
};

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
    setUserMenuOpen(false);
  };

  const userMenuItems = (user?.role === "admin" || user?.role === "sales")
    ? [
        { icon: Shield, label: "CRM Dashboard", path: "/admin" },
        { icon: LayoutDashboard, label: "Tổng quan hệ thống", path: "/admin" },
      ]
    : [
        { icon: LayoutDashboard, label: "Dashboard của tôi", path: "/dashboard" },
        { icon: Package, label: "Quản lý gói cước", path: "/dashboard/packages" },
        { icon: User, label: "Tài khoản & Bảo mật", path: "/dashboard/profile" },
      ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg no-underline text-xs lg:text-sm font-semibold transition-all duration-300 ${
      isActive
        ? "text-blue-600 bg-blue-50/70 border border-blue-100/40 shadow-xs"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 font-outfit">
      <div className="flex items-center px-6 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 justify-between transition-all duration-300">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline shrink-0 hover:opacity-95 transition-opacity">
          <MobiFoneLogo size={32} dark={true} />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Trang chủ
          </NavLink>
          {NAV_LINKS.map(({ label, path }) => (
            <NavLink key={path} to={path} className={navLinkClass}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            /* Logged-in user avatar menu */
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(p => !p)}
                className={`flex items-center gap-2 bg-slate-50/80 hover:bg-slate-100/80 border ${
                  (user.role === "admin" || user.role === "sales") ? "border-amber-200" : "border-slate-200"
                } rounded-xl p-1.5 pr-3 cursor-pointer transition-all duration-200`}
              >
                <div className={`w-7 h-7 rounded-full ${
                  (user.role === "admin" || user.role === "sales") ? "bg-gradient-to-br from-amber-500 to-red-500" : "bg-gradient-to-br from-blue-600 to-amber-500"
                } flex items-center justify-center text-white text-xs font-extrabold shadow-xs overflow-hidden`}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (user.role === "admin" || user.role === "sales") ? (
                    <Shield size={13} />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <div className="text-left">
                  <div className="text-slate-800 font-bold text-xs leading-none mb-0.5">{user.name.split(" ").slice(-2).join(" ")}</div>
                  <div className={`text-[9px] font-bold tracking-wide ${
                    user.role === "admin" 
                      ? "text-amber-600" 
                      : user.role === "sales" 
                        ? "text-blue-600" 
                        : TIER_COLORS[user.tier] || "text-slate-500"
                  }`}>
                    {user.role === "admin" ? "⚡ ADMIN" : user.role === "sales" ? "⚡ CSKH" : `${user.tier.toUpperCase()} MEMBER`}
                  </div>
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : "rotate-0"}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 bg-white border border-slate-200/60 rounded-2xl p-1.5 min-w-[210px] shadow-xl z-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-slate-100 mb-1">
                    <div className="text-slate-800 font-bold text-sm">{user.name}</div>
                    <div className="text-slate-400 text-xs truncate">{user.email || user.phone}</div>
                    {(user.role === "admin" || user.role === "sales") ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          user.role === "admin" 
                            ? "bg-amber-50 text-amber-700 border-amber-200/60" 
                            : "bg-blue-50 text-blue-700 border-blue-200/60"
                        }`}>
                          {user.role === "admin" ? "★ Quản trị viên" : "★ Nhân viên CSKH"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">{user.tier}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-600">{user.points.toLocaleString()} điểm</span>
                      </div>
                    )}
                  </div>

                  {userMenuItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-none bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-all duration-150 text-left"
                      >
                        <Icon size={14} className="shrink-0 text-slate-400" /> {item.label}
                      </button>
                    );
                  })}

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-none bg-transparent text-red-500 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-all duration-150 text-left"
                    >
                      <LogOut size={14} className="shrink-0" /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest buttons */
            <>
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-xl bg-transparent border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer text-sm font-semibold transition-all duration-200"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate("/login?tab=register")}
                className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white cursor-pointer text-sm font-bold border-none shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 active:scale-95 transition-all duration-200"
              >
                Đăng ký
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-slate-700 hover:text-slate-950 cursor-pointer focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200/80 shadow-lg animate-in slide-in-from-top duration-300">
          {[{ label: "Trang chủ", path: "/" }, ...NAV_LINKS].map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-sm font-semibold border-b border-slate-100 text-slate-600 hover:text-slate-950 no-underline"
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-3 mt-5">
            {user ? (
              <>
                <button
                  onClick={() => { navigate((user.role === "admin" || user.role === "sales") ? "/admin" : "/dashboard"); setMenuOpen(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 cursor-pointer text-sm font-bold text-center"
                >
                  {(user.role === "admin" || user.role === "sales") ? "CRM Dashboard" : "Dashboard"}
                </button>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-500 cursor-pointer text-sm font-bold"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate("/login"); setMenuOpen(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-transparent border border-slate-200 text-slate-700 cursor-pointer text-sm font-semibold"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => { navigate("/login?tab=register"); setMenuOpen(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 border-none text-white cursor-pointer text-sm font-bold shadow-md shadow-red-500/20"
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
