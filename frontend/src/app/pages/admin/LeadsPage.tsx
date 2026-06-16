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

const STAGES: { key: Stage; label: string; badgeClass: string }[] = [
  { key: "new", label: "Mới nhận", badgeClass: "bg-slate-50 border border-slate-200 text-slate-500" },
  { key: "contacted", label: "Đã liên hệ", badgeClass: "bg-blue-50 border border-blue-100 text-[#0055A5]" },
  { key: "interested", label: "Quan tâm", badgeClass: "bg-amber-50 border border-amber-100 text-amber-600" },
  { key: "demo", label: "Demo/Tư vấn", badgeClass: "bg-purple-50 border border-purple-100 text-purple-600" },
  { key: "converted", label: "Đã ký HĐ", badgeClass: "bg-emerald-50 border border-emerald-100 text-emerald-600" },
  { key: "lost", label: "Thất bại", badgeClass: "bg-rose-50 border border-rose-100 text-rose-600" },
];

const TEMP_STYLE: Record<Temp, { icon: string; badgeClass: string }> = {
  hot: { icon: "🔥", badgeClass: "bg-rose-50 border border-rose-100 text-rose-600" },
  warm: { icon: "☀", badgeClass: "bg-amber-50 border border-amber-100 text-amber-600" },
  cold: { icon: "❄", badgeClass: "bg-blue-50 border border-blue-100 text-[#0055A5]" },
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
      className="w-[380px] p-6 flex flex-col gap-5 shrink-0 bg-white/85 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-900/5 overflow-y-auto"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0055A5] to-[#E4002B] flex items-center justify-center text-white text-lg font-black shadow-md shadow-blue-500/10">
            {lead.name.charAt(0)}
          </div>
          <div>
            <div className="text-slate-800 font-extrabold text-sm">{lead.name}</div>
            <div className="text-slate-400 text-xs font-semibold mt-0.5">{lead.phone}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex gap-2 font-extrabold text-[10px] uppercase tracking-wider">
        <span className={`px-3 py-1 rounded-lg ${temp.badgeClass}`}>
          {temp.icon} {lead.temp}
        </span>
        <span className={`px-3 py-1 rounded-lg ${stage.badgeClass}`}>
          {stage.label}
        </span>
      </div>

      {/* Score */}
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Lead Score</span>
          <span className={`font-black text-xl ${
            lead.score > 80 ? "text-emerald-500" : lead.score > 60 ? "text-amber-500" : "text-blue-500"
          }`}>
            {lead.score}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${lead.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              lead.score > 80 ? "bg-emerald-500" : lead.score > 60 ? "bg-amber-500" : "bg-blue-500"
            }`}
          />
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: User, label: "Tên khách hàng", value: lead.name },
          { icon: Package, label: "Quan tâm đến", value: lead.interest },
          { icon: Phone, label: "Số điện thoại", value: lead.phone },
          { icon: MessageSquare, label: "Số tin nhắn", value: `${lead.messages} tin` },
          { icon: Clock, label: "Ngày tạo", value: new Date(lead.createdAt).toLocaleDateString("vi-VN") },
          { icon: Activity, label: "Phụ trách", value: "Mia Support" },
        ].map(row => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="bg-slate-50/30 rounded-xl p-3 border border-slate-100/60">
              <div className="text-slate-400 text-[9px] font-black tracking-wider uppercase mb-1 flex items-center gap-1">
                <Icon size={11} className="text-slate-400" />{row.label}
              </div>
              <div className="text-slate-700 font-extrabold text-xs truncate">{row.value}</div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <div className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-2">Ghi chú chi tiết</div>
        <div className="bg-amber-500/[0.03] border border-amber-100 rounded-2xl p-3.5 text-amber-800 text-[11px] font-semibold leading-relaxed">
          Khách hàng để lại thông tin quan tâm gói cước "{lead.interest}" từ hội thoại chatbot Mia. Hệ thống CRM tự động lưu trữ và phân tích.
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <a
          href={`tel:${lead.phone}`}
          className="gradient-btn-primary flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-wider text-decoration-none shadow-md shadow-blue-500/15"
        >
          <Phone size={13} /> Gọi Ngay
        </a>
      </div>

      {/* Stage update */}
      <div>
        <div className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-2">Cập nhật trạng thái</div>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map(s => (
            <button
              key={s.key}
              onClick={() => onUpdateStatus(lead.id, s.key)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all duration-200 ${
                lead.stage === s.key
                  ? `${s.badgeClass} ring-1 ring-offset-0`
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {lead.stage === s.key && <Check size={10} className="inline mr-1" />}
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
      <div className="flex flex-col items-center justify-center h-[75vh] gap-3 text-slate-400 font-outfit">
        <Activity size={32} className="animate-spin text-[#0055A5]" />
        <span className="font-bold text-sm">Đang tải danh sách Leads...</span>
      </div>
    );
  }

  return (
    <div className="font-outfit h-[calc(100vh-130px)] flex flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-xl tracking-tight">Quản lý Khách hàng (Leads)</h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Danh sách khách hàng tiềm năng thu được tự động từ hệ thống RAG Chatbot</p>
        </div>
        <div className="flex gap-2.5 flex-wrap items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-4 h-10 flex-1 lg:flex-initial">
            <Search size={14} className="text-slate-400" />
            <input
              placeholder="Tìm theo tên, SĐT, gói cước..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="background-transparent border-none outline-none text-xs font-semibold text-slate-600 w-full lg:w-48 font-outfit"
            />
          </div>
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value as Stage | "all")}
            className="border border-slate-200 rounded-xl px-3 h-10 text-xs font-bold text-slate-600 bg-white cursor-pointer outline-none hover:border-slate-300 transition-colors"
          >
            <option value="all">Tất cả giai đoạn</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select
            value={tempFilter}
            onChange={e => setTempFilter(e.target.value as Temp | "all")}
            className="border border-slate-200 rounded-xl px-3 h-10 text-xs font-bold text-slate-600 bg-white cursor-pointer outline-none hover:border-slate-300 transition-colors"
          >
            <option value="all">Tất cả nhiệt độ</option>
            <option value="hot">🔥 Hot (Nóng)</option>
            <option value="warm">☀ Warm (Ấm)</option>
            <option value="cold">❄ Cold (Lạnh)</option>
          </select>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {[
          { label: "Tổng Leads nhận", value: leads.length, color: "border-[#0055A5] text-[#0055A5]" },
          ...STAGES.slice(0, 4).map(s => {
            const colorMapping: Record<Stage, string> = {
              new: "border-slate-400 text-slate-500",
              contacted: "border-[#0055A5] text-[#0055A5]",
              interested: "border-amber-400 text-amber-500",
              demo: "border-purple-400 text-purple-500",
              converted: "border-emerald-400 text-emerald-500",
              lost: "border-rose-400 text-rose-500"
            };
            return {
              label: s.label,
              value: leads.filter(l => l.stage === s.key).length,
              color: colorMapping[s.key]
            };
          })
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-4 border border-slate-100 border-l-[3.5px] shadow-xs ${s.color.split(" ")[0]}`}>
            <div className="text-slate-400 text-[9px] font-black tracking-wider uppercase mb-1">{s.label}</div>
            <div className={`text-xl font-black ${s.color.split(" ")[1]}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table + detail panel */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Table Container */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              Không tìm thấy lead nào phù hợp với bộ lọc.
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[750px]">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs border-b border-slate-100 z-10">
                <tr>
                  {["Khách hàng", "Gói quan tâm", "Số tin nhắn", "Lead Score", "Nhiệt độ", "Giai đoạn", "Ngày tạo", ""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-slate-400 text-[9px] font-black tracking-wider uppercase">
                      {h}
                    </th>
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
                        onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                        className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          selectedLead?.id === lead.id ? "bg-[#0055A5]/[0.02]" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0055A5] to-[#00B4FF] flex items-center justify-center text-white text-xs font-black shrink-0">
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-slate-800 font-bold text-xs">{lead.name}</div>
                              <div className="text-slate-400 text-[10px] font-semibold mt-0.5">{lead.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-blue-50/70 border border-blue-100 text-[#0055A5] rounded-lg px-2.5 py-1 text-[10px] font-bold">
                            {lead.interest}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-semibold text-xs">{lead.messages} tin</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-11 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  lead.score > 80 ? "bg-emerald-500" : lead.score > 60 ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${lead.score}%` }}
                              />
                            </div>
                            <span className="text-slate-700 text-[11px] font-extrabold">{lead.score}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide ${temp.badgeClass}`}>
                            {temp.icon} {lead.temp}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide ${stage.badgeClass}`}>
                            {stage.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 font-semibold text-xs">
                          {new Date(lead.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="gradient-btn-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-decoration-none shadow-sm shadow-blue-500/10"
                          >
                            <Phone size={11} className="inline mr-1" /> Gọi
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
