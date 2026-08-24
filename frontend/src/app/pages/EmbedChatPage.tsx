import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  RotateCcw, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Phone, 
  ShieldCheck, 
  X,
  Smartphone,
  Wifi,
  ChevronRight,
  Info
} from "lucide-react";
import { RobotAvatar } from "../components/RobotAvatar";
import { API_BASE } from "../../config";
import axios from "axios";

type RobotState = "idle" | "talking" | "thinking" | "happy";

interface Message {
  id: string | number;
  type: "user" | "bot";
  text: string;
  sources?: string[];
  quickReplies?: string[];
  leadCapture?: { field: string; label: string };
  time?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Tư vấn gói cước 4G/5G",
  "Bảng giá cáp quang MobiFiber",
  "Gói data ngày rẻ nhất",
  "Ưu đãi đổi eSIM MobiFone"
];

// Helper parser for markdown-like formatting in messages
function renderFormattedText(text: string) {
  if (!text) return null;
  const lines = text.split("\n");

  const parseInline = (inlineText: string) => {
    // Tách các định dạng **bold**, *italic*, [link](url)
    const tokens: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(inlineText)) !== null) {
      if (match.index > lastIdx) {
        tokens.push(inlineText.substring(lastIdx, match.index));
      }
      const raw = match[0];
      if (raw.startsWith("**") && raw.endsWith("**")) {
        tokens.push(<strong key={match.index} className="font-semibold text-blue-900">{raw.slice(2, -2)}</strong>);
      } else if (raw.startsWith("*") && raw.endsWith("*")) {
        tokens.push(<em key={match.index} className="italic">{raw.slice(1, -1)}</em>);
      } else if (raw.startsWith("[") && raw.includes("](")) {
        const linkMatch = raw.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          tokens.push(
            <a 
              key={match.index} 
              href={linkMatch[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5 font-medium"
            >
              {linkMatch[1]}
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          );
        }
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < inlineText.length) {
      tokens.push(inlineText.substring(lastIdx));
    }

    return tokens.length > 0 ? tokens : inlineText;
  };

  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed break-words">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Header ###
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-blue-950 text-sm mt-2 mb-1">
              {parseInline(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-blue-950 text-base mt-2 mb-1">
              {parseInline(trimmed.substring(3))}
            </h3>
          );
        }

        // Bullet point: - hoặc * hoặc 1. 2.
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span className="flex-1">{parseInline(trimmed.substring(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="font-semibold text-blue-600 min-w-[16px]">{numMatch[1]}.</span>
              <span className="flex-1">{parseInline(numMatch[2])}</span>
            </div>
          );
        }

        return <div key={idx}>{parseInline(trimmed)}</div>;
      })}
    </div>
  );
}

