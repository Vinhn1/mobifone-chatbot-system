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
  Silver: "#94A3B8", Gold: "#F59E0B", Diamond: "#8B5CF6",
};

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/"); setUserMenuOpen(false); };

  // Menu items theo role
  const userMenuItems = user?.role === "admin"
    ? [
        { icon: Shield, label: "Admin Dashboard", path: "/admin" },
        { icon: LayoutDashboard, label: "Tổng quan hệ thống", path: "/admin" },
      ]
    : [
        { icon: LayoutDashboard, label: "Dashboard của tôi", path: "/dashboard" },
        { icon: Package, label: "Quản lý gói cước", path: "/dashboard/packages" },
        { icon: User, label: "Tài khoản & Bảo mật", path: "/dashboard/profile" },
      ];

  return (
    <nav style={{ fontFamily: "'Outfit', sans-serif" }} className="fixed top-0 left-0 right-0 z-50">
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", height: 64, background: "rgba(0, 20, 50, 0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,180,255,0.1)", justifyContent: "space-between" }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <MobiFoneLogo size={32} />
        </Link>

        {/* Desktop nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="hidden md:flex">
          <NavLink to="/" end style={({ isActive }) => ({ padding: "6px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500, color: isActive ? "#60B4FF" : "rgba(255,255,255,0.7)", background: isActive ? "rgba(0,85,165,0.2)" : "transparent", transition: "all 0.2s" })}>
            Trang chủ
          </NavLink>
          {NAV_LINKS.map(({ label, path }) => (
            <NavLink key={path} to={path} style={({ isActive }) => ({ padding: "6px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 500, color: isActive ? "#60B4FF" : "rgba(255,255,255,0.7)", background: isActive ? "rgba(0,85,165,0.2)" : "transparent", transition: "all 0.2s" })}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="hidden md:flex">
          {user ? (
            /* Logged-in user avatar menu */
            <div ref={userMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: `1px solid ${user.role === "admin" ? "rgba(243,156,18,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 12, padding: "5px 10px 5px 5px", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => { if (!userMenuOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: user.role === "admin" ? "linear-gradient(135deg,#F39C12,#FF5722)" : "linear-gradient(135deg,#0055A5,#F39C12)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, boxShadow: `0 0 10px ${TIER_COLORS[user.tier]}44` }}>
                  {user.role === "admin" ? <Shield size={14} /> : user.name.charAt(0)}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.1 }}>{user.name.split(" ").slice(-2).join(" ")}</div>
                  <div style={{ color: user.role === "admin" ? "#F39C12" : TIER_COLORS[user.tier], fontSize: 10, fontWeight: 600 }}>
                    {user.role === "admin" ? "⚡ Admin" : `${user.tier} Member`}
                  </div>
                </div>
                <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.4)", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </button>

              {userMenuOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "rgba(0,15,40,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "6px", minWidth: 200, boxShadow: "0 16px 40px rgba(0,0,0,0.4)", zIndex: 100 }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{user.email || user.phone}</div>
                    {user.role === "admin" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(243,156,18,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "#F39C12", fontSize: 8 }}>★</span>
                        </div>
                        <span style={{ color: "#F39C12", fontSize: 11, fontWeight: 700 }}>Quản trị viên hệ thống</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: `${TIER_COLORS[user.tier]}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: TIER_COLORS[user.tier], fontSize: 8 }}>★</span>
                        </div>
                        <span style={{ color: TIER_COLORS[user.tier], fontSize: 11, fontWeight: 700 }}>{user.tier} · {user.points.toLocaleString()} điểm</span>
                      </div>
                    )}
                  </div>

                  {userMenuItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all 0.15s", textAlign: "left" }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "rgba(255,255,255,0.06)"; el.style.color = "white"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "transparent"; el.style.color = "rgba(255,255,255,0.7)"; }}
                      >
                        <Icon size={14} style={{ flexShrink: 0 }} /> {item.label}
                      </button>
                    );
                  })}

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 4, paddingTop: 4 }}>
                    <button onClick={handleLogout}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: "transparent", color: "#FCA5A5", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit',sans-serif", textAlign: "left" }}>
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guest buttons */
            <>
              <button onClick={() => navigate("/login")} style={{ padding: "7px 16px", borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
              >
                Đăng nhập
              </button>
              <button onClick={() => navigate("/login?tab=register")} style={{ padding: "7px 18px", borderRadius: 9, background: "linear-gradient(135deg,#F39C12,#FF5722)", border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit',sans-serif", boxShadow: "0 4px 16px rgba(243,156,18,0.35)", transition: "transform 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}
              >
                Đăng ký
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center" }}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "rgba(0,15,35,0.97)", backdropFilter: "blur(20px)", padding: "12px 20px 20px", borderBottom: "1px solid rgba(0,85,165,0.2)" }}>
          {[{ label: "Trang chủ", path: "/" }, ...NAV_LINKS].map(({ label, path }) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 15, fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {user ? (
              <>
                <button
                  onClick={() => { navigate(user.role === "admin" ? "/admin" : "/dashboard"); setMenuOpen(false); }}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(0,85,165,0.3)", border: "1px solid rgba(0,85,165,0.4)", color: "#60B4FF", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}
                >
                  {user.role === "admin" ? "Admin Dashboard" : "Dashboard"}
                </button>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}>Đăng xuất</button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate("/login"); setMenuOpen(false); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'Outfit',sans-serif" }}>Đăng nhập</button>
                <button onClick={() => { navigate("/login?tab=register"); setMenuOpen(false); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg,#F39C12,#FF5722)", border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}>Đăng ký</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
