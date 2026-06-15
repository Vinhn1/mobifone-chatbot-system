import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Phone, MessageSquare, X, Check, Clock, TrendingUp, User, Package, Activity } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

type Stage = "new" | "contacted" | "interested" | "demo" | "converted" | "lost";
type Temp = "hot" | "warm" | "cold";

type Lead = {
  id: number;
  name: string;
  phone: string;
  interest: string;
  stage: Stage;
  temp: Temp;
  score: number;
  notes: string;
  createdAt: string;
  messages: number;
};

const STAGES: { key: Stage; label: string; color: string; bg: string; border: string }[] = [
  { key: "new", label: "Mới nhận", color: "#64748B", bg: "rgba(100, 116, 139, 0.08)", border: "rgba(100, 116, 139, 0.2)" },
  { key: "contacted", label: "Đã liên hệ", color: "#0055A5", bg: "rgba(0, 85, 165, 0.08)", border: "rgba(0, 85, 165, 0.2)" },
  { key: "interested", label: "Quan tâm", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)" },
  { key: "demo", label: "Demo/Tư vấn", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)", border: "rgba(139, 92, 246, 0.2)" },
  { key: "converted", label: "Đã ký HĐ", color: "#10B981", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)" },
  { key: "lost", label: "Thất bại", color: "#EF4444", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)" },
];

const TEMP_STYLE: Record<Temp, { icon: string; color: string; bg: string; border: string }> = {
  hot: { icon: "🔥", color: "#EF4444", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)" },
  warm: { icon: "☀", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)" },
  cold: { icon: "❄", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.2)" },
};

// Map backend DB status to frontend Stage
const mapStatusToStage = (status: string): Stage => {
  switch (status) {
    case "Chưa liên hệ": return "new";
    case "Đã liên hệ": return "contacted";
    case "Quan tâm": return "interested";
    case "Demo/Tư vấn": return "demo";
    case "Đã ký HĐ": return "converted";
    case "Thất bại": return "lost";
    default:
      if (["new", "contacted", "interested", "demo", "converted", "lost"].includes(status)) {
        return status as Stage;
      }
      return "new";
  }
};

const mapStageToStatus = (stage: Stage): string => {
  switch (stage) {
    case "new": return "Chưa liên hệ";
    case "contacted": return "Đã liên hệ";
    case "interested": return "Quan tâm";
    case "demo": return "Demo/Tư vấn";
    case "converted": return "Đã ký HĐ";
    case "lost": return "Thất bại";
    default: return "Chưa liên hệ";
  }
};