export function EmbedChatPage() {
  const [searchParams] = useSearchParams();

  // URL query customization
  const themeColor = searchParams.get("theme") || "#005BAA";
  const botTitle = searchParams.get("title") || "Mia - Chuyên viên MobiFone";
  const initialGreeting = searchParams.get("greeting") || "Xin chào! Mia là Chuyên viên CSKH số của MobiFone. Mia có thể hỗ trợ gì cho bạn hôm nay?";
  const hideHeader = searchParams.get("hideHeader") === "true";

  // State
  const [sessionId, setSessionId] = useState<string>(() => {
    const paramSession = searchParams.get("sessionId");
    if (paramSession) return paramSession;
    const stored = localStorage.getItem("mobifone_widget_session_id");
    if (stored) return stored;
    const newId = `widget_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem("mobifone_widget_session_id", newId);
    return newId;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [robotState, setRobotState] = useState<RobotState>("idle");
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Khởi tạo tin nhắn chào mừng ban đầu
  useEffect(() => {
    // Thông báo cho trang cha là widget đã sẵn sàng
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "MOBIFONE_WIDGET_READY" }, "*");
    }

    // Tải lịch sử chat cũ nếu có
    const loadHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/chat/history/${sessionId}`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          const loaded: Message[] = res.data.map((item: any) => ({
            id: item.id || Math.random(),
            type: item.role === "user" ? "user" : "bot",
            text: item.message,
            time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
          }));
          setMessages(loaded);
          return;
        }
      } catch {
        // Fallback sang tin nhắn chào mặc định
      }

      // Khởi tạo tin nhắn chào mừng
      setMessages([
        {
          id: "welcome_1",
          type: "bot",
          text: initialGreeting,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    loadHistory();
  }, [sessionId, initialGreeting]);

  // Tải danh sách câu hỏi gợi ý từ backend
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await axios.get(`${API_BASE}/chat/suggestions`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSuggestions(res.data);
        }
      } catch {
        // Giữ default suggestions
      }
    };
    fetchSuggestions();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      type: "user",
      text: content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setRobotState("thinking");

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        message: content,
        sessionId: sessionId,
        userInfo: { source: "embed_widget", url: window.location.href }
      });

      const botReplyText = response.data?.reply || response.data?.message || "Cảm ơn bạn đã nhắn tin. Chuyên viên MobiFone sẽ hỗ trợ bạn ngay.";
      
      const botMsg: Message = {
        id: `b_${Date.now()}`,
        type: "bot",
        text: botReplyText,
        sources: response.data?.sources || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      setRobotState("happy");
      setTimeout(() => setRobotState("idle"), 3000);

      // Báo cho widget cha có tin nhắn mới
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "MOBIFONE_WIDGET_MESSAGE_RECEIVED" }, "*");
      }
    } catch (err: any) {
      console.error("Lỗi gửi tin nhắn:", err);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        type: "bot",
        text: "Hiện tại hệ thống kết nối AI đang bận. Bạn vui lòng thử lại sau giây lát hoặc liên hệ tổng đài 18001090 nhé!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
      setRobotState("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    const newId = `widget_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem("mobifone_widget_session_id", newId);
    setSessionId(newId);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        type: "bot",
        text: initialGreeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setLeadSubmitted(false);
    setLeadPhone("");
  };

  const handleClose = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "MOBIFONE_WIDGET_CLOSE" }, "*");
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadPhone.trim() || leadSubmitted) return;

    try {
      await axios.post(`${API_BASE}/chat`, {
        message: `Khách hàng để lại số điện thoại liên hệ: ${leadPhone}`,
        sessionId: sessionId,
        userInfo: { phone: leadPhone, source: "embed_lead_capture" }
      });
      setLeadSubmitted(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `lead_${Date.now()}`,
          type: "bot",
          text: `Dạ Mia đã ghi nhận số điện thoại **${leadPhone}** thành công! Chuyên viên chăm sóc khách hàng MobiFone sẽ liên hệ hỗ trợ bạn trong thời gian sớm nhất nhé.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      setLeadSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden select-none">
      {/* Header Bar */}
      {!hideHeader && (
        <div 
          className="flex items-center justify-between px-4 py-3 text-white shadow-md z-10 transition-colors"
          style={{ backgroundColor: themeColor }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/20 p-0.5 flex items-center justify-center backdrop-blur-sm shadow-inner">
                <RobotAvatar state={robotState} className="w-8 h-8" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"></span>
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide leading-tight">{botTitle}</h1>
              <div className="flex items-center gap-1 text-[11px] text-blue-100/90 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span>Trợ lý số MobiFone 24/7</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title="Làm mới cuộc trò chuyện"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              title="Đóng cửa sổ"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`flex gap-2 max-w-[88%] sm:max-w-[82%] ${
                msg.type === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {msg.type === "bot" && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                    <RobotAvatar state={robotState} className="w-6 h-6" />
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
                  msg.type === "user"
                    ? "text-white rounded-tr-xs font-normal"
                    : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                }`}
                style={msg.type === "user" ? { backgroundColor: themeColor } : {}}
              >
                {msg.type === "user" ? (
                  <p className="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  renderFormattedText(msg.text)
                )}

                {msg.time && (
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      msg.type === "user" ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {msg.time}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs pl-1">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
              <RobotAvatar state="thinking" className="w-6 h-6" />
            </div>
            <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              <span className="text-[11px] font-medium text-slate-500 ml-1">Mia đang tra cứu...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      {messages.length <= 2 && suggestions.length > 0 && !loading && (
        <div className="px-3 py-1.5 bg-slate-100/80 border-t border-slate-200/60 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-1" />
          {suggestions.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(sug)}
              className="text-xs bg-white text-blue-900 hover:bg-blue-50 border border-slate-200/90 px-2.5 py-1 rounded-full shadow-xs transition-colors flex-shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi cần tư vấn..."
            disabled={loading}
            className="flex-1 bg-slate-100 border border-slate-300/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all"
            style={{ "--tw-ring-color": themeColor } as React.CSSProperties}
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95 flex items-center justify-center"
            style={{ backgroundColor: themeColor }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Small Footer Branding */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Tổng đài hỗ trợ 18001090</span>
          </div>
          <span>Powered by MobiFone AI</span>
        </div>
      </div>
    </div>
  );
}
