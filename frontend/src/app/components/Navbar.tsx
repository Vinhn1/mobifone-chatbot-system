import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  ChevronDown, LogOut, LayoutDashboard, Shield, Menu, X, LogIn,
  Bell, Settings, MessageSquare, Users, CheckCircle2, Zap, Check, AlertTriangle, RefreshCw
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { MobiFoneLogo } from "./MobiFoneLogo";
import { API_BASE } from "../../config";

interface RealNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  unread: boolean;
  type: "conversation" | "lead" | "knowledge" | "warning" | "system";
  path: string;
}

function formatRelativeTime(dateInput?: string | number | Date): string {
  if (!dateInput) return "Vừa xong";
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec) || diffSec < 30) return "Vừa xong";
  if (diffSec < 60) return `${diffSec} giây trước`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Detect scroll để đổi style navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đóng user menu & notif menu khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Đóng mobile menu khi chuyển route
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // 1. Tải thông báo thực tế từ Backend API (Leads thực & Chat history thực)
  const fetchRealNotifications = async () => {
    const token = localStorage.getItem("mobifone_admin_token");
    if (!token) return;
    setLoadingNotifs(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [leadsRes, chatRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/leads`, config),
        axios.get(`${API_BASE}/chat/history`, config),
      ]);

      const realItems: RealNotification[] = [];

      // Đọc Leads thực từ cơ sở dữ liệu backend
      if (leadsRes.status === "fulfilled" && Array.isArray(leadsRes.value.data)) {
        const leads = leadsRes.value.data;
        leads.slice(0, 15).forEach((lead: any) => {
          const isUncontacted = lead.status === "Chưa liên hệ" || lead.status === "new";
          realItems.push({
            id: `lead-${lead.id}`,
            title: isUncontacted ? `Lead mới: ${lead.name || lead.phone}` : `Khách hàng: ${lead.name || lead.phone}`,
            desc: `SĐT: ${lead.phone}${lead.notes ? ` · ${lead.notes}` : " · Quan tâm tư vấn CSKH MobiFone"}`,
            time: formatRelativeTime(lead.createdAt),
            timestamp: new Date(lead.createdAt || Date.now()).getTime(),
            unread: isUncontacted,
            type: "lead",
            path: "/admin/leads",
          });
        });
      }

      // Đọc các cuộc hội thoại chat thực tế
      if (chatRes.status === "fulfilled" && Array.isArray(chatRes.value.data)) {
        const logs = chatRes.value.data;
        const userLogs = logs.filter((l: any) => l.sender === "user" || l.sender === "customer").slice(-15);
        userLogs.forEach((log: any) => {
          realItems.push({
            id: `chat-${log.id || Math.random()}`,
            title: `Hội thoại từ phiên ${String(log.sessionId || "").substring(0, 8)}`,
            desc: log.message || "Khách hàng gửi câu hỏi cho Chatbot AI",
            time: formatRelativeTime(log.createdAt),
            timestamp: new Date(log.createdAt || Date.now()).getTime(),
            unread: true,
            type: "conversation",
            path: "/admin/conversations",
          });
        });
      }

      // Sắp xếp theo thời gian mới nhất lên đầu
      realItems.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(realItems);
    } catch (err) {
      console.error("Lỗi khi kết nối tải thông báo từ backend:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // 2. Lắng nghe thông báo Realtime từ Backend qua kết nối SSE
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("mobifone_admin_token");
    if (!token) return;

    fetchRealNotifications();

    const handleNewSSEEvent = (data: any) => {
      if (!data || !data.type) return;
      const now = Date.now();
      let newItem: RealNotification | null = null;

      if (data.type === "new-lead") {
        newItem = {
          id: `sse-lead-${now}`,
          title: `⚡ Lead mới: ${data.payload?.name || data.payload?.phone || "Khách hàng mới"}`,
          desc: `SĐT: ${data.payload?.phone || "Mới đăng ký"} vừa gửi yêu cầu tư vấn gói cước.`,
          time: "Vừa xong",
          timestamp: now,
          unread: true,
          type: "lead",
          path: "/admin/leads",
        };
      } else if (data.type === "new-message") {
        newItem = {
          id: `sse-msg-${now}`,
          title: `💬 Tin nhắn từ phiên ${String(data.payload?.sessionId || "").substring(0, 8)}`,
          desc: data.payload?.message || "Khách hàng vừa gửi câu hỏi tới hệ thống.",
          time: "Vừa xong",
          timestamp: now,
          unread: true,
          type: "conversation",
          path: "/admin/conversations",
        };
      } else if (data.type === "manual-intervention-required") {
        newItem = {
          id: `sse-warn-${now}`,
          title: `🚨 Yêu cầu hỗ trợ trực tiếp!`,
          desc: `Phiên ${String(data.payload?.sessionId || "").substring(0, 8)} cần tư vấn viên can thiệp ngay.`,
          time: "Vừa xong",
          timestamp: now,
          unread: true,
          type: "warning",
          path: "/admin/conversations",
        };
      } else if (data.type === "doc-status") {
        newItem = {
          id: `sse-doc-${now}`,
          title: `📚 ${data.payload?.name || "Tri thức hệ thống"}`,
          desc: data.payload?.message || "Trạng thái xử lý tài liệu tri thức đã thay đổi.",
          time: "Vừa xong",
          timestamp: now,
          unread: true,
          type: "knowledge",
          path: "/admin/knowledge",
        };
      }

      if (newItem) {
        setNotifications(prev => [newItem!, ...prev.filter(i => i.id !== newItem!.id)].slice(0, 50));
      }
    };

    // Lắng nghe sự kiện customEvent app-notification
    const handleAppCustomNotification = (e: any) => handleNewSSEEvent(e.detail);
    window.addEventListener("app-notification", handleAppCustomNotification);

    // Kết nối trực tiếp SSE tới Backend
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    const connectSSEStream = () => {
      try {
        eventSource = new EventSource(`${API_BASE}/notifications/sse?token=${token}`);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleNewSSEEvent(data);
          } catch (err) {
            console.error("Lỗi đọc dữ liệu sự kiện SSE:", err);
          }
        };
        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          reconnectTimer = setTimeout(connectSSEStream, 5000);
        };
      } catch (e) {
        console.warn("Không thể kết nối luồng SSE:", e);
      }
    };

    connectSSEStream();

    return () => {
      window.removeEventListener("app-notification", handleAppCustomNotification);
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setUserMenuOpen(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (notif: RealNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
    setNotifMenuOpen(false);
    navigate(notif.path);
  };

  const isHome = location.pathname === "/";

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 font-outfit transition-all duration-500 ${
        scrolled || !isHome
          ? "bg-[#080d1a]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06)] shadow-lg shadow-black/30"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between gap-6">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 no-underline shrink-0 group">
            <div className="group-hover:scale-105 transition-transform duration-200">
              <MobiFoneLogo size={34} dark={false} />
            </div>
            <div className="hidden sm:flex flex-col -space-y-0.5">
              <span className="text-white/90 font-black text-[13px] leading-none tracking-wide">MobiFone</span>
              <span className="text-white/35 text-[9px] font-semibold tracking-[0.12em] uppercase">AI Platform</span>
            </div>
          </Link>

          {/* ── Center nav pills (only on desktop, only when not logged in) ── */}
          {!user && (
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {[
                { label: "Tính năng", href: "#features" },
                { label: "Cách hoạt động", href: "#how-it-works" },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 rounded-xl text-white/55 hover:text-white hover:bg-white/6 text-xs font-semibold transition-all duration-200 no-underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* ── Right actions ── */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {user ? (
              <>
                {/* Real-time Notification bell */}
                <div ref={notifMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setNotifMenuOpen(p => !p);
                      setUserMenuOpen(false);
                    }}
                    className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      notifMenuOpen
                        ? "bg-white/12 border-white/25 text-white"
                        : "bg-white/6 hover:bg-white/10 border-white/10 text-white/50 hover:text-white/80"
                    }`}
                    title="Thông báo realtime hệ thống"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#E30613] text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_#E30613] animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Realtime Notification Dropdown Popover */}
                  {notifMenuOpen && (
                    <div className="absolute top-[calc(100%+10px)] right-0 w-[340px] sm:w-[380px] bg-[#0c1425] border border-white/12 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 z-[100] font-outfit animate-in fade-in zoom-in-95 duration-150">
                      {/* Header */}
                      <div className="px-4 py-3 bg-white/4 border-b border-white/8 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white/90 font-bold text-xs">Thông báo Realtime</span>
                          {unreadCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#0055A5]/30 border border-[#0055A5]/50 text-blue-300 text-[10px] font-bold">
                              {unreadCount} mới
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-white/6 text-white/40 text-[10px] font-semibold">
                              Đã xem hết
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={fetchRealNotifications}
                            disabled={loadingNotifs}
                            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-all border-none bg-transparent cursor-pointer"
                            title="Tải lại thông báo"
                          >
                            <RefreshCw size={12} className={loadingNotifs ? "animate-spin" : ""} />
                          </button>

                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer border-none bg-transparent flex items-center gap-1 hover:underline"
                            >
                              <Check size={11} />
                              Đánh dấu đã đọc
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Real Notification list */}
                      <div className="max-h-[340px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                        {loadingNotifs && notifications.length === 0 ? (
                          <div className="py-8 text-center text-white/40 text-xs font-semibold flex flex-col items-center gap-2">
                            <RefreshCw size={16} className="animate-spin text-blue-400" />
                            Đang tải thông báo từ hệ thống...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="py-10 text-center text-white/40 text-xs font-semibold flex flex-col items-center gap-2">
                            <Bell size={24} className="text-white/20" />
                            Hiện chưa có thông báo mới từ hệ thống
                          </div>
                        ) : (
                          notifications.map(notif => {
                            const getIcon = () => {
                              switch (notif.type) {
                                case "conversation":
                                  return { icon: MessageSquare, bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
                                case "lead":
                                  return { icon: Users, bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
                                case "warning":
                                  return { icon: AlertTriangle, bg: "bg-red-500/10 text-red-400 border-red-500/20" };
                                case "knowledge":
                                  return { icon: CheckCircle2, bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
                                default:
                                  return { icon: Zap, bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
                              }
                            };
                            const iconObj = getIcon();
                            const IconComp = iconObj.icon;

                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all duration-150 ${
                                  notif.unread
                                    ? "bg-blue-500/8 hover:bg-blue-500/14 border-l-2 border-l-blue-500"
                                    : "hover:bg-white/4"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${iconObj.bg}`}>
                                  <IconComp size={15} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <div className={`text-xs font-bold truncate ${notif.unread ? "text-white" : "text-white/70"}`}>
                                      {notif.title}
                                    </div>
                                    {notif.unread && (
                                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                    )}
                                  </div>

                                  <div className="text-white/50 text-[11px] leading-relaxed line-clamp-2 mb-1">
                                    {notif.desc}
                                  </div>

                                  <div className="text-white/30 text-[9px] font-semibold">
                                    {notif.time}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-2 bg-white/2 border-t border-white/6 text-center flex items-center justify-between px-4">
                        <span className="text-[10px] text-white/30 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Kết nối SSE Realtime
                        </span>
                        <button
                          onClick={() => {
                            setNotifMenuOpen(false);
                            navigate("/admin");
                          }}
                          className="py-1 px-2.5 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs font-semibold cursor-pointer border-none bg-transparent transition-all"
                        >
                          Trang quản trị →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings shortcut */}
                <button
                  onClick={() => navigate("/admin")}
                  className="w-9 h-9 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/80 transition-all duration-200 cursor-pointer"
                  title="Cấu hình hệ thống"
                >
                  <Settings size={16} />
                </button>

                {/* User avatar dropdown */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setUserMenuOpen(p => !p);
                      setNotifMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      userMenuOpen
                        ? "bg-white/10 border-white/20"
                        : "bg-white/6 border-white/10 hover:bg-white/10 hover:border-white/18"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm overflow-hidden shrink-0 ${
                      user.role === "admin"
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : "bg-gradient-to-br from-[#0055A5] to-[#0099FF]"
                    }`}>
                      {user.avatar
                        ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        : user.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="text-left">
                      <div className="text-white/90 text-xs font-bold leading-none mb-[3px]">
                        {user.name.split(" ").slice(-2).join(" ")}
                      </div>
                      <div className={`text-[9px] font-bold leading-none ${
                        user.role === "admin" ? "text-amber-400" : "text-blue-400"
                      }`}>
                        {user.role === "admin" ? "Quản trị viên" : "Nhân viên CSKH"}
                      </div>
                    </div>
                    <ChevronDown size={13} className={`text-white/30 ml-0.5 transition-transform duration-250 ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute top-[calc(100%+10px)] right-0 w-[230px] bg-[#0c1425] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 z-[100]">
                      {/* Header */}
                      <div className="px-4 py-3.5 bg-white/3 border-b border-white/8">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm overflow-hidden ${
                            user.role === "admin"
                              ? "bg-gradient-to-br from-amber-400 to-orange-500"
                              : "bg-gradient-to-br from-[#0055A5] to-[#0099FF]"
                          }`}>
                            {user.avatar
                              ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                              : user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white/90 font-bold text-sm truncate">{user.name}</div>
                            <div className="text-white/35 text-[10px] truncate">{user.email}</div>
                          </div>
                        </div>
                        <div className="mt-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            user.role === "admin"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}>
                            <Shield size={9} />
                            {user.role === "admin" ? "Quản trị viên" : "Nhân viên CSKH"}
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        <button
                          onClick={() => { navigate("/admin"); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/6 text-[11px] font-semibold cursor-pointer border-none bg-transparent text-left transition-all duration-150"
                        >
                          <LayoutDashboard size={14} className="shrink-0 text-white/25" />
                          Bảng điều khiển
                        </button>

                        <div className="my-1 border-t border-white/6" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/8 text-[11px] font-semibold cursor-pointer border-none bg-transparent text-left transition-all duration-150"
                        >
                          <LogOut size={14} className="shrink-0" />
                          Đăng xuất tài khoản
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Guest CTA */
              <button
                onClick={() => navigate("/login")}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer border-none font-bold text-sm text-white transition-all duration-200 hover:scale-[1.03] active:scale-97 overflow-hidden group"
                style={{ background: "linear-gradient(135deg, #0055A5 0%, #0077CC 100%)" }}
              >
                {/* Shine effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <LogIn size={14} />
                Đăng nhập hệ thống
              </button>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            className="md:hidden w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* ── Progress bar (decorative) ── */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#0055A5]/40 to-transparent" />
      </nav>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[68px] z-40 bg-[#080d1a]/98 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/50 font-outfit animate-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-5 space-y-2">
            {!user && (
              <>
                <a href="#features" className="block py-3 px-4 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-sm font-semibold no-underline transition-all">Tính năng</a>
                <a href="#how-it-works" className="block py-3 px-4 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-sm font-semibold no-underline transition-all">Cách hoạt động</a>
                <div className="pt-2 border-t border-white/6" />
              </>
            )}

            {user ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/4 rounded-xl border border-white/8 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black ${
                    user.role === "admin" ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-[#0055A5] to-[#0099FF]"
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white/90 font-bold text-sm">{user.name}</div>
                    <div className={`text-xs font-semibold ${user.role === "admin" ? "text-amber-400" : "text-blue-400"}`}>
                      {user.role === "admin" ? "Quản trị viên" : "Nhân viên CSKH"}
                    </div>
                  </div>
                </div>
                <button onClick={() => navigate("/admin")} className="w-full py-3 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm cursor-pointer text-center border-none">
                  Bảng điều khiển
                </button>
                <button onClick={handleLogout} className="w-full py-3 px-4 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 font-bold text-sm cursor-pointer text-center">
                  Đăng xuất
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #0055A5 0%, #0077CC 100%)" }}
              >
                <LogIn size={15} /> Đăng nhập hệ thống
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
