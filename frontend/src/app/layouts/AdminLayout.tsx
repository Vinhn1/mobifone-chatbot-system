import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Users, MessageSquare, Database, Code2,
  ChevronLeft, ChevronRight, Bell, Search,
  LogOut, Zap, Bot, ChevronDown
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
  const location = useLocation();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)",
      fontFamily: "'Outfit', sans-serif",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Decorative Blur Blobs */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-10%",
        width: "50vw",
        height: "50vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0, 85, 165, 0.06) 0%, rgba(0, 85, 165, 0) 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 1
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        left: "-10%",
        width: "50vw",
        height: "50vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(228, 0, 43, 0.04) 0%, rgba(228, 0, 43, 0) 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 1
      }} />

      {/* Floating Glass Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 260 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          margin: "16px 0 16px 16px",
          borderRadius: 24,
          background: "rgba(10, 22, 40, 0.96)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 50px rgba(10, 22, 40, 0.25)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          zIndex: 10
        }}
      >
        {/* Logo Container */}
        <div style={{
          padding: collapsed ? "20px 14px" : "20px 22px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0055A5, #007FFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 16px rgba(0,127,255,0.4)"
            }}>
              <Bot size={18} color="white" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ color: "white", fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>
                  mobi<span style={{ color: "#E4002B" }}>fone</span> CRM
                </div>
                <div style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: 10, fontWeight: 500, marginTop: 1 }}>Sales Support Platform</div>
              </motion.div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255, 255, 255, 0.5)",
              flexShrink: 0,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
 
        {/* Live System Indicator */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              margin: "12px 16px 6px 16px",
              background: "rgba(34, 197, 94, 0.06)",
              border: "1px solid rgba(34, 197, 94, 0.15)",
              borderRadius: 14,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22C55E",
              boxShadow: "0 0 8px rgba(34, 197, 94, 0.7)",
              flexShrink: 0,
              animation: "pulse 2s infinite"
            }} />
            <div>
              <div style={{ color: "#22C55E", fontSize: 11, fontWeight: 700 }}>Mia đang chạy</div>
              <div style={{ color: "rgba(255, 255, 255, 0.35)", fontSize: 10, marginTop: 1 }}>5 phiên hoạt động</div>
            </div>
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>
          </motion.div>
        )}

        {/* Sidebar Nav Items */}
        <nav style={{
          flex: 1,
          padding: "12px 14px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }} className="custom-scrollbar">
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {!collapsed && (
                <div style={{
                  color: "rgba(255, 255, 255, 0.22)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  padding: "6px 8px",
                  textTransform: "uppercase"
                }}>{group.label}</div>
              )}
              {group.items.map(({ icon: Icon, label, path, badge }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/admin"}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: collapsed ? "12px" : "10px 14px",
                    borderRadius: 12,
                    textDecoration: "none",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: isActive ? "linear-gradient(135deg, #0055A5, #0077D5)" : "transparent",
                    border: isActive ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid transparent",
                    color: isActive ? "white" : "rgba(255, 255, 255, 0.5)",
                    boxShadow: isActive ? "0 8px 20px rgba(0, 85, 165, 0.25)" : "none",
                    transition: "all 0.2s ease",
                    position: "relative",
                  })}
                  className="sidebar-link"
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{label}</span>}
                  {!collapsed && badge && (
                    <span style={{
                      background: "#EF4444",
                      color: "white",
                      borderRadius: 20,
                      padding: "1px 7px",
                      fontSize: 10,
                      fontWeight: 800,
                      flexShrink: 0
                    }}>{badge}</span>
                  )}
                  {collapsed && badge && (
                    <div style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#EF4444",
                      boxShadow: "0 0 6px #EF4444"
                    }} />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Profile / Footer Container */}
        <div style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          padding: collapsed ? "14px 10px" : "14px 18px",
          flexShrink: 0,
          background: "rgba(0, 0, 0, 0.15)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: collapsed ? "center" : "flex-start" }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F39C12, #E4002B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 4px 10px rgba(228, 0, 43, 0.2)"
            }}>
              {user?.name?.charAt(0) ?? "A"}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1.1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>{user?.name?.split(" ").pop()}</div>
                  <div style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 10, marginTop: 1 }}>Administrator</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "rgba(255, 255, 255, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "white"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"}
                  title="Đăng xuất"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main View Container */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 2
      }}>
        {/* Floating Glass Header */}
        <header style={{
          margin: "16px 16px 0 16px",
          height: 64,
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.03)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
          flexShrink: 0
        }}>
          {/* Quick Search */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            background: "rgba(0, 0, 0, 0.03)",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            borderRadius: 10,
            padding: "0 12px",
            height: 38,
            maxWidth: 320,
            transition: "all 0.2s"
          }}>
            <Search size={14} style={{ color: "#94A3B8" }} />
            <input
              placeholder="Tìm lead, hội thoại..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "#334155",
                flex: 1,
                fontFamily: "'Outfit',sans-serif"
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Action buttons */}
          <motion.button
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0, 85, 165, 0.15)",
              background: "white",
              color: "#0055A5",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
              boxShadow: "0 2px 8px rgba(0, 85, 165, 0.05)"
            }}
          >
            <Zap size={13} /> Xem Portal
          </motion.button>

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              style={{
                background: "white",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: 10,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748B"
              }}
            >
              <Bell size={16} />
            </motion.button>
            <div style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#EF4444",
              border: "2px solid white"
            }} />
          </div>

          {/* User drop */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255, 255, 255, 0.8)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 10,
            padding: "4px 10px 4px 4px",
            cursor: "pointer"
          }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F39C12, #E4002B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 12,
              fontWeight: 800
            }}>
              {user?.name?.charAt(0) ?? "A"}
            </div>
            <span style={{ color: "#334155", fontSize: 13, fontWeight: 700 }}>
              {user?.name?.split(" ").pop()}
            </span>
            <ChevronDown size={14} style={{ color: "#94A3B8" }} />
          </div>
        </header>

        {/* Animated Page Container */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 24px 16px"
          }}
          className="custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ height: "100%", width: "100%" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