function LeadDetail({ lead, onClose, onUpdateStatus }: { lead: Lead; onClose: () => void; onUpdateStatus: (id: number, stage: Stage) => void }) {
  const stage = STAGES.find(s => s.key === lead.stage) || STAGES[0];
  const temp = TEMP_STYLE[lead.temp] || TEMP_STYLE.cold;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="admin-card"
      style={{
        width: 380,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        flexShrink: 0,
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0055A5, #E4002B)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 900, boxShadow: "0 4px 14px rgba(0, 85, 165, 0.2)" }}>
            {lead.name.charAt(0)}
          </div>
          <div>
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 16 }}>{lead.name}</div>
            <div style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{lead.phone}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#E2E8F0"} onMouseLeave={e => e.currentTarget.style.background = "#F1F5F9"}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ background: temp.bg, color: temp.color, border: `1px solid ${temp.border}`, borderRadius: 10, padding: "4px 12px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
          {temp.icon} {lead.temp.toUpperCase()}
        </span>
        <span style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}`, borderRadius: 10, padding: "4px 12px", fontSize: 11, fontWeight: 800 }}>
          {stage.label.toUpperCase()}
        </span>
      </div>

      {/* Score */}
      <div style={{ background: "rgba(248, 250, 252, 0.6)", borderRadius: 16, padding: 16, border: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: "#64748B", fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>LEAD SCORE</span>
          <span style={{ color: lead.score > 80 ? "#10B981" : lead.score > 60 ? "#F59E0B" : "#3B82F6", fontWeight: 900, fontSize: 22 }}>{lead.score}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#E2E8F0", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${lead.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 4, background: lead.score > 80 ? "#10B981" : lead.score > 60 ? "#F59E0B" : "#3B82F6" }}
          />
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { icon: User, label: "Tên khách hàng", value: lead.name },
          { icon: Package, label: "Quan tâm đến", value: lead.interest },
          { icon: Phone, label: "Số điện thoại", value: lead.phone },
          { icon: MessageSquare, label: "Số tin nhắn", value: `${lead.messages} tin` },
          { icon: Clock, label: "Ngày tạo", value: new Date(lead.createdAt).toLocaleDateString("vi-VN") },
          { icon: Activity, label: "Phụ trách", value: "Mia AI Chatbot" },
        ].map(row => {
          const Icon = row.icon;
          return (
            <div key={row.label} style={{ background: "rgba(248, 250, 252, 0.4)", borderRadius: 12, padding: "12px 14px", border: "1px solid #F1F5F9" }}>
              <div style={{ color: "#94A3B8", fontSize: 9, fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon size={11} style={{ color: "#94A3B8" }} />{row.label.toUpperCase()}
              </div>
              <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{row.value}</div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, marginBottom: 8 }}>GHI CHÚ CHI TIẾT</div>
        <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: 12, padding: 14, color: "#92400E", fontSize: 13, lineHeight: 1.6 }}>
          Khách hàng để lại thông tin quan tâm gói cước "{lead.interest}" từ hội thoại chatbot Mia. Hệ thống CRM tự động lưu trữ và phân tích.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <a
          href={`tel:${lead.phone}`}
          className="gradient-btn-primary"
          style={{ flex: 1, display: "flex", textDecoration: "none", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: 13, boxShadow: "0 4px 14px rgba(0, 85, 165, 0.25)" }}
        >
          <Phone size={14} /> Gọi Ngay
        </a>
      </div>

      {/* Stage update */}
      <div>
        <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, marginBottom: 8 }}>CẬP NHẬT TRẠNG THÁI</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STAGES.map(s => (
            <button
              key={s.key}
              onClick={() => onUpdateStatus(lead.id, s.key)}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                border: `1.5px solid ${lead.stage === s.key ? s.color : "#E2E8F0"}`,
                background: lead.stage === s.key ? s.bg : "white",
                color: lead.stage === s.key ? s.color : "#64748B",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Outfit', sans-serif",
                transition: "all 0.2s"
              }}
            >
              {lead.stage === s.key && <Check size={10} style={{ display: "inline", marginRight: 4 }} />}
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function LeadsPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [tempFilter, setTempFilter] = useState<Temp | "all">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get("http://localhost:3000/leads", config);
      const apiLeads = response.data || [];

      // Format backend leads to match the UI model
      const formatted: Lead[] = apiLeads.map((item: any) => {
        const interestStr = item.interest || "Tư vấn gói cước";
        const score = Math.min(45 + (interestStr.length) * 1.5 + (item.name ? 15 : 0), 99);
        const temp: Temp = score >= 80 ? "hot" : score >= 60 ? "warm" : "cold";
        const stage = mapStatusToStage(item.status);

        return {
          id: item.id,
          name: item.name || "Khách hàng ẩn danh",
          phone: item.phone,
          interest: interestStr,
          stage,
          temp,
          score,
          notes: `Khách hàng để lại thông tin quan tâm gói ${interestStr}`,
          createdAt: item.createdAt,
          messages: interestStr.length > 10 ? 8 : 4,
        };
      });

      setLeads(formatted);

      if (selectedLead) {
        const found = formatted.find(l => l.id === selectedLead.id);
        if (found) setSelectedLead(found);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách leads:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStage: Stage) => {
    if (!token) return;
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const newStatus = mapStageToStatus(newStage);
      await axios.patch(`http://localhost:3000/leads/${id}/status`, { status: newStatus }, config);
      
      setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(prev => prev ? { ...prev, stage: newStage } : null);
      }
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái lead:", error);
      alert("Không thể cập nhật trạng thái lead. Vui lòng thử lại!");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [token]);

  const filtered = leads.filter(l =>
    (stageFilter === "all" || l.stage === stageFilter) &&
    (tempFilter === "all" || l.temp === tempFilter) &&
    (l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search) || l.interest.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 12, color: "#64748B" }}>
        <Activity size={32} style={{ animation: "spin 2s linear infinite", color: "#0055A5" }} />
        <span style={{ fontWeight: 600 }}>Đang tải danh sách Leads...</span>
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
    <div style={{ fontFamily: "'Outfit', sans-serif", height: "100%", display: "flex", flexDirection: "column", gap: 20, paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 24, margin: 0 }}>Quản lý Khách hàng (Leads)</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0 0" }}>Danh sách khách hàng tiềm năng thu được tự động từ hệ thống RAG Chatbot</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 14px", height: 40 }}>
            <Search size={14} style={{ color: "#94A3B8" }} />
            <input placeholder="Tìm theo tên, SĐT, gói cước..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#334155", width: 200, fontFamily: "'Outfit', sans-serif" }} />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value as Stage | "all")}
            style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 12px", height: 40, fontSize: 13, fontWeight: 600, color: "#334155", background: "white", cursor: "pointer", fontFamily: "'Outfit', sans-serif", outline: "none" }}>
            <option value="all">Tất cả giai đoạn</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={tempFilter} onChange={e => setTempFilter(e.target.value as Temp | "all")}
            style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 12px", height: 40, fontSize: 13, fontWeight: 600, color: "#334155", background: "white", cursor: "pointer", fontFamily: "'Outfit', sans-serif", outline: "none" }}>
            <option value="all">Tất cả nhiệt độ</option>
            <option value="hot">🔥 Hot (Nóng)</option>
            <option value="warm">☀ Warm (Ấm)</option>
            <option value="cold">❄ Cold (Lạnh)</option>
          </select>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        {[
          { label: "Tổng Leads nhận", value: leads.length, color: "#0055A5" },
          ...STAGES.slice(0, 4).map(s => ({ label: s.label, value: leads.filter(l => l.stage === s.key).length, color: s.color }))
        ].map((s, i) => (
          <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: `1px solid #F1F5F9`, borderLeft: `3.5px solid ${s.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ color: s.color, fontSize: "1.6rem", fontWeight: 900 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table + detail panel */}
      <div style={{ display: "flex", gap: 16, flex: 1, overflow: "hidden" }}>
        {/* Table Container */}
        <div className="admin-card" style={{ flex: 1, overflow: "auto", background: "white" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#64748B" }}>
              Không tìm thấy lead nào phù hợp với bộ lọc.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 750 }}>
              <thead style={{ position: "sticky", top: 0, background: "#F8FAFC", zIndex: 5 }}>
                <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                  {["Khách hàng", "Gói quan tâm", "Số tin nhắn", "Lead Score", "Nhiệt độ", "Giai đoạn", "Ngày tạo", ""].map(h => (
                    <th key={h} style={{ padding: "14px 18px", textAlign: "left", color: "#64748B", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((lead) => {
                    const stage = STAGES.find(s => s.key === lead.stage) || STAGES[0];
                    const temp = TEMP_STYLE[lead.temp] || TEMP_STYLE.cold;
                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                        style={{ borderBottom: "1px solid #F8FAFC", cursor: "pointer", background: selectedLead?.id === lead.id ? "rgba(0, 85, 165, 0.03)" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={e => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLTableRowElement).style.background = "#FAFAFA"; }}
                        onMouseLeave={e => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0055A5, #00B4FF)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13 }}>{lead.name}</div>
                              <div style={{ color: "#94A3B8", fontSize: 11 }}>{lead.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: "rgba(0, 85, 165, 0.05)", color: "#0055A5", border: "1px solid rgba(0, 85, 165, 0.15)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                            {lead.interest}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#64748B", fontSize: 13 }}>{lead.messages} tin</td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E2E8F0", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${lead.score}%`, background: lead.score > 80 ? "#10B981" : lead.score > 60 ? "#F59E0B" : "#3B82F6", borderRadius: 3 }} />
                            </div>
                            <span style={{ color: "#1E293B", fontSize: 12, fontWeight: 700 }}>{lead.score}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: temp.bg, color: temp.color, border: `1px solid ${temp.border}`, borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 800 }}>
                            {temp.icon} {lead.temp.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}`, borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 800 }}>
                            {stage.label.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#64748B", fontSize: 12 }}>
                          {new Date(lead.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="gradient-btn-primary"
                            style={{ textDecoration: "none", padding: "6px 12px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, boxShadow: "0 3px 8px rgba(0, 85, 165, 0.15)" }}
                          >
                            <Phone size={11} /> Gọi
                          </a>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedLead && <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdateStatus={handleUpdateStatus} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
