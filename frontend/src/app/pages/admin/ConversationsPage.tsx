import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronRight, Phone, TrendingUp, CheckCircle2, AlertCircle, X, Activity, MessageSquare } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

type ConvStatus = "resolved" | "escalated" | "active" | "abandoned";

type Conversation = {
  id: string;
  user: string;
  phone: string;
  startTime: string;
  duration: string;
  messages: number;
  status: ConvStatus;
  intent: string;
  leadScore: number;
  extractedData: { phone?: string; name?: string; package?: string; carrier?: string; budget?: string };
  transcript: { role: "bot" | "user"; text: string; time: string }[];
};

const STATUS_CFG: Record<ConvStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  resolved: { label: "Đã giải quyết", color: "#16A34A", bg: "#DCFCE7", icon: CheckCircle2 },
  escalated: { label: "Chuyển nhân viên", color: "#DC2626", bg: "#FEE2E2", icon: AlertCircle },
  active: { label: "Đang chat", color: "#0055A5", bg: "#EFF6FF", icon: MessageSquare },
  abandoned: { label: "Đã rời đi", color: "#94A3B8", bg: "#F8FAFC", icon: X },
};

function extractPhone(text: string): string | undefined {
  const phoneRegex = /(?:\+84|84|0)(3|5|7|8|9)[0-9]{8}\b/;
  const match = text.match(phoneRegex);
  return match ? match[0] : undefined;
}

function extractName(text: string): string | undefined {
  const nameTriggers = ["tên là", "tên tôi là", "mình là", "tôi là", "gọi tôi là"];
  const lower = text.toLowerCase();
  for (const trigger of nameTriggers) {
    const idx = lower.indexOf(trigger);
    if (idx !== -1) {
      const parts = text.substring(idx + trigger.length).trim().split(/[.,\s]/);
      if (parts.length > 0 && parts[0].length > 1) {
        return parts[0];
      }
    }
  }
  return undefined;
}

function extractPackage(text: string): string | undefined {
  const pkgs = ["TK135", "TK159", "MXH120", "MXH150", "KC120", "KC150"];
  const upper = text.toUpperCase();
  for (const pkg of pkgs) {
    if (upper.includes(pkg)) return pkg;
  }
  return undefined;
}

