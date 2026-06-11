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

const STAGES: { key: Stage; label: string; color: string; bg: string }[] = [
  { key: "new", label: "Mới", color: "#64748B", bg: "#F8FAFC" },
  { key: "contacted", label: "Đã liên hệ", color: "#0055A5", bg: "#EFF6FF" },
  { key: "interested", label: "Quan tâm", color: "#F59E0B", bg: "#FEF3C7" },
  { key: "demo", label: "Demo/Tư vấn", color: "#A855F7", bg: "#F3E8FF" },
  { key: "converted", label: "Đã ký HĐ", color: "#22C55E", bg: "#DCFCE7" },
  { key: "lost", label: "Thất bại", color: "#EF4444", bg: "#FEE2E2" },
];

const TEMP_STYLE: Record<Temp, { icon: string; color: string; bg: string }> = {
  hot: { icon: "🔥", color: "#DC2626", bg: "#FEE2E2" },
  warm: { icon: "☀", color: "#D97706", bg: "#FEF3C7" },
  cold: { icon: "❄", color: "#0055A5", bg: "#EFF6FF" },
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        width: 360, background: "white", borderRadius: 16,
        border: "1.5px solid #E2E8F0", padding: 20,
        display: "flex", flexDirection: "column", gap: 16,
        flexShrink: 0,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#0055A5,#F39C12)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 800 }}>
            {lead.name.charAt(0)}
          </div>
          <div>
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15 }}>{lead.name}</div>
            <div style={{ color: "#64748B", fontSize: 12 }}>{lead.phone}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ background: temp.bg, color: temp.color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{temp.icon} {lead.temp.toUpperCase()}</span>
        <span style={{ background: stage.bg, color: stage.color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{stage.label}</span>
      </div>

      {/* Score */}
      <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#64748B", fontSize: 12, fontWeight: 600 }}>LEAD SCORE</span>
          <span style={{ color: lead.score > 80 ? "#22C55E" : lead.score > 60 ? "#F59E0B" : "#94A3B8", fontWeight: 900, fontSize: 20 }}>{lead.score}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#E2E8F0", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${lead.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 4, background: lead.score > 80 ? "#22C55E" : lead.score > 60 ? "#F59E0B" : "#94A3B8" }}
          />
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { icon: User, label: "Tên khách hàng", value: lead.name },
          { icon: Package, label: "Quan tâm đến", value: lead.interest },
          { icon: TrendingUp, label: "Số điện thoại", value: lead.phone },
          { icon: MessageSquare, label: "Số tin nhắn", value: `${lead.messages} tin` },
          { icon: Clock, label: "Ngày tạo", value: new Date(lead.createdAt).toLocaleDateString("vi-VN") },
          { icon: User, label: "Phụ trách", value: "Mia AI Chatbot" },
        ].map(row => {
          const Icon = row.icon;
          return (
            <div key={row.label} style={{ background: "#FAFAFA", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 600, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon size={10} />{row.label.toUpperCase()}
              </div>
              <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{row.value}</div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <div style={{ color: "#64748B", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>GHI CHÚ CHI TIẾT</div>
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 12, color: "#92400E", fontSize: 13, lineHeight: 1.5 }}>
          Khách hàng để lại thông tin quan tâm gói cước "{lead.interest}" từ hội thoại chatbot Mia. Hệ thống CRM tự động lưu trữ và phân tích.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`tel:${lead.phone}`} style={{ flex: 1, display: "flex", textDecoration: "none", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0055A5,#00B4FF)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Outfit',sans-serif", boxShadow: "0 4px 14px rgba(0,85,165,0.3)" }}>
          <Phone size={14} /> Gọi ngay
        </a>
      </div>

      {/* Stage update */}
      <div>
        <div style={{ color: "#64748B", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>CẬP NHẬT TRẠNG THÁI</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {STAGES.map(s => (
            <button
              key={s.key}
              onClick={() => onUpdateStatus(lead.id, s.key)}
              style={{ padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${lead.stage === s.key ? s.color : "#E2E8F0"}`, background: lead.stage === s.key ? s.bg : "white", color: lead.stage === s.key ? s.color : "#64748B", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
            >
              {lead.stage === s.key && <Check size={9} style={{ display: "inline", marginRight: 3 }} />}{s.label}
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
        // Compute static score & temp based on interest length
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

      // Maintain selection if already selected
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
      
      // Update local state
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
    <div style={{ fontFamily: "'Outfit',sans-serif", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 22, marginBottom: 2 }}>Quản lý Leads</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>Khách hàng tiềm năng từ Mia AI Chatbot</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "6px 12px" }}>
            <Search size={13} style={{ color: "#94A3B8" }} />
            <input placeholder="Tìm theo tên, SĐT, gói cước..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#334155", width: 220, fontFamily: "'Outfit',sans-serif" }} />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value as Stage | "all")}
            style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "6px 12px", fontSize: 13, color: "#334155", background: "white", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            <option value="all">Tất cả giai đoạn</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={tempFilter} onChange={e => setTempFilter(e.target.value as Temp | "all")}
            style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "6px 12px", fontSize: 13, color: "#334155", background: "white", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            <option value="all">Tất cả nhiệt độ</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">☀ Warm</option>
            <option value="cold">❄ Cold</option>
          </select>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Tổng Leads", value: leads.length, color: "#0055A5" },
          ...STAGES.slice(0, 4).map(s => ({ label: s.label, value: leads.filter(l => l.stage === s.key).length, color: s.color }))
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: 10, padding: "10px 16px", border: `1.5px solid ${s.color}25`, borderLeft: `3px solid ${s.color}`, flex: 1, minWidth: 100 }}>
            <div style={{ color: s.color, fontSize: "1.3rem", fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: "#64748B", fontSize: 11, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table + detail panel */}
      <div style={{ display: "flex", gap: 14, flex: 1, overflow: "hidden" }}>
        {/* Table */}
        <div style={{ flex: 1, background: "white", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "auto", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
              Không tìm thấy lead nào phù hợp với bộ lọc.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead style={{ position: "sticky", top: 0, background: "#FAFAFA", zIndex: 5 }}>
                <tr>
                  {["Khách hàng", "Gói quan tâm", "Số tin nhắn", "Score", "Nhiệt độ", "Giai đoạn", "Ngày tạo", ""].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#64748B", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
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
                        style={{ borderTop: "1px solid #F8FAFC", cursor: "pointer", background: selectedLead?.id === lead.id ? "#EFF6FF" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={e => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLTableRowElement).style.background = "#FAFAFA"; }}
                        onMouseLeave={e => { if (selectedLead?.id !== lead.id) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#0055A5,#F39C12)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{lead.name.charAt(0)}</div>
                            <div>
                              <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13 }}>{lead.name}</div>
                              <div style={{ color: "#94A3B8", fontSize: 11 }}>{lead.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: "#EFF6FF", color: "#0055A5", border: "1px solid #BFDBFE", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{lead.interest}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748B", fontSize: 13 }}>{lead.messages} tin</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 32, height: 4, borderRadius: 2, background: "#F1F5F9", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${lead.score}%`, background: lead.score > 80 ? "#22C55E" : lead.score > 60 ? "#F59E0B" : "#94A3B8", borderRadius: 2 }} />
                            </div>
                            <span style={{ color: "#334155", fontSize: 12, fontWeight: 700 }}>{lead.score}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: temp.bg, color: temp.color, borderRadius: 7, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{temp.icon} {lead.temp.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: stage.bg, color: stage.color, borderRadius: 7, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{stage.label}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748B", fontSize: 12 }}>
                          {new Date(lead.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ textDecoration: "none", background: "#0055A5", border: "none", borderRadius: 7, padding: "4px 10px", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'Outfit',sans-serif" }}>
                            <Phone size={10} /> Gọi
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

        {/* Detail panel */}
        <AnimatePresence>
          {selectedLead && <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdateStatus={handleUpdateStatus} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
