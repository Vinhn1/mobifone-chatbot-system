import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, Users, MessageSquare, Target, DollarSign,
  Phone, Activity, Calendar, ArrowRight, Zap, Award, RefreshCw,
  Search, Download, Bell, ChevronRight, Wifi, Flame, Sun, Snowflake,
  Sparkles, Bot, BarChart3, CircleDollarSign, CheckCircle2, PhoneCall,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { API_BASE } from "../../../config";

/* ─────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1200, deps: unknown[] = []) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    if (target === 0) return;
    const start = performance.now();
    const raf = (ts: number) => {
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, ...deps]);
  return value;
}

/* ─────────────────────────────────────────────────────────
   SPARKLINE
───────────────────────────────────────────────────────── */
function Spark({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 90, H = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id={`sg${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`url(#sg${color.replace("#", "")})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const last = data[data.length - 1];
        const x = W;
        const y = H - ((last - min) / range) * H;
        return <circle cx={x} cy={y} r="3.5" fill={color} />;
      })()}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   DONUT CHART
───────────────────────────────────────────────────────── */
interface DonutSlice { label: string; pct: number; color: string; count: number; }
function DonutChart({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const R = 60, C = 2 * Math.PI * R;
  let cumulativePct = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={160} height={160} viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
          {slices.length === 0 ? (
            <circle cx={80} cy={80} r={R} fill="none" stroke="#E2E8F0" strokeWidth={24} />
          ) : (
            slices.map((s, i) => {
              const offset = C - (s.pct / 100) * C;
              const dash = cumulativePct;
              cumulativePct += s.pct;
              return (
                <circle
                  key={i}
                  cx={80} cy={80} r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hovered === i ? 28 : 22}
                  strokeDasharray={`${(s.pct / 100) * C} ${C}`}
                  strokeDashoffset={-((dash / 100) * C)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-width 0.2s ease", cursor: "pointer", filter: hovered === i ? `drop-shadow(0 0 6px ${s.color})` : "none" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-black text-slate-800">{total}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads</div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {slices.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            style={{
              background: hovered === i ? `${s.color}15` : "transparent",
              border: `1px solid ${hovered === i ? s.color : "#E2E8F0"}`,
              color: hovered === i ? s.color : "#64748B",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.label} · {s.count}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FUNNEL STAGE (SVG Trapezoid)
───────────────────────────────────────────────────────── */
function FunnelBar({ stage, count, maxCount, color, value, index }:
  { stage: string; count: number; maxCount: number; color: string; value: string; index: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const animPct = useCountUp(Math.round(pct), 900, [count]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex flex-col gap-2"
    >
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-slate-500 text-[11px] font-bold truncate pr-2">{stage}</span>
        <div className="flex items-center gap-2 shrink-0">
          {value !== "—" && (
            <span className="text-[10px] font-bold" style={{ color }}>{value}đ</span>
          )}
          <span className="text-slate-800 text-xs font-black">{count}</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 min-w-[34px] text-center">
            {animPct}%
          </span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-slate-100/80 overflow-hidden p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   LIVE TICKER
───────────────────────────────────────────────────────── */
function LiveTicker({ items }: { items: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 2800);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399] animate-pulse shrink-0" />
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-white/80 text-[11px] font-semibold whitespace-nowrap"
        >
          {items[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ACTIVITY FEED
───────────────────────────────────────────────────────── */
interface ActivityEvent { icon: React.ComponentType<{ size?: number; className?: string }>; text: string; time: string; type: "lead" | "session" | "hot" | "system"; }
function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const colorMap = { lead: "#0055A5", session: "#8B5CF6", hot: "#EF4444", system: "#10B981" };
  const bgMap = { lead: "#EFF6FF", session: "#F5F3FF", hot: "#FEF2F2", system: "#F0FDF4" };

  return (
    <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
      {events.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm font-bold">Chưa có hoạt động nào.</div>
      ) : (
        events.map((e, i) => {
          const IconComp = e.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: bgMap[e.type], color: colorMap[e.type] }}
              >
                <IconComp size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-700 text-xs font-semibold leading-snug">{e.text}</div>
                <div className="text-slate-400 text-[10px] font-bold mt-0.5">{e.time}</div>
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: colorMap[e.type] }}
              />
            </motion.div>
          );
        })
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
const SCORES: Record<string, { bg: string; color: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  hot: { bg: "bg-rose-50 border border-rose-200 text-rose-600", color: "#EF4444", label: "HOT", icon: Flame },
  warm: { bg: "bg-amber-50 border border-amber-200 text-amber-600", color: "#F59E0B", label: "WARM", icon: Sun },
  cold: { bg: "bg-blue-50 border border-blue-200 text-[#0055A5]", color: "#3B82F6", label: "COLD", icon: Snowflake },
};

const cleanInterestText = (text: string): string => {
  if (!text) return "Tư vấn chung";
  let cleaned = text;
  if (cleaned.includes("Câu hỏi:")) {
    const match = cleaned.match(/Câu hỏi:\s*["']([^"']+)["']/i);
    if (match && match[1]) cleaned = match[1];
    else cleaned = cleaned.replace(/^Trích xuất từ phiên chat:[^.]+.\s*Câu hỏi:\s*/i, "");
  }
  cleaned = cleaned.replace(/(?:0|\+84)\d{9,10}/g, "");
  cleaned = cleaned.replace(/tôi tên\s+[a-zà-ỹ\s]+số điện thoại\s+(?:tôi\s+)?là\s*/gi, "");
  cleaned = cleaned.replace(/tôi muốn\s+(?:các\s+|tìm\s+)?thông tin\s+/gi, "");
  cleaned = cleaned.replace(/hãy liên hệ với tôi sớm nhất/gi, "Yêu cầu liên hệ");
  cleaned = cleaned.trim().replace(/^["']|["']$/g, "").trim();
  if (cleaned) cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned.length > 42 ? cleaned.slice(0, 39) + "…" : cleaned || "Tư vấn gói cước";
};

const formatPhone = (phone: string) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\s/g, "");
  return cleaned.length >= 7 ? `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}` : phone;
};

const getPackagePrice = (interest: string) => {
  const lower = (interest || "").toLowerCase();
  if (lower.includes("tk199")) return 199000;
  if (lower.includes("tk135") || lower.includes("135")) return 135000;
  if (lower.includes("max299")) return 299000;
  if (lower.includes("tk79")) return 79000;
  if (lower.includes("esim")) return 50000;
  return 120000;
};

/* ─────────────────────────────────────────────────────────
   INTERFACES
───────────────────────────────────────────────────────── */
interface Lead {
  id: number;
  name: string | null;
  phone: string;
  interest: string;
  createdAt: string;
}
interface ChatLog {
  id: number;
  sessionId: string;
  role: "user" | "bot";
  message: string;
  createdAt: string;
}

/* ─────────────────────────────────────────────────────────
   KPI CARD (separate component to correctly use hooks)
───────────────────────────────────────────────────────── */
interface KpiCardData {
  title: string;
  rawValue: number;
  displayValue: string;
  change: string;
  up: boolean;
  color: string;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  data: number[];
  sub: string;
  index: number;
}
function KpiCard({ k }: { k: KpiCardData }) {
  const { icon: Icon } = k;
  const animVal = useCountUp(Math.round(k.rawValue), 1200, [k.rawValue]);
  const displayAnimated = k.title === "Tỷ Lệ Chuyển Đổi"
    ? `${k.rawValue.toFixed(1)}%`
    : k.title === "Doanh Thu Ước Tính"
      ? `${k.rawValue.toFixed(1)}M đ`
      : animVal.toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: k.index * 0.07, type: "spring", stiffness: 300, damping: 24 }}
      className="relative rounded-3xl p-5 flex flex-col gap-4 cursor-default group overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${k.color}22`,
        boxShadow: `0 2px 16px 0 ${k.color}0a, 0 0 0 1px ${k.color}10`,
      }}
      whileHover={{
        y: -4,
        boxShadow: `0 16px 40px 0 ${k.color}20, 0 0 0 1px ${k.color}25`,
        transition: { duration: 0.2 },
      }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
        style={{ background: `radial-gradient(circle, ${k.color}30, transparent)` }}
      />

      <div className="relative flex justify-between items-start">
        <div>
          <div className="text-[10px] font-extrabold tracking-widest uppercase mb-1.5" style={{ color: `${k.color}99` }}>
            {k.title}
          </div>
          <div className="text-slate-800 text-2xl font-black tracking-tight tabular-nums">
            {displayAnimated}
          </div>
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${k.color}12, ${k.color}06)`,
            borderColor: `${k.color}20`,
          }}
        >
          <Icon size={20} style={{ color: k.color }} />
        </div>
      </div>

      <div className="relative flex justify-between items-end border-t pt-3.5" style={{ borderColor: `${k.color}15` }}>
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            {k.up
              ? <TrendingUp size={11} className="text-emerald-500" />
              : <TrendingDown size={11} className="text-rose-500" />}
            <span className={`text-xs font-bold ${k.up ? "text-emerald-600" : "text-rose-600"}`}>{k.change}</span>
          </div>
          <div className="text-slate-400 text-[10px] font-semibold">{k.sub}</div>
        </div>
        <div className="pb-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Spark data={k.data} color={k.color} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   CIRCULAR SCORE
───────────────────────────────────────────────────────── */
function CircleScore({ score, color }: { score: number; color: string }) {
  const R = 16, C = 2 * Math.PI * R;
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={22} cy={22} r={R} fill="none" stroke="#F1F5F9" strokeWidth={5} />
        <motion.circle
          cx={22} cy={22} r={R}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (score / 100) * C }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-extrabold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export function DashboardPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("Hôm nay");
  const [searchQuery, setSearchQuery] = useState("");
  const [leadFilter, setLeadFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "sales")) navigate("/login");
  }, [user, navigate]);

  const fetchData = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [leadsRes, chatLogsRes] = await Promise.all([
        axios.get(`${API_BASE}/leads`, config),
        axios.get(`${API_BASE}/chat/history`, config),
      ]);
      setLeads(leadsRes.data || []);
      setChatLogs(chatLogsRes.data || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu Dashboard:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  /* ── Derived Data ── */
  const totalLeads = leads.length;
  const totalSessions = new Set(chatLogs.map(l => l.sessionId)).size;
  const conversionRate = totalSessions > 0 ? (totalLeads / totalSessions) * 100 : 0;
  const potentialRevenueVND = leads.reduce((sum, l) => sum + getPackagePrice(l.interest), 0);
  const potentialRevenueMillion = (potentialRevenueVND / 1000000).toFixed(1);
  const todayLeads = leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;

  const packageCounts: Record<string, number> = {};
  leads.forEach(l => {
    let pkg = "Khác";
    const lower = (l.interest || "").toLowerCase();
    if (lower.includes("tk135") || lower.includes("135")) pkg = "TK135";
    else if (lower.includes("tk199")) pkg = "TK199";
    else if (lower.includes("esim")) pkg = "eSIM";
    else if (lower.includes("max299")) pkg = "MAX299";
    else if (lower.includes("tk79")) pkg = "TK79";
    packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
  });

  const PKG_COLORS: Record<string, string> = {
    TK135: "#F59E0B", TK199: "#8B5CF6", eSIM: "#0055A5", MAX299: "#EF4444", TK79: "#10B981", Khác: "#64748B",
  };

  const donutSlices: DonutSlice[] = Object.entries(packageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label, count,
      pct: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
      color: PKG_COLORS[label] ?? "#64748B",
    }));

  const getSparklineData = (type: "leads" | "conversion" | "revenue" | "sessions") => {
    if (type === "leads") return [10, 15, 12, 18, 14, 22, 25, 20, totalLeads || 10];
    if (type === "conversion") return [15, 18, 16, 20, 19, 21, 23, 22, conversionRate || 10];
    if (type === "revenue") return [1.5, 2.2, 2.0, 3.1, 2.8, 3.8, 4.2, 4.0, Number(potentialRevenueMillion) || 2.0];
    return [80, 110, 95, 130, 120, 150, 165, 150, totalSessions || 80];
  };

  const kpiData = [
    { title: "Tổng Leads", value: totalLeads, displayValue: totalLeads.toString(), change: `+${todayLeads} hôm nay`, up: true, color: "#0055A5", icon: Users, data: getSparklineData("leads"), sub: "RAG extraction" },
    { title: "Tỷ Lệ Chuyển Đổi", value: conversionRate, displayValue: `${conversionRate.toFixed(1)}%`, change: "+2.4% tuần qua", up: true, color: "#10B981", icon: Target, data: getSparklineData("conversion"), sub: "Leads / Sessions" },
    { title: "Doanh Thu Ước Tính", value: Number(potentialRevenueMillion), displayValue: `${potentialRevenueMillion}M đ`, change: `+${(leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).reduce((sum, l) => sum + getPackagePrice(l.interest), 0) / 1000000).toFixed(1)}M hôm nay`, up: true, color: "#F59E0B", icon: DollarSign, data: getSparklineData("revenue"), sub: "Theo đơn giá gói cước" },
    { title: "Phiên Tương Tác", value: totalSessions, displayValue: totalSessions.toString(), change: `+${chatLogs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length} hôm nay`, up: true, color: "#8B5CF6", icon: MessageSquare, data: getSparklineData("sessions"), sub: "Đa kênh" },
  ];

  const pipelineData = [
    { stage: "Tiếp cận (Sessions)", count: totalSessions, color: "#64748B", value: "—" },
    { stage: "Có thông tin (Leads)", count: totalLeads, color: "#0055A5", value: `${(potentialRevenueVND / 1000000).toFixed(1)}M` },
    { stage: "Có Tên/Nhu cầu", count: leads.filter(l => l.name).length, color: "#F59E0B", value: `${(leads.filter(l => l.name).reduce((sum, l) => sum + getPackagePrice(l.interest), 0) / 1000000).toFixed(1)}M` },
    { stage: "Hẹn tư vấn (CRM)", count: Math.round(totalLeads * 0.4), color: "#8B5CF6", value: `${((potentialRevenueVND * 0.4) / 1000000).toFixed(1)}M` },
    { stage: "Thành công (Ký HĐ)", count: Math.round(totalLeads * 0.15), color: "#10B981", value: `${((potentialRevenueVND * 0.15) / 1000000).toFixed(1)}M` },
  ];

  const getLeadScore = (lead: Lead) => Math.min(45 + (lead.interest?.length || 0) * 1.5 + (lead.name ? 15 : 0), 99);

  const allProcessedLeads = leads
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(lead => {
      const score = getLeadScore(lead);
      const status = score >= 80 ? "hot" : score >= 60 ? "warm" : "cold";
      const diffMs = new Date().getTime() - new Date(lead.createdAt).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / 60000));
      const timeStr = diffMins > 1440 ? `${Math.round(diffMins / 1440)} ngày` : diffMins > 60 ? `${Math.round(diffMins / 60)} giờ` : `${diffMins} phút`;
      return { ...lead, score, status, time: timeStr };
    });

  const filteredLeads = allProcessedLeads
    .filter(l => leadFilter === "all" || l.status === leadFilter)
    .filter(l => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.name || "").toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.interest || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  // Activity feed
  const activityEvents: ActivityEvent[] = [
    ...leads.slice(0, 3).map(l => ({
      icon: Sparkles,
      text: `Lead mới: ${l.name || "Khách hàng ẩn danh"} — ${cleanInterestText(l.interest)}`,
      time: (() => {
        const d = Math.max(1, Math.round((new Date().getTime() - new Date(l.createdAt).getTime()) / 60000));
        return d > 60 ? `${Math.round(d / 60)} giờ trước` : `${d} phút trước`;
      })(),
      type: "lead" as const,
    })),
    { icon: Bot, text: "Mia AI đang hoạt động — phản hồi trung bình 1.2 giây", time: "Liên tục", type: "system" as const },
    { icon: MessageSquare, text: `${chatLogs.length} tin nhắn được xử lý hôm nay`, time: "Cập nhật liên tục", type: "session" as const },
    ...allProcessedLeads.filter(l => l.status === "hot").slice(0, 2).map(l => ({
      icon: Flame,
      text: `Lead HOT: ${l.name || "Khách hàng ẩn danh"} — Score ${l.score}`,
      time: `${l.time} trước`,
      type: "hot" as const,
    })),
  ];

  const tickerItems = [
    `Leads hôm nay: ${todayLeads}`,
    `Doanh thu ước tính: ${potentialRevenueMillion}M đ`,
    `Mia AI Active — phản hồi 1.2s`,
    `${allProcessedLeads.filter(l => l.status === "hot").length} leads HOT cần liên hệ`,
    `${totalSessions} phiên tương tác`,
    `Tỷ lệ chuyển đổi: ${conversionRate.toFixed(1)}%`,
  ];



  const exportCSV = () => {
    const rows = [["Tên", "Số điện thoại", "Quan tâm", "Score", "Thời gian"].join(",")];
    allProcessedLeads.forEach(l => {
      rows.push([l.name || "Ẩn danh", l.phone, `"${cleanInterestText(l.interest)}"`, l.score, l.time].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-4 font-outfit">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0055A5] to-[#E4002B] flex items-center justify-center shadow-lg shadow-[#0055A5]/25">
            <Activity size={28} className="text-white animate-spin" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#0055A5]/20 to-[#E4002B]/20 blur-lg animate-pulse" />
        </div>
        <div className="text-slate-600 font-bold text-sm">Đang phân tích dữ liệu bán hàng...</div>
        <div className="text-slate-400 font-semibold text-xs">Mia AI đang tổng hợp báo cáo</div>
      </div>
    );
  }

  return (
    <div className="font-outfit flex flex-col gap-5 pb-10">

      {/* ══════════════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #0055A5 0%, #003B75 45%, #1a0a2e 75%, #2d0a14 100%)",
        }}
      >
        {/* Grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #E4002B, transparent)" }} />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #60A5FA, transparent)" }} />

        {/* Main header content */}
        <div className="relative z-10 px-6 pt-5 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left: Title */}
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                  <Zap size={16} className="text-amber-300 fill-amber-300" />
                </div>
                <h1 className="text-white font-black text-xl sm:text-2xl tracking-tight">
                  Giám Sát Doanh Thu & Phễu Bán Hàng
                </h1>
              </div>
              <p className="text-white/55 text-xs font-semibold">
                Báo cáo hiệu quả hỗ trợ trực tuyến của Mia và đa kênh viễn thông
              </p>
            </div>

            {/* Right: Status + Period */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Mia Status */}
              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399] animate-pulse" />
                <Wifi size={11} className="text-emerald-300" />
                <span className="text-emerald-300 text-[11px] font-bold">Mia Active</span>
              </div>

              {/* Period Selector — white bg for clear visibility */}
              <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm">
                <Calendar size={12} className="text-slate-500" />
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="border-none outline-none text-xs font-bold text-slate-700 bg-transparent cursor-pointer font-outfit"
                >
                  <option value="Hôm nay">Hôm nay</option>
                  <option value="7 ngày qua">7 ngày qua</option>
                  <option value="Tháng này">Tháng này</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live ticker bar */}
        <div className="relative z-10 px-6 py-2.5 border-t border-white/10 flex items-center gap-4">
          <LiveTicker items={tickerItems} />
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          QUICK ACTIONS BAR
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="flex-1 flex items-center gap-2.5 bg-white border border-slate-200/70 rounded-2xl px-4 py-2.5 shadow-xs focus-within:border-[#0055A5]/40 focus-within:shadow-md focus-within:shadow-[#0055A5]/10 transition-all">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Tìm kiếm lead theo tên, SĐT, quan tâm..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 bg-transparent font-outfit"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs font-bold shrink-0">✕</button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => fetchData(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/70 text-slate-600 font-bold text-xs shadow-xs hover:border-[#0055A5]/30 hover:text-[#0055A5] transition-all active:scale-95"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/70 text-slate-600 font-bold text-xs shadow-xs hover:border-emerald-400/40 hover:text-emerald-600 transition-all active:scale-95"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => navigate("/admin/leads")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#0055A5] to-[#003B75] text-white font-bold text-xs shadow-md hover:shadow-lg hover:shadow-[#0055A5]/25 transition-all active:scale-95"
          >
            <Bell size={14} />
            <span className="hidden sm:inline">Quản lý Leads</span>
            {allProcessedLeads.filter(l => l.status === "hot").length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[9px] font-extrabold -ml-0.5">
                {allProcessedLeads.filter(l => l.status === "hot").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          KPI CARDS — Glassmorphism
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((k, i) => (
          <KpiCard
            key={k.title}
            k={{
              title: k.title,
              rawValue: k.value,
              displayValue: k.displayValue,
              change: k.change,
              up: k.up,
              color: k.color,
              icon: k.icon as React.ComponentType<{ size: number; style?: React.CSSProperties }>,
              data: k.data,
              sub: k.sub,
              index: i,
            }}
          />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          PIPELINE FUNNEL
      ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-xs hover:shadow-md transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <div className="text-slate-800 font-extrabold text-base flex items-center gap-2">
              <Zap size={16} className="text-amber-500 fill-amber-500" />
              Phễu Chuyển Đổi & Ước Lượng Dòng Tiền
            </div>
            <div className="text-slate-400 text-xs font-semibold mt-0.5">
              Tiến trình từ bước tiếp cận đến đăng ký gói cước thành công
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Tỷ lệ tính theo tổng phiên
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {pipelineData.map((s, i) => (
            <FunnelBar
              key={s.stage}
              stage={s.stage}
              count={s.count}
              maxCount={totalSessions || 1}
              color={s.color}
              value={s.value}
              index={i}
            />
          ))}
        </div>

        {/* Arrow connector hint */}
        <div className="flex items-center justify-center gap-1 mt-4 text-[10px] font-semibold text-slate-300">
          <ChevronRight size={12} />
          <span>Mỗi stage hẹp dần theo tỷ lệ chuyển đổi</span>
          <ChevronRight size={12} />
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          BOTTOM ROW: Leads Cards + Donut + Activity
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* ── Leads Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden hover:shadow-md transition-all duration-300"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-slate-800 font-extrabold text-base">Khách Hàng Tiềm Năng</div>
              <div className="text-slate-400 text-xs font-semibold mt-0.5">Cập nhật liên tục từ chatbot RAG</div>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 bg-slate-100/70 rounded-xl p-1">
              {(["all", "hot", "warm", "cold"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLeadFilter(f)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                  style={{
                    background: leadFilter === f ? "white" : "transparent",
                    color: leadFilter === f
                      ? f === "hot" ? "#EF4444" : f === "warm" ? "#F59E0B" : f === "cold" ? "#3B82F6" : "#0F172A"
                      : "#94A3B8",
                    boxShadow: leadFilter === f ? "0 1px 4px 0 rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {f === "all" && "Tất cả"}
                  {f === "hot" && <><Flame size={11} /> HOT</>}
                  {f === "warm" && <><Sun size={11} /> WARM</>}
                  {f === "cold" && <><Snowflake size={11} /> COLD</>}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="p-4 flex flex-col gap-3">
            {filteredLeads.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm font-bold">
                {searchQuery ? `Không tìm thấy kết quả cho "${searchQuery}"` : "Chưa có dữ liệu leads."}
              </div>
            ) : (
              filteredLeads.map((l, i) => {
                const s = SCORES[l.status] || SCORES.cold;
                const StatusIcon = s.icon;
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-sm group"
                    style={{ borderColor: `${s.color}25`, background: `${s.color}04` }}
                    whileHover={{ borderColor: `${s.color}50`, background: `${s.color}08` }}
                  >
                    {/* Left accent */}
                    <div className="w-1 h-12 rounded-full shrink-0 self-stretch" style={{ backgroundColor: s.color }} />

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0 shadow-xs"
                      style={{ background: `linear-gradient(135deg, #0055A5, #E4002B)` }}
                    >
                      {(l.name || "?").charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-800 font-bold text-sm truncate">{l.name || "Khách hàng ẩn danh"}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${s.bg}`}>
                          <StatusIcon size={10} />
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-slate-400 text-[11px] font-bold">{formatPhone(l.phone)}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 text-[11px] font-semibold truncate max-w-[180px]">
                          {cleanInterestText(l.interest)}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[10px] font-semibold mt-0.5">{l.time} trước</div>
                    </div>

                    {/* Score circle */}
                    <CircleScore score={l.score} color={s.color} />

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={`tel:${l.phone}`}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform hover:scale-110 active:scale-95"
                        style={{ background: `linear-gradient(135deg, #0055A5, #003B75)` }}
                        title="Gọi ngay"
                      >
                        <Phone size={13} />
                      </a>
                      <button
                        onClick={() => navigate("/admin/leads")}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-95"
                        title="Xem chi tiết"
                      >
                        <ArrowRight size={13} className="text-slate-500" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {allProcessedLeads.length > 6 && (
            <div className="px-6 py-3 border-t border-slate-100 text-center">
              <button
                onClick={() => navigate("/admin/leads")}
                className="text-[#0055A5] text-xs font-bold hover:underline flex items-center gap-1 mx-auto"
              >
                Xem tất cả {allProcessedLeads.length} leads <ArrowRight size={12} />
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Right Column: Donut + Activity ── */}
        <div className="xl:col-span-5 flex flex-col gap-5">

          {/* Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="bg-white rounded-3xl border border-slate-200/60 shadow-xs p-6 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} className="text-[#E4002B]" />
              <div className="text-slate-800 font-extrabold text-base">Gói Cước Ưa Chuộng</div>
            </div>
            <div className="text-slate-400 text-xs font-semibold mb-5">Tỷ lệ quan tâm từ phễu RAG</div>
            <DonutChart slices={donutSlices} total={totalLeads} />
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl border border-slate-200/60 shadow-xs p-6 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-slate-800 font-extrabold text-base flex items-center gap-2">
                  <Activity size={15} className="text-[#0055A5]" />
                  Hoạt Động Gần Đây
                </div>
                <div className="text-slate-400 text-xs font-semibold mt-0.5">Thời gian thực</div>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0055A5] animate-pulse" />
                <span className="text-[#0055A5] text-[10px] font-bold">Live</span>
              </div>
            </div>
            <ActivityFeed events={activityEvents} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