export function ConversationsPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConvStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  const loadHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get("http://localhost:3000/chat/history", config);
      const rawLogs = response.data || [];

      // Group individual logs by sessionId
      const groups: Record<string, typeof rawLogs> = {};
      rawLogs.forEach((log: any) => {
        if (!groups[log.sessionId]) {
          groups[log.sessionId] = [];
        }
        groups[log.sessionId].push(log);
      });

      const parsedConversations: Conversation[] = Object.keys(groups).map(sessId => {
        // Sort chronologically ascending
        const logs = groups[sessId].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const firstLog = logs[0];
        const lastLog = logs[logs.length - 1];

        // Extracted data across all user messages
        let phone: string | undefined;
        let name: string | undefined;
        let pkg: string | undefined;
        let budget: string | undefined;

        logs.forEach((log: any) => {
          if (log.role === "user") {
            const ph = extractPhone(log.message);
            if (ph) phone = ph;
            const nm = extractName(log.message);
            if (nm) name = nm;
            const pk = extractPackage(log.message);
            if (pk) pkg = pk;

            if (log.message.includes("k/tháng") || log.message.includes("đồng/tháng")) {
              const match = log.message.match(/\d+(k|k\/tháng)/i);
              if (match) budget = match[0];
            }
          }
        });

        // Calculate conversation duration
        const firstTime = new Date(firstLog.createdAt).getTime();
        const lastTime = new Date(lastLog.createdAt).getTime();
        const diffMins = Math.round((lastTime - firstTime) / (1000 * 60));
        const durationStr = diffMins === 0 ? "Ít hơn 1 phút" : `${diffMins} phút`;

        // Calculate lead score based on gathered info
        let score = 20;
        if (phone) score += 50;
        if (pkg) score += 20;
        if (name) score += 10;

        // Determine session status
        let status: ConvStatus = "resolved";
        const now = Date.now();
        const tenMinsMs = 10 * 60 * 1000;
        if (now - lastTime < tenMinsMs) {
          status = "active";
        } else if (!phone && logs.length <= 3) {
          status = "abandoned";
        } else if (logs.some((l: any) => l.message.includes("chuyển nhân viên") || l.message.includes("nhân viên hỗ trợ"))) {
          status = "escalated";
        }

        // Determine intent based on user keywords
        let intent = "Tư vấn dịch vụ";
        const allUserMsgStr = logs.filter((l: any) => l.role === "user").map((l: any) => l.message.toLowerCase()).join(" ");
        if (allUserMsgStr.includes("gói") || allUserMsgStr.includes("khuyến mãi")) {
          intent = "Tư vấn gói cước";
        } else if (allUserMsgStr.includes("esim")) {
          intent = "Đăng ký eSIM";
        } else if (allUserMsgStr.includes("chuyển mạng") || allUserMsgStr.includes("giữ số")) {
          intent = "Chuyển mạng giữ số";
        }

        return {
          id: sessId,
          user: name ? name : `Khách hàng ${sessId.substring(0, 5)}`,
          phone: phone ? phone : "—",
          startTime: new Date(firstLog.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          duration: durationStr,
          messages: logs.length,
          status,
          intent,
          leadScore: score,
          extractedData: { phone, name, package: pkg, budget },
          transcript: logs.map((log: any) => ({
            role: log.role === "bot" ? "bot" : "user",
            text: log.message,
            time: new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }))
        };
      });

      // Sort by newest session start
      parsedConversations.sort((a, b) => b.id.localeCompare(a.id));

      setConversations(parsedConversations);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử hội thoại:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [token]);

  const filtered = conversations.filter(c =>
    (statusFilter === "all" || c.status === statusFilter) &&
    (c.user.toLowerCase().includes(search.toLowerCase()) || c.intent.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 12, color: "#64748B" }}>
        <Activity size={32} style={{ animation: "spin 2s linear infinite", color: "#0055A5" }} />
        <span style={{ fontWeight: 600 }}>Đang đồng bộ hội thoại bot từ backend...</span>
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
    <div style={{ fontFamily: "'Outfit',sans-serif", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 22, marginBottom: 2 }}>Hội thoại của Bot</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>Xem toàn bộ cuộc trò chuyện, phân đoạn logs & dữ liệu thông minh được Mia tự động trích xuất</p>
        </div>
        <button
          onClick={loadHistory}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10,
            background: "white", border: "1.5px solid #E2E8F0",
            color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Tải lại dữ liệu
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 14px", height: 40, flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: "#94A3B8" }} />
          <input placeholder="Tìm kiếm theo tên, phiên ID, nhu cầu khách hàng..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "#334155", flex: 1, fontFamily: "'Outfit',sans-serif" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: 3 }}>
          {(["all", "active", "resolved", "escalated", "abandoned"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: statusFilter === s ? "#0055A5" : "transparent", color: statusFilter === s ? "white" : "#64748B", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}>
              {s === "all" ? "Tất cả" : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, overflow: "hidden" }}>
        {/* List */}
        <div style={{ flex: selected ? "0 0 420px" : 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, background: "white", borderRadius: 14, textAlign: "center", border: "1.5px dashed #E2E8F0", color: "#64748B" }}>
              Không tìm thấy phiên hội thoại nào hợp lệ.
            </div>
          ) : (
            filtered.map(conv => {
              const st = STATUS_CFG[conv.status] || STATUS_CFG.resolved;
              const StIcon = st.icon;
              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelected(selected?.id === conv.id ? null : conv)}
                  style={{
                    background: "white", borderRadius: 14, padding: "16px 18px",
                    border: `1.5px solid ${selected?.id === conv.id ? "#0055A5" : "#E2E8F0"}`,
                    cursor: "pointer", transition: "all 0.2s",
                    boxShadow: selected?.id === conv.id ? "0 4px 20px rgba(0,85,165,0.15)" : "0 1px 4px rgba(0,0,0,0.03)",
                  }}
                  whileHover={{ y: -1, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: conv.status === "active" ? "linear-gradient(135deg,#0055A5,#00B4FF)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: conv.status === "active" ? "white" : "#64748B", fontSize: 14, fontWeight: 800, flexShrink: 0, position: "relative" }}>
                        {conv.user.charAt(0)}
                        {conv.status === "active" && <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#22C55E", border: "2px solid white" }} />}
                      </div>
                      <div>
                        <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>{conv.user}</div>
                        <div style={{ color: "#94A3B8", fontSize: 11 }}>{conv.phone} · {conv.startTime}</div>
                      </div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 7, padding: "2px 8px", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", flexShrink: 0 }}>
                      <StIcon size={9} /> {st.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ background: "#EFF6FF", color: "#0055A5", border: "1px solid #BFDBFE", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{conv.intent}</span>
                    <span style={{ background: "#F8FAFC", color: "#64748B", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{conv.messages} tin · {conv.duration}</span>
                  </div>

                  {/* Extracted data pills */}
                  {Object.values(conv.extractedData).some(v => v !== undefined) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {conv.extractedData.name && <span style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>✓ Tên</span>}
                      {conv.extractedData.phone && <span style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>✓ SĐT</span>}
                      {conv.extractedData.package && <span style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>📦 {conv.extractedData.package}</span>}
                      {conv.extractedData.budget && <span style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #6EE7B7", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>💰 {conv.extractedData.budget}</span>}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <TrendingUp size={12} style={{ color: conv.leadScore > 80 ? "#22C55E" : conv.leadScore > 50 ? "#F59E0B" : "#94A3B8" }} />
                      <span style={{ color: conv.leadScore > 80 ? "#22C55E" : conv.leadScore > 50 ? "#F59E0B" : "#94A3B8", fontSize: 12, fontWeight: 700 }}>Tiềm năng: {conv.leadScore}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: "#CBD5E1" }} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Transcript panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              style={{ flex: 1, background: "white", borderRadius: 16, border: "1.5px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
            >
              {/* Panel header */}
              <div style={{ padding: "16px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15 }}>Chi tiết đối thoại — {selected.user}</div>
                  <div style={{ color: "#94A3B8", fontSize: 11, wordBreak: "break-all" }}>Phiên ID: {selected.id}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {selected.phone !== "—" && (
                    <a href={`tel:${selected.phone}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 9, textDecoration: "none", background: "linear-gradient(135deg,#0055A5,#00B4FF)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                      <Phone size={12} /> Gọi trực tiếp
                    </a>
                  )}
                  <button onClick={() => setSelected(null)} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748B" }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Extracted data */}
              {Object.values(selected.extractedData).some(v => v !== undefined) && (
                <div style={{ padding: "12px 18px", background: "#F0FDF4", borderBottom: "1px solid #BBF7D0" }}>
                  <div style={{ color: "#16A34A", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>📊 DỮ LIỆU LEAD TỰ ĐỘNG KHAI THÁC</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(selected.extractedData).map(([k, v]) => v && (
                      <div key={k} style={{ background: "white", border: "1px solid #BBF7D0", borderRadius: 8, padding: "4px 10px" }}>
                        <div style={{ color: "#94A3B8", fontSize: 9, fontWeight: 700 }}>{k.toUpperCase() === "PACKAGE" ? "GÓI QUAN TÂM" : k.toUpperCase() === "BUDGET" ? "NGÂN SÁCH" : k.toUpperCase()}</div>
                        <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 12 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                {selected.transcript.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                    {msg.role === "bot" && <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#0055A5,#00B4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🤖</div>}
                    <div style={{ maxWidth: "75%" }}>
                      <div style={msg.role === "user"
                        ? { background: "linear-gradient(135deg,#0055A5,#0070D0)", color: "white", borderRadius: "14px 2px 14px 14px", padding: "9px 13px", fontSize: 13, lineHeight: 1.55 }
                        : { background: "#F8FAFC", color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: "2px 14px 14px 14px", padding: "9px 13px", fontSize: 13, lineHeight: 1.6 }
                      }>{msg.text}</div>
                      <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 3, textAlign: msg.role === "user" ? "right" : "left" }}>{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
