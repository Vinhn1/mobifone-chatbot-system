import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronRight, Phone, TrendingUp, CheckCircle2, AlertCircle, X, Activity, MessageSquare, Sparkles, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { RobotAvatar } from "../../components/RobotAvatar";
import { API_BASE } from "../../../config";

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
  lastActiveTime: number;
};

const STATUS_CFG: Record<ConvStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  resolved: { label: "Đã xử lý", badgeClass: "bg-emerald-50 border border-emerald-100 text-emerald-600", icon: CheckCircle2 },
  escalated: { label: "Cần hỗ trợ", badgeClass: "bg-rose-50 border border-rose-100 text-rose-600", icon: AlertCircle },
  active: { label: "Đang chat", badgeClass: "bg-blue-50 border border-blue-200 text-[#0055A5]", icon: MessageSquare },
  abandoned: { label: "Rời cuộc chat", badgeClass: "bg-slate-50 border border-slate-200 text-slate-500", icon: X },
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
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [sessionMode, setSessionMode] = useState<'bot' | 'human'>('bot');
  const [showExtractedData, setShowExtractedData] = useState<boolean>(false);
  const [isChatExpanded, setIsChatExpanded] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if not admin or sales
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "sales")) {
      navigate("/login");
    }
  }, [user, navigate]);

  const loadHistory = async (showLoadingSpinner = false) => {
    if (!token) return;
    if (showLoadingSpinner) setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_BASE}/chat/history`, config);
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
        const lastActiveTime = lastTime;
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
        
        // Check if there is an escalate marker or if the bot failed to answer
        const hasEscalateMarker = logs.some((l: any) => 
          l.role === "bot" && (
            l.message.includes("Mia rất tiếc") || 
            l.message.includes("chuyển tiếp yêu cầu đến chuyên viên") ||
            l.message.includes("[ESCALATE]")
          )
        ) || logs.some((l: any) => 
          l.role === "user" && (
            l.message.includes("chuyển nhân viên") || 
            l.message.includes("nhân viên hỗ trợ") ||
            l.message.includes("gặp nhân viên")
          )
        );

        if (hasEscalateMarker) {
          status = "escalated";
        } else if (now - lastTime < tenMinsMs) {
          status = "active";
        } else if (!phone && logs.length <= 3) {
          status = "abandoned";
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
          })),
          lastActiveTime
        };
      });

      // Sort by newest activity (last active time)
      parsedConversations.sort((a, b) => b.lastActiveTime - a.lastActiveTime);

      setConversations(parsedConversations);

      // Cập nhật lại khung chat đang chọn với dữ liệu mới
      setSelected(prevSelected => {
        if (!prevSelected) return null;
        const fresh = parsedConversations.find(c => c.id === prevSelected.id);
        return fresh || prevSelected;
      });
    } catch (error) {
      console.error("Lỗi khi tải lịch sử hội thoại:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(true);
  }, [token]);

  // Lấy trạng thái session mode mỗi khi mở cuộc trò chuyện
  useEffect(() => {
    if (selected?.id && token) {
      axios.get(`${API_BASE}/chat/session/${selected.id}/mode`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setSessionMode(res.data.mode || 'bot');
      }).catch(err => {
        console.error("Lỗi khi lấy session mode:", err);
        setSessionMode('bot');
      });
    }
  }, [selected?.id, token]);

  // Ref lưu giữ giá trị state mới nhất cho event listener
  const selectedRef = useRef<Conversation | null>(null);
  selectedRef.current = selected;

  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  // Auto-polling 4s: tự động làm mới tin nhắn mới khi đang xem phiên chat
  useEffect(() => {
    if (!selected?.id || !token) return;

    const fetchLatestTranscript = async () => {
      try {
        const res = await axios.get(`${API_BASE}/chat/history/${selected.id}`);
        const sessLogs: any[] = (res.data || []).sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        if (sessLogs.length === 0) return;

        const freshTranscript = sessLogs.map((log: any) => ({
          role: log.role as 'bot' | 'user',
          text: log.message,
          time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        // Chỉ cập nhật nếu số lượng tin nhắn hoặc nội dung tin cuối cùng có sự thay đổi
        setSelected(prev => {
          if (!prev || prev.id !== selected.id) return prev;
          if (prev.transcript.length === freshTranscript.length &&
              prev.transcript[prev.transcript.length - 1]?.text === freshTranscript[freshTranscript.length - 1]?.text) {
            return prev;
          }
          return { ...prev, transcript: freshTranscript, messages: freshTranscript.length, lastActiveTime: Date.now() };
        });

        // Cập nhật luôn danh sách conversations
        setConversations(prev => prev.map(c => {
          if (c.id !== selected.id) return c;
          if (c.transcript.length === freshTranscript.length &&
              c.transcript[c.transcript.length - 1]?.text === freshTranscript[freshTranscript.length - 1]?.text) {
            return c;
          }
          return { ...c, transcript: freshTranscript, messages: freshTranscript.length, lastActiveTime: Date.now() };
        }));
      } catch {
        // Silent fail - không làm gián đoạn UX
      }
    };

    const pollInterval = setInterval(fetchLatestTranscript, 4000);
    return () => clearInterval(pollInterval);
  }, [selected?.id, token]);

  const toggleSessionMode = async (targetMode: 'bot' | 'human') => {
    if (!selected?.id || !token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE}/chat/session/${selected.id}/mode`, { mode: targetMode }, config);
      setSessionMode(targetMode);
      
      const newStatus = targetMode === 'human' ? 'escalated' : 'resolved';
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, status: newStatus } : c));
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error("Lỗi khi chuyển đổi session mode:", err);
      alert("Không thể đổi chế độ hỗ trợ!");
    }
  };

  // Tự động cuộn xuống cuối danh sách tin nhắn khi có cập nhật
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [selected?.transcript]);

  // Lắng nghe sự kiện visibilitychange để làm mới ngay dữ liệu khi Admin mở lại Tab trình duyệt
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token) {
        loadHistory(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token]);

  // Lắng nghe các sự kiện thông báo thời gian thực từ AdminLayout
  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      if (data && data.type === 'new-message') {
        const payload = data.payload; // { sessionId, sender, message }
        const sessId = payload.sessionId;
        if (!sessId) return;
        
        const exists = conversationsRef.current.some(c => c.id === sessId);
        if (!exists) {
          // Phiên hội thoại mới từ Zalo/Facebook/Web chưa có trong danh sách -> Gọi async tải lại danh sách
          loadHistory(false);
          return;
        }

        const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const senderRole = payload.sender === 'user' ? 'user' : 'bot';

        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id === sessId) {
              // Ngăn ngừa tin nhắn trùng lặp
              const lastMsg = c.transcript[c.transcript.length - 1];
              if (lastMsg && lastMsg.text === payload.message && lastMsg.role === senderRole) {
                return c;
              }
              
              const newTranscript = [
                ...c.transcript,
                {
                  role: senderRole,
                  text: payload.message,
                  time: nowStr
                }
              ];
              
              // Cập nhật trạng thái nếu phát hiện fallback
              let status = c.status;
              if (payload.sender === 'bot' && (
                payload.message.includes("Mia rất tiếc") || 
                payload.message.includes("chuyển tiếp yêu cầu đến chuyên viên") || 
                payload.message.includes("[ESCALATE]")
              )) {
                status = "escalated";
              }
              
              return {
                ...c,
                messages: newTranscript.length,
                status,
                transcript: newTranscript,
                lastActiveTime: Date.now()
              };
            }
            return c;
          });
          return [...updated].sort((a, b) => b.lastActiveTime - a.lastActiveTime);
        });

        // Cập nhật cuộc hội thoại hiện tại đang được chọn (nếu khớp sessId)
        if (selectedRef.current && selectedRef.current.id === sessId) {
          setSelected(prevSelected => {
            if (!prevSelected || prevSelected.id !== sessId) return prevSelected;
            const lastMsg = prevSelected.transcript[prevSelected.transcript.length - 1];
            if (lastMsg && lastMsg.text === payload.message && lastMsg.role === senderRole) {
              return prevSelected;
            }
            
            const newTranscript = [
              ...prevSelected.transcript,
              {
                role: senderRole,
                text: payload.message,
                time: nowStr
              }
            ];
            
            let status = prevSelected.status;
            if (payload.sender === 'bot' && (
              payload.message.includes("Mia rất tiếc") || 
              payload.message.includes("chuyển tiếp yêu cầu đến chuyên viên") || 
              payload.message.includes("[ESCALATE]")
            )) {
              status = "escalated";
            }

            return {
              ...prevSelected,
              messages: newTranscript.length,
              status,
              transcript: newTranscript,
              lastActiveTime: Date.now()
            };
          });
        }
      } else if (data && data.type === 'manual-intervention-required') {
        const payload = data.payload;
        const sessId = payload.sessionId;
        
        setConversations(prev => prev.map(c => c.id === sessId ? { ...c, status: "escalated" } : c));
        if (selectedRef.current && selectedRef.current.id === sessId) {
          setSelected(prev => prev ? { ...prev, status: "escalated" } : null);
        }
      } else if (data && data.type === 'session-mode-changed') {
        const payload = data.payload;
        const sessId = payload.sessionId;
        if (selectedRef.current && selectedRef.current.id === sessId) {
          setSessionMode(payload.mode);
        }
      }
    };

    window.addEventListener('app-notification', handleNotification);
    return () => window.removeEventListener('app-notification', handleNotification);
  }, [token]);

  const handleSendReply = async () => {
    if (!selected || !replyText.trim() || !token) return;
    const sentMsg = replyText.trim();
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const targetSessId = selected.id;

    // 1. Cập nhật ngay lập tức giao diện Admin (Optimistic UI Update)
    const newMsgObj = { role: "bot" as const, text: sentMsg, time: nowStr };

    setSelected(prev => prev && prev.id === targetSessId ? {
      ...prev,
      messages: prev.messages + 1,
      status: 'escalated',
      transcript: [...prev.transcript, newMsgObj],
      lastActiveTime: Date.now()
    } : prev);

    setConversations(prev => prev.map(c => c.id === targetSessId ? {
      ...c,
      messages: c.messages + 1,
      status: 'escalated',
      transcript: [...c.transcript, newMsgObj],
      lastActiveTime: Date.now()
    } : c).sort((a, b) => b.lastActiveTime - a.lastActiveTime));

    setReplyText("");
    setSendingReply(true);

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.post(
        `${API_BASE}/chat/reply`,
        {
          sessionId: targetSessId,
          message: sentMsg,
        },
        config
      );
    } catch (err) {
      console.error("Lỗi khi gửi phản hồi của nhân viên:", err);
      alert("Không thể gửi phản hồi, vui lòng thử lại!");
    } finally {
      setSendingReply(false);
    }
  };

  const filtered = conversations.filter(c =>
    (statusFilter === "all" || c.status === statusFilter) &&
    (c.user.toLowerCase().includes(search.toLowerCase()) || c.intent.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-3 text-slate-400 font-outfit">
        <Activity size={32} className="animate-spin text-[#0055A5]" />
        <span className="font-bold text-sm">Đang đồng bộ hội thoại bot từ backend...</span>
      </div>
    );
  }

  return (
    <div className="font-outfit flex flex-col gap-5 h-[calc(100vh-130px)] pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-xl tracking-tight">Lịch sử Đối thoại</h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Bản ghi chi tiết các cuộc trò chuyện và thông tin tự động phân đoạn bởi AI</p>
        </div>
        <button
          onClick={() => loadHistory(false)}
          className="gradient-btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer"
        >
          Làm Mới Dữ Liệu
        </button>
      </div>

      {/* Filters & Tabs */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-4.5 h-10 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400" />
          <input
            placeholder="Tìm kiếm theo khách hàng hoặc Intent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="background-transparent border-none outline-none text-xs font-semibold text-slate-600 flex-1 font-outfit"
          />
        </div>
        <div className="flex gap-1 bg-slate-100/80 border border-slate-200/50 rounded-xl p-1 shrink-0">
          {(["all", "active", "resolved", "escalated", "abandoned"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg border-none text-[11px] font-black tracking-wide cursor-pointer transition-all duration-200 ${
                statusFilter === s
                  ? "bg-[#0055A5] text-white shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "Tất cả" : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">
        {/* Conversation List */}
        <div className={`flex flex-col gap-3.5 overflow-y-auto pr-1 ${selected ? (isChatExpanded ? "hidden" : "w-[400px] shrink-0") : "flex-1"}`}>
          {filtered.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl text-center border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
              Không tìm thấy phiên hội thoại nào hợp lệ.
            </div>
          ) : (
            filtered.map(conv => {
              const st = STATUS_CFG[conv.status] || STATUS_CFG.resolved;
              const StIcon = st.icon;
              const isSelected = selected?.id === conv.id;
              return (
                <motion.div
                  key={conv.id}
                  onClick={() => setSelected(isSelected ? null : conv)}
                  className={`bg-white rounded-2xl p-4.5 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-[#0055A5] bg-[#0055A5]/[0.02] shadow-md shadow-blue-500/[0.04]"
                      : conv.status === "escalated"
                      ? "border-rose-300 bg-rose-50/20 shadow-sm hover:border-rose-400"
                      : "border-slate-100 hover:border-slate-200 hover:shadow-xs"
                  }`}
                  whileHover={{ y: -1 }}
                >
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 relative ${
                        conv.status === "active"
                          ? "bg-gradient-to-br from-[#0055A5] to-[#00B4FF] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {conv.user.charAt(0)}
                        {conv.status === "active" && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div>
                        <div className="text-slate-800 font-bold text-xs">{conv.user}</div>
                        <div className="text-slate-400 text-[10px] font-semibold mt-0.5">{conv.phone} · {conv.startTime}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold flex items-center gap-1 uppercase tracking-wide ${st.badgeClass}`}>
                      <StIcon size={10} /> {st.label}
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap mb-3 font-semibold text-[10px]">
                    <span className="bg-blue-50/70 border border-blue-100 text-[#0055A5] rounded-md px-2 py-0.5">{conv.intent}</span>
                    <span className="bg-slate-50 border border-slate-200 text-slate-500 rounded-md px-2 py-0.5">
                      {conv.messages} tin · {conv.duration}
                    </span>
                  </div>

                  {/* Extracted data pills */}
                  {Object.values(conv.extractedData).some(v => v !== undefined) && (
                    <div className="flex flex-wrap gap-1.5 mb-3.5">
                      {conv.extractedData.name && <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md px-1.5 py-0.5 text-[9px] font-bold">✓ TÊN</span>}
                      {conv.extractedData.phone && <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md px-1.5 py-0.5 text-[9px] font-bold">✓ SĐT</span>}
                      {conv.extractedData.package && <span className="bg-amber-50 border border-amber-100 text-amber-700 rounded-md px-1.5 py-0.5 text-[9px] font-bold">📦 {conv.extractedData.package}</span>}
                      {conv.extractedData.budget && <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md px-1.5 py-0.5 text-[9px] font-bold">💰 {conv.extractedData.budget}</span>}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100/60">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} className={conv.leadScore > 80 ? "text-emerald-500" : conv.leadScore > 50 ? "text-amber-500" : "text-slate-400"} />
                      <span className={`text-[10px] font-black tracking-wide ${
                        conv.leadScore > 80 ? "text-emerald-500" : conv.leadScore > 50 ? "text-amber-500" : "text-slate-400"
                      }`}>
                        LEAD SCORE: {conv.leadScore}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Transcript Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 bg-white rounded-3xl border border-slate-200/60 shadow-xs flex flex-col overflow-hidden min-h-0"
            >
              {/* Panel header */}
              <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <div className="text-slate-800 font-extrabold text-sm">Chi tiết đối thoại — {selected.user}</div>
                  <div className="text-slate-400 text-[10px] font-bold mt-0.5">Phiên ID: {selected.id}</div>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Mode Badge & Toggle Button */}
                  <button
                    onClick={() => toggleSessionMode(sessionMode === 'human' ? 'bot' : 'human')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider border cursor-pointer transition-all ${
                      sessionMode === 'human'
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                        : 'bg-blue-50 border-blue-200 text-[#0055A5] hover:bg-blue-100'
                    }`}
                    title={sessionMode === 'human' ? "Bấm để trả lại quyền trả lời tự động cho Bot AI" : "Bấm để tạm dừng Bot và tiếp nhận hỗ trợ trực tiếp"}
                  >
                    {sessionMode === 'human' ? (
                      <>👤 CSKH Trực tiếp (Bot ngắt) · 🤖 Trao lại Bot</>
                    ) : (
                      <>🤖 Bot AI Tự động · 👤 Tiếp nhận chat</>
                    )}
                  </button>

                  {selected.phone !== "—" && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider no-underline shadow-sm shadow-emerald-500/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                      <Phone size={12} /> Gọi ngay
                    </a>
                  )}
                  <button
                    onClick={() => setIsChatExpanded(!isChatExpanded)}
                    className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500 transition-colors"
                    title={isChatExpanded ? "Thu nhỏ về giao diện chia đôi" : "Mở rộng khung chat toàn chiều rộng"}
                  >
                    {isChatExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl w-8 h-8 flex items-center justify-center cursor-pointer text-slate-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Extracted data collapsible accordion */}
              {Object.values(selected.extractedData).some(v => v !== undefined) && (
                <div className="bg-emerald-500/5 border-b border-emerald-100 shrink-0 transition-all">
                  <button
                    onClick={() => setShowExtractedData(!showExtractedData)}
                    className="w-full px-6 py-2.5 flex justify-between items-center bg-transparent border-none cursor-pointer hover:bg-emerald-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} className="text-emerald-600" />
                      <span className="text-emerald-700 text-[10px] font-black tracking-widest uppercase">
                        Dữ liệu khai thác AI
                      </span>
                      {!showExtractedData && (
                        <div className="flex gap-1.5 ml-2 overflow-hidden">
                          {Object.entries(selected.extractedData).map(([k, v]) => v && (
                            <span key={k} className="bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 shadow-2xs">
                              {k === "package" ? `GÓI: ${v}` : k === "phone" ? `SĐT: ${v}` : `${k.toUpperCase()}: ${v}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-extrabold">
                      <span>{showExtractedData ? "Thu gọn" : "Xem chi tiết"}</span>
                      <ChevronDown size={14} className={`transform transition-transform duration-200 ${showExtractedData ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {showExtractedData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-3 pt-1 flex flex-wrap gap-2 overflow-hidden border-t border-emerald-100/50"
                      >
                        {Object.entries(selected.extractedData).map(([k, v]) => v && (
                          <div key={k} className="bg-white border border-emerald-100 rounded-xl px-3 py-1.5 shadow-xs">
                            <div className="text-slate-400 text-[9px] font-black tracking-wider uppercase">
                              {k.toUpperCase() === "PACKAGE" ? "GÓI DỊCH VỤ" : k.toUpperCase() === "BUDGET" ? "NGÂN SÁCH" : k.toUpperCase()}
                            </div>
                            <div className="text-slate-800 font-extrabold text-xs mt-0.5">{v}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Messages Container */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4.5 bg-slate-50/50">
                {selected.transcript.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5 items-end`}>
                      {!isUser && (
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          <RobotAvatar size={28} state="idle" />
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        <div className={`p-3.5 text-xs leading-relaxed shadow-xs ${
                          isUser
                            ? "bg-gradient-to-br from-[#0055A5] to-[#0070D0] text-white rounded-2xl rounded-tr-xs"
                            : "bg-white text-slate-700 border border-slate-200/60 rounded-2xl rounded-tl-xs"
                        }`}>
                          {msg.text}
                        </div>
                        <div className={`text-slate-400 text-[9px] font-semibold mt-1 px-1 ${
                          isUser ? "text-right" : "text-left"
                        }`}>
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Staff Input Action Bar */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  placeholder="Nhập nội dung phản hồi khách hàng..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !sendingReply) {
                      handleSendReply();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0055A5] transition-colors"
                  disabled={sendingReply}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4.5 py-2.5 bg-[#0055A5] text-white rounded-xl text-xs font-bold transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {sendingReply ? "Đang gửi..." : "Gửi tin"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
