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
    <svg width={W} height={H} style={{ overflow: "visible" }}>
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
  hot: { bg: "rgba(239, 68, 68, 0.08)", color: "#EF4444", border: "rgba(239, 68, 68, 0.2)", label: "🔥 NÓNG HỔI" },
  warm: { bg: "rgba(245, 158, 11, 0.08)", color: "#F59E0B", border: "rgba(245, 158, 11, 0.2)", label: "☀ ẤM ÁP" },
  cold: { bg: "rgba(59, 130, 246, 0.08)", color: "#3B82F6", border: "rgba(59, 130, 246, 0.2)", label: "❄ LẠNH LẼO" },
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

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
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
        : pkg === "TK199" ? "#A855F7"
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

  // Latest 5 leads formatted
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 12, color: "#64748B" }}>
        <Activity size={32} style={{ animation: "spin 2s linear infinite", color: "#0055A5" }} />
        <span style={{ fontWeight: 600 }}>Đang phân tích dữ liệu bán hàng...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Header section with telemetry */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            Giám Sát Doanh Thu & Phễu Bán Hàng
          </h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0 0" }}>Báo cáo hiệu quả tư vấn tự động của Trợ lý ảo Mia AI và đa kênh viễn thông</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 10, padding: "8px 14px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981", display: "inline-block", animation: "pulse 2.5s infinite" }} />
            <span style={{ color: "#065F46", fontSize: 12, fontWeight: 700 }}>Mia AI Core Active</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F1F5F9", borderRadius: 10, padding: "6px 12px", border: "1px solid #E2E8F0" }}>
            <Calendar size={14} style={{ color: "#64748B" }} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 12, fontWeight: 700, color: "#334155", background: "transparent", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}
            >
              <option>Hôm nay</option>
              <option>7 ngày qua</option>
              <option>Tháng này</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
        {kpiData.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 100 }}
              className="admin-card"
              style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>{k.title.toUpperCase()}</div>
                  <div style={{ color: "#0F172A", fontSize: "2.1rem", fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 }}>{k.value}</div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}10`, border: `1px solid ${k.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} style={{ color: k.color }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px dashed #F1F5F9", paddingTop: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    {k.up ? <TrendingUp size={12} style={{ color: "#10B981" }} /> : <TrendingDown size={12} style={{ color: "#EF4444" }} />}
                    <span style={{ color: k.up ? "#10B981" : "#EF4444", fontSize: 12, fontWeight: 700 }}>{k.change}</span>
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: 11 }}>{k.sub}</div>
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <Spark data={k.data} color={k.color} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Stats / Funnel Pipeline section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="admin-card"
        style={{ padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={16} style={{ color: "#F59E0B" }} />
              Phễu Chuyển Đổi & Ước Lượng Dòng Tiền Viễn Thông
            </div>
            <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>Tiến trình khách hàng từ bước làm quen với Bot đến khi đăng ký gói cước thành công</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/admin/leads")}
            className="gradient-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 12 }}
          >
            Quản lý Leads <ArrowRight size={13} />
          </motion.button>
        </div>
        
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", background: "rgba(248, 250, 252, 0.5)", padding: "24px 20px", borderRadius: 20, border: "1px solid #F1F5F9" }}>
          {pipelineData.map((s, i) => (
            <div key={s.stage} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ color: "#0F172A", fontSize: 15, fontWeight: 900 }}>{s.count}</span>
                <span style={{ color: "#64748B", fontSize: 10, fontWeight: 600 }}>tương tác</span>
              </div>
              <div style={{ position: "relative", width: "100%" }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 50 + Math.min(s.count * 1.8, 140) }}
                  transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
                  style={{
                    borderRadius: "10px 10px 6px 6px",
                    background: `linear-gradient(180deg, ${s.color}, ${s.color}88)`,
                    width: "100%",
                    boxShadow: `0 4px 14px ${s.color}20`,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: 10
                  }}
                >
                  <span style={{ color: "white", fontSize: 10, fontWeight: 800, opacity: 0.9 }}>{(s.count / (totalSessions || 1) * 100).toFixed(0)}%</span>
                </motion.div>
              </div>
              <div style={{ textAlign: "center", minHeight: 32 }}>
                <div style={{ color: "#334155", fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{s.stage}</div>
                {s.value !== "—" && <div style={{ color: s.color, fontSize: 11, fontWeight: 800, marginTop: 2 }}>{s.value}đ</div>}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Row: Recent Leads & Top Packages */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        {/* Leads Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="admin-card"
          style={{ overflow: "hidden" }}
        >
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15 }}>Khách hàng tiềm năng mới</div>
              <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>Cập nhật liên tục từ chatbot RAG</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0, 85, 165, 0.08)", border: "1px solid rgba(0, 85, 165, 0.15)", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0055A5", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#0055A5", fontSize: 11, fontWeight: 700 }}>Real-time</span>
            </div>
          </div>
          
          {latestLeads.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              Chưa có cuộc trò chuyện hoàn tất để xuất thông tin khách hàng.
            </div>
          ) : (
            <div className="custom-scrollbar" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                    {["Khách hàng", "Gói cước quan tâm", "Lead Score", "Phân loại", "Thời gian", ""].map(h => (
                      <th key={h} style={{ padding: "12px 20px", color: "#64748B", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map((l, i) => {
                    const s = SCORES[l.status] || SCORES.cold;
                    return (
                      <tr
                        key={i}
                        style={{ borderBottom: "1px solid #F8FAFC", transition: "background 0.2s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(0, 85, 165, 0.01)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                      >
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, #0055A5, #E4002B)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                              {l.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13 }}>{l.name}</div>
                              <div style={{ color: "#64748B", fontSize: 11 }}>{l.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ background: "rgba(0, 85, 165, 0.05)", color: "#0055A5", border: "1px solid rgba(0, 85, 165, 0.15)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                            {l.pkg}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E2E8F0", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${l.score}%`, background: l.score > 80 ? "#10B981" : l.score > 60 ? "#F59E0B" : "#3B82F6", borderRadius: 3 }} />
                            </div>
                            <span style={{ color: "#1E293B", fontSize: 12, fontWeight: 700 }}>{l.score}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px", color: "#94A3B8", fontSize: 12 }}>{l.time} trước</td>
                        <td style={{ padding: "14px 20px" }}>
                          <a
                            href={`tel:${l.phone}`}
                            style={{
                              display: "inline-flex",
                              textDecoration: "none",
                              alignItems: "center",
                              gap: 4,
                              background: "linear-gradient(135deg, #0055A5, #0077D5)",
                              borderRadius: 8,
                              padding: "6px 12px",
                              color: "white",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "'Outfit', sans-serif",
                              boxShadow: "0 4px 12px rgba(0, 85, 165, 0.2)"
                            }}
                          >
                            <Phone size={11} /> Gọi
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="admin-card"
          style={{ padding: 22 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Award size={16} style={{ color: "#E4002B" }} />
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 14 }}>Gói Cước Ưa Chuộng Nhất</div>
          </div>
          <div style={{ color: "#94A3B8", fontSize: 12, marginBottom: 20 }}>Tỷ lệ quan tâm đăng ký từ phễu RAG</div>
          
          {topIntents.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#64748B" }}>Chưa có đủ dữ liệu.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topIntents.map(it => (
                <div key={it.pkg} style={{ background: "rgba(248, 250, 252, 0.5)", border: "1px solid #F1F5F9", borderRadius: 14, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#1E293B", fontSize: 13, fontWeight: 700 }}>{it.pkg}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: "#64748B", fontSize: 12 }}>{it.count} khách</span>
                      <span style={{ color: it.color, fontSize: 12, fontWeight: 800 }}>{it.pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#E2E8F0", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${it.pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                      style={{ height: "100%", borderRadius: 3, background: it.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}

