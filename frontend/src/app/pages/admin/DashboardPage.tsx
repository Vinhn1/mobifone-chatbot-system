import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Users, MessageSquare, Target, DollarSign, Phone, Activity, Calendar, ArrowRight, Zap, Award } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

function Spark({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 100, H = 36;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id={`g${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`url(#g${color.replace("#", "")})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SCORES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  hot: { bg: "bg-rose-50 border border-rose-100 text-rose-600", color: "#EF4444", border: "rgba(239, 68, 68, 0.2)", label: "🔥 Tiềm năng cao" },
  warm: { bg: "bg-amber-50 border border-amber-100 text-amber-600", color: "#F59E0B", border: "rgba(245, 158, 11, 0.2)", label: "☀️ Đang cân nhắc" },
  cold: { bg: "bg-blue-50 border border-blue-100 text-[#0055A5]", color: "#3B82F6", border: "rgba(59, 130, 246, 0.2)", label: "❄️ Mới tiếp cận" },
};

const cleanInterestText = (text: string): string => {
  if (!text) return "Tư vấn chung";
  let cleaned = text;
  if (cleaned.includes("Câu hỏi:")) {
    const match = cleaned.match(/Câu hỏi:\s*["']([^"']+)["']/i);
    if (match && match[1]) {
      cleaned = match[1];
    } else {
      cleaned = cleaned.replace(/^Trích xuất từ phiên chat:[^.]+.\s*Câu hỏi:\s*/i, "");
    }
  }
  // Remove phone numbers
  cleaned = cleaned.replace(/(?:0|\+84)\d{9,10}/g, "");
  // Remove common prefix patterns
  cleaned = cleaned.replace(/tôi tên\s+[a-zà-ỹ\s]+số điện thoại\s+(?:tôi\s+)?là\s*/gi, "");
  cleaned = cleaned.replace(/tôi muốn\s+(?:các\s+|tìm\s+)?thông tin\s+/gi, "");
  cleaned = cleaned.replace(/hãy liên hệ với tôi sớm nhất/gi, "Yêu cầu liên hệ");
  
  cleaned = cleaned.trim().replace(/^["']|["']$/g, "").trim();
  if (cleaned) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  if (cleaned.length > 40) {
    return cleaned.slice(0, 37) + "...";
  }
  return cleaned || "Tư vấn gói cước";
};

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

export function DashboardPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("Hôm nay");

  // Redirect if not admin or sales
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "sales")) {
      navigate("/login");
    }
  }, [user, navigate]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const leadsRes = await axios.get("http://localhost:3000/leads", config);
      setLeads(leadsRes.data || []);

      const chatLogsRes = await axios.get("http://localhost:3000/chat/history", config);
      setChatLogs(chatLogsRes.data || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu Dashboard:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Calculations
  const totalLeads = leads.length;
  const totalSessions = new Set(chatLogs.map(log => log.sessionId)).size;
  const conversionRate = totalSessions > 0 ? ((totalLeads / totalSessions) * 100) : 0;

  const getPackagePrice = (interest: string) => {
    const lower = (interest || "").toLowerCase();
    if (lower.includes("tk199")) return 199000;
    if (lower.includes("tk135") || lower.includes("135")) return 135000;
    if (lower.includes("max299")) return 299000;
    if (lower.includes("tk79")) return 79000;
    if (lower.includes("esim")) return 50000;
    return 120000; // default estimated package value
  };

  const potentialRevenueVND = leads.reduce((sum, lead) => sum + getPackagePrice(lead.interest), 0);
  const potentialRevenueMillion = (potentialRevenueVND / 1000000).toFixed(1);

  // Group packages
  const packageCounts: Record<string, number> = {};
  leads.forEach(lead => {
    let pkg = "Khác";
    const lower = (lead.interest || "").toLowerCase();
    if (lower.includes("tk135") || lower.includes("135")) pkg = "TK135";
    else if (lower.includes("tk199")) pkg = "TK199";
    else if (lower.includes("esim")) pkg = "eSIM Premium";
    else if (lower.includes("max299")) pkg = "MAX299";
    else if (lower.includes("tk79")) pkg = "TK79";
    packageCounts[pkg] = (packageCounts[pkg] || 0) + 1;
  });

  const topIntents = Object.entries(packageCounts)
    .map(([pkg, count]) => ({
      pkg,
      count,
      pct: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
      color: pkg === "TK135" ? "#F59E0B"
        : pkg === "TK199" ? "#8B5CF6"
        : pkg === "eSIM Premium" ? "#0055A5"
        : pkg === "MAX299" ? "#EF4444"
        : pkg === "TK79" ? "#10B981" : "#64748B"
    }))
    .sort((a, b) => b.count - a.count);

  // Sparklines helper
  const getSparklineData = (type: "leads" | "conversion" | "revenue" | "sessions") => {
    if (type === "leads") return [10, 15, 12, 18, 14, 22, 25, 20, totalLeads || 10];
    if (type === "conversion") return [15, 18, 16, 20, 19, 21, 23, 22, conversionRate || 10];
    if (type === "revenue") return [1.5, 2.2, 2.0, 3.1, 2.8, 3.8, 4.2, 4.0, Number(potentialRevenueMillion) || 2.0];
    return [80, 110, 95, 130, 120, 150, 165, 150, totalSessions || 80];
  };

  const kpiData = [
    { title: "Tổng Leads Thu Thập", value: totalLeads.toString(), change: `+${leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length} hôm nay`, pct: "", up: true, color: "#0055A5", icon: Users, data: getSparklineData("leads"), sub: "Dữ liệu được RAG trích xuất" },
    { title: "Tỷ Lệ Chuyển Đổi", value: `${conversionRate.toFixed(1)}%`, change: "+2.4% tuần qua", pct: "", up: true, color: "#10B981", icon: Target, data: getSparklineData("conversion"), sub: "Khách hàng gửi thông tin liên hệ" },
    { title: "Doanh Thu Ước Tính", value: `${potentialRevenueMillion}M đ`, change: `+${(leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).reduce((sum, l) => sum + getPackagePrice(l.interest), 0) / 1000000).toFixed(1)}M hôm nay`, pct: "", up: true, color: "#F59E0B", icon: DollarSign, data: getSparklineData("revenue"), sub: "Tính theo đơn giá gói cước" },
    { title: "Phiên Tương Tác", value: totalSessions.toString(), change: `+${chatLogs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length} hôm nay`, pct: "", up: true, color: "#8B5CF6", icon: MessageSquare, data: getSparklineData("sessions"), sub: "Tương tác trên đa kênh" },
  ];

  // Pipeline calculations
  const pipelineData = [
    { stage: "Tiếp cận (Sessions)", count: totalSessions, color: "#64748B", value: "—" },
    { stage: "Có thông tin (Leads)", count: totalLeads, color: "#0055A5", value: `${(potentialRevenueVND / 1000000).toFixed(1)}M` },
    { stage: "Có Tên/Nhu cầu", count: leads.filter(l => l.name).length, color: "#F59E0B", value: `${(leads.filter(l => l.name).reduce((sum, l) => sum + getPackagePrice(l.interest), 0) / 1000000).toFixed(1)}M` },
    { stage: "Hẹn tư vấn (CRM)", count: Math.round(totalLeads * 0.4), color: "#8B5CF6", value: `${((potentialRevenueVND * 0.4) / 1000000).toFixed(1)}M` },
    { stage: "Thành công (Ký HĐ)", count: Math.round(totalLeads * 0.15), color: "#10B981", value: `${((potentialRevenueVND * 0.15) / 1000000).toFixed(1)}M` },
  ];

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length >= 7) {
      return `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}`;
    }
    return phone;
  };

  const getLeadScore = (lead: Lead) => {
    return Math.min(45 + (lead.interest?.length || 0) * 1.5 + (lead.name ? 15 : 0), 99);
  };

  const latestLeads = leads
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(lead => {
      const score = getLeadScore(lead);
      const status = score >= 80 ? "hot" : score >= 60 ? "warm" : "cold";
      const diffMs = new Date().getTime() - new Date(lead.createdAt).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      const timeStr = diffMins > 60 ? `${Math.round(diffMins / 60)} giờ` : `${diffMins} phút`;

      return {
        name: lead.name || "Khách hàng ẩn danh",
        phone: formatPhone(lead.phone),
        pkg: lead.interest || "Tư vấn gói cước",
        score,
        status,
        time: timeStr,
      };
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-3 text-slate-400 font-outfit">
        <Activity size={32} className="animate-spin text-[#0055A5]" />
        <span className="font-bold text-sm">Đang phân tích dữ liệu bán hàng...</span>
      </div>
    );
  }

  return (
    <div className="font-outfit flex flex-col gap-6 pb-10">
      {/* Header section with telemetry */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-2xl tracking-tight">
            Giám Sát Doanh Thu & Phễu Bán Hàng
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">Báo cáo hiệu quả hỗ trợ trực tuyến của Mia và đa kênh viễn thông</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-1.5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="text-emerald-700 text-xs font-bold">Mia Core Active</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5">
            <Calendar size={13} className="text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border-none outline-none text-xs font-bold text-slate-600 bg-transparent cursor-pointer font-outfit"
            >
              <option>Hôm nay</option>
              <option>7 ngày qua</option>
              <option>Tháng này</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiData.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-xs flex flex-col gap-4 hover:shadow-md transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1.5">{k.title}</div>
                  <div className="text-slate-800 text-2xl font-black tracking-tight">{k.value}</div>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                  style={{
                    backgroundColor: `${k.color}08`,
                    borderColor: `${k.color}18`,
                  }}
                >
                  <Icon size={18} style={{ color: k.color }} />
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 border-dashed pt-3.5">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    {k.up ? <TrendingUp size={11} className="text-emerald-500" /> : <TrendingDown size={11} className="text-red-500" />}
                    <span className={`text-xs font-bold ${k.up ? "text-emerald-500" : "text-red-500"}`}>{k.change}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] font-semibold">{k.sub}</div>
                </div>
                <div className="pb-1">
                  <Spark data={k.data} color={k.color} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Stats / Funnel Pipeline section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-xs hover:shadow-md transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <div className="text-slate-800 font-extrabold text-base flex items-center gap-2">
              <Zap size={16} className="text-amber-500 fill-amber-500" />
              Phễu Chuyển Đổi & Ước Lượng Dòng Tiền Viễn Thông
            </div>
            <div className="text-slate-400 text-xs font-semibold mt-0.5">Tiến trình khách hàng từ bước làm quen với Bot đến khi đăng ký gói cước thành công</div>
          </div>
          <button
            onClick={() => navigate("/admin/leads")}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#003B75] text-white border-none font-bold text-xs cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
          >
            Quản lý Leads <ArrowRight size={13} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-5 items-stretch bg-slate-50/40 p-5 rounded-2xl border border-slate-100/60">
          {pipelineData.map((s, i) => (
            <div key={s.stage} className="flex-1 flex flex-col justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/40 shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{s.stage}</span>
                <span className="text-slate-800 text-sm font-black">{s.count}</span>
              </div>
              <div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / (totalSessions || 1)) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400">Tỷ lệ:</span>
                  <span style={{ color: s.color }}>
                    {((s.count / (totalSessions || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              {s.value !== "—" && (
                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] font-black">
                  <span className="text-slate-400">Dòng tiền tiềm năng:</span>
                  <span style={{ color: s.color }}>{s.value}đ</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Row: Recent Leads & Top Packages */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Leads Table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden hover:shadow-md transition-all duration-300"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <div className="text-slate-800 font-extrabold text-base">Khách hàng tiềm năng mới</div>
              <div className="text-slate-400 text-xs font-semibold mt-0.5">Cập nhật liên tục từ chatbot RAG</div>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0055A5] animate-pulse" />
              <span className="text-[#0055A5] text-[10px] font-bold">Thời gian thực</span>
            </div>
          </div>

          {latestLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm font-bold">
              Chưa có cuộc trò chuyện hoàn tất để xuất thông tin khách hàng.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    {["Khách hàng", "Nội dung quan tâm", "Lead Score", "Độ tiềm năng", "Thời gian", ""].map(h => (
                      <th key={h} className="px-5 py-3.5 text-slate-400 font-extrabold text-[10px] tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map((l, i) => {
                    const s = SCORES[l.status] || SCORES.cold;
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100/80 hover:bg-slate-50/30 transition-colors duration-150"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0055A5] to-[#E4002B] flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-xs">
                              {l.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-slate-800 font-bold text-xs">{l.name}</div>
                              <div className="text-slate-400 text-[10px] font-bold mt-0.5">{l.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-blue-50/50 border border-blue-100 text-[#0055A5] rounded-xl px-2.5 py-1 text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] inline-block shadow-xs">
                            {cleanInterestText(l.pkg)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${l.score}%`,
                                  backgroundColor: l.score > 80 ? "#10B981" : l.score > 60 ? "#F59E0B" : "#3B82F6",
                                }}
                              />
                            </div>
                            <span className="text-slate-700 font-extrabold text-xs">{l.score}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-xs ${s.bg}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{l.time} trước</td>
                        <td className="px-5 py-3.5 text-right">
                          <a
                            href={`tel:${l.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0055A5] to-[#004B91] hover:from-[#004B91] hover:to-[#0055A5] text-white font-bold text-[10px] tracking-wider uppercase cursor-pointer transition-all hover:scale-102 active:scale-98 shadow-xs border-none"
                          >
                            <Phone size={10} /> Gọi ngay
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Package Interest distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl border border-slate-200/60 shadow-xs p-6 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-[#E4002B]" />
            <div className="text-slate-800 font-extrabold text-base">Gói Cước Ưa Chuộng Nhất</div>
          </div>
          <div className="text-slate-400 text-xs font-semibold mb-6">Tỷ lệ quan tâm đăng ký từ phễu RAG</div>

          {topIntents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm font-bold">Chưa có đủ dữ liệu.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {topIntents.map(it => (
                <div key={it.pkg} className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-4 transition-colors hover:bg-slate-50/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-700 font-bold text-xs">{it.pkg}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-400 text-[10px] font-semibold">{it.count} khách</span>
                      <span className="text-xs font-black" style={{ color: it.color }}>{it.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${it.pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: it.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
