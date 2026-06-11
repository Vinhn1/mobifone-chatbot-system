import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, Users, MessageSquare, Database, Code2,
  Settings, ChevronLeft, ChevronRight, Bell, Search,
  LogOut, Zap, Bot, TrendingUp, ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS = [
  {
    label: "CRM & LEADS",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: Users, label: "Leads & Khách hàng", path: "/admin/leads", badge: "24" },
      { icon: MessageSquare, label: "Hội thoại Bot", path: "/admin/conversations", badge: "3" },
    ]
  },
  {
    label: "CẤU HÌNH BOT",
    items: [
      { icon: Bot, label: "Cấu hình Mia", path: "/admin/bot-config" },
      { icon: Database, label: "Knowledge Base", path: "/admin/knowledge" },
      { icon: Code2, label: "Prompt Playground", path: "/admin/playground" },
    ]
  },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F1F5F9", fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: collapsed ? 68 : 244, background: "#0A1628", flexShrink: 0, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "18px 14px" : "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#0055A5,#007FFF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px rgba(0,127,255,0.3)" }}>
              <Bot size={17} color="white" />
            </div>
            {!collapsed && (
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 14, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>mobi<span style={{ color: "#E4002B" }}>fone</span> CRM</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>AI Sales Platform</div>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Live indicator */}
        {!collapsed && (
          <div style={{ margin: "10px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E", flexShrink: 0 }} />
            <div>
              <div style={{ color: "#22C55E", fontSize: 11, fontWeight: 700 }}>Mia AI đang chạy</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>5 phiên hoạt động</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: "14px 6px 5px" }}>{group.label}</div>
              )}
              {group.items.map(({ icon: Icon, label, path, badge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/admin"}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: 10,
                    padding: collapsed ? "10px" : "9px 12px",
                    borderRadius: 10, textDecoration: "none",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: isActive ? "rgba(0,85,165,0.3)" : "transparent",
                    border: isActive ? "1px solid rgba(0,85,165,0.4)" : "1px solid transparent",
                    color: isActive ? "#60B4FF" : "rgba(255,255,255,0.5)",
                    transition: "all 0.18s",
                    position: "relative",
                  })}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{label}</span>}
                  {!collapsed && badge && (
                    <span style={{ background: "#EF4444", color: "white", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{badge}</span>
                  )}
                  {collapsed && badge && (
                    <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: collapsed ? "12px 10px" : "12px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F39C12,#FF5722)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
              {user?.name?.charAt(0) ?? "A"}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 13, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name?.split(" ").pop()}</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>Admin</div>
                </div>
                <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 4 }} title="Đăng xuất">
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{ height: 56, background: "white", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, padding: "0 12px", height: 36, maxWidth: 320 }}>
            <Search size={13} style={{ color: "#94A3B8" }} />
            <input placeholder="Tìm lead, hội thoại..." style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#334155", flex: 1, fontFamily: "'Outfit',sans-serif" }} />
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            <Zap size={12} /> Xem Portal
          </button>
          <div style={{ position: "relative" }}>
            <button style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 9, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}>
              <Bell size={15} />
            </button>
            <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "#EF4444", border: "1.5px solid white" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "4px 10px 4px 4px", cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#F39C12,#FF5722)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800 }}>
              {user?.name?.charAt(0) ?? "A"}
            </div>
            <span style={{ color: "#334155", fontSize: 13, fontWeight: 600 }}>{user?.name?.split(" ").pop()}</span>
            <ChevronDown size={13} style={{ color: "#94A3B8" }} />
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
