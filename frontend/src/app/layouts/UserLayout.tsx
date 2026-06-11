import { useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router";
import {
  LayoutDashboard, Package, User, Bell, LogOut,
  Menu, X, ChevronDown, CreditCard, HelpCircle,
  Gift
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ChatWidget } from "../components/ChatWidget";
import { MobiFoneLogo } from "../components/MobiFoneLogo";

const TIER_COLORS = {
  Silver: { bg: "#E2E8F0", text: "#475569", glow: "rgba(71,85,105,0.3)" },
  Gold: { bg: "#FEF9C3", text: "#92400E", glow: "rgba(251,191,36,0.4)" },
  Diamond: { bg: "#EDE9FE", text: "#5B21B6", glow: "rgba(139,92,246,0.4)" },
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tổng quan", path: "/dashboard" },
  { icon: Package, label: "Gói cước", path: "/dashboard/packages" },
  { icon: User, label: "Tài khoản", path: "/dashboard/profile" },
];

export function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const tierColor = TIER_COLORS[user?.tier ?? "Silver"];

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Outfit', sans-serif" }}>
      {/* Top nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "white", borderBottom: "1px solid #E2E8F0", height: 60, display: "flex", alignItems: "center", padding: "0 20px", gap: 16 }}>
        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <MobiFoneLogo size={28} dark={true} />
        </Link>

        {/* Desktop nav */}
        <nav style={{ flex: 1, display: "flex", gap: 2, paddingLeft: 16 }} className="hidden md:flex">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 9,
                textDecoration: "none", fontSize: 14, fontWeight: 600,
                color: isActive ? "#0055A5" : "#64748B",
                background: isActive ? "#EFF6FF" : "transparent",
                border: isActive ? "1px solid #BFDBFE" : "1px solid transparent",
                transition: "all 0.2s",
              })}
            >
              {({ isActive }) => <><Icon size={15} style={{ color: isActive ? "#0055A5" : "#94A3B8" }} />{label}</>}
            </NavLink>
          ))}
          <NavLink to="/support" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 600, color: "#64748B", transition: "all 0.2s" }}>
            <HelpCircle size={15} style={{ color: "#94A3B8" }} /> Hỗ trợ
          </NavLink>
        </nav>

        <div style={{ flex: 1 }} className="md:hidden" />

        {/* Right section */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Balance */}
          <div style={{ display: "none", alignItems: "center", gap: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "5px 12px" }} className="sm:flex">
            <CreditCard size={13} style={{ color: "#16A34A" }} />
            <span style={{ color: "#16A34A", fontSize: 13, fontWeight: 700 }}>
              {user?.balance.toLocaleString("vi-VN")}đ
            </span>
          </div>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            style={{ position: "relative", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}
          >
            <Bell size={16} />
            <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "#EF4444", border: "1.5px solid white" }} />
          </button>

          {/* User avatar */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => navigate("/dashboard/profile")}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "4px 8px 4px 4px", borderRadius: 12, transition: "background 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#F8FAFC"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "none"}
            >
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0055A5,#F39C12)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 800, boxShadow: `0 0 12px ${tierColor.glow}` }}>
                {user?.name?.charAt(0) ?? "U"}
              </div>
              <div className="hidden sm:block" style={{ textAlign: "left" }}>
                <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{user?.name?.split(" ").slice(-2).join(" ")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ background: tierColor.bg, color: tierColor.text, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                    {user?.tier}
                  </span>
                </div>
              </div>
              <ChevronDown size={14} style={{ color: "#94A3B8" }} className="hidden sm:block" />
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 10, padding: "7px 12px", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}
          >
            <LogOut size={14} /> <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        <Outlet />
      </main>

      <ChatWidget />
    </div>
  );
}
