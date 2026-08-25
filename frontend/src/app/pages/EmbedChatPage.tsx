import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  X,
  Wifi,
  MessageCircle,
  Headphones,
  BadgeCheck
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
  const rawTheme = searchParams.get("theme");
  const themeColor = (rawTheme && rawTheme !== "#005BAA" ? rawTheme : null) || localStorage.getItem("mobifone_widget_theme_color") || rawTheme || "#005BAA";
  const botTitle = searchParams.get("title") || localStorage.getItem("mobifone_widget_bot_name") || "Mia - Chuyên viên MobiFone";
  const initialGreeting = searchParams.get("greeting") || localStorage.getItem("mobifone_widget_greeting") || "Xin chào! Mia là Chuyên viên CSKH số của MobiFone. Mia có thể hỗ trợ gì cho bạn hôm nay?";
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
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
        // Fallback lời chào mặc định
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

      // Trích xuất câu trả lời chuẩn từ RAG AI backend (field answer)
      const botReplyText = response.data?.answer || response.data?.reply || response.data?.message || "Cảm ơn bạn đã nhắn tin. Chuyên viên MobiFone sẽ hỗ trợ bạn ngay.";
      
      const botMsg: Message = {
        id: `b_${Date.now()}`,
        type: "bot",
        text: botReplyText,
        sources: response.data?.sources || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      setRobotState("talking");
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
  };

  const handleClose = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "MOBIFONE_WIDGET_CLOSE" }, "*");
    }
  };

  return (
    <div className="relative flex h-[100dvh] h-screen w-full flex-col overflow-hidden bg-[#f6f8fb] text-slate-900 font-outfit select-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(0,85,165,0.055) 0 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.78), rgba(246,248,251,0.88))",
          backgroundSize: "28px 28px, 100% 100%",
        }}
      />

      {/* Header Bar */}
      {!hideHeader && (
        <div
          className="relative z-10 shrink-0 overflow-hidden border-b border-white/15 text-white shadow-[0_10px_28px_rgba(0,35,76,0.18)]"
          style={{
            background: `linear-gradient(135deg, ${themeColor} 0%, #0c1829 100%)`,
          }}
        >
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-white/30 via-white/10 to-transparent" />
          <div className="relative flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/18 p-0.5 shadow-inner backdrop-blur-md">
                  <RobotAvatar size={36} state={robotState} />
                </div>
                <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-[14.5px] font-black leading-tight">{botTitle}</h1>
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-white/72">
                  <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-300" />
                  <span className="truncate">Trợ lý số MobiFone đang online</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={handleResetChat}
                title="Làm mới cuộc trò chuyện"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white/78 transition-all hover:bg-white/18 hover:text-white active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                title="Đóng cửa sổ"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white/78 transition-all hover:bg-white/18 hover:text-white active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={messagesContainerRef} className="custom-scrollbar relative z-0 flex-1 overflow-y-auto px-3.5 py-3.5">
        {/* Intro Service Badges */}
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {[
            { icon: Wifi, text: "4G/5G", query: "Tư vấn gói cước 4G/5G" },
            { icon: Headphones, text: "CSKH 24/7", query: "Kết nối hỗ trợ CSKH 24/7" },
            { icon: MessageCircle, text: "Phản hồi nhanh", query: "Tra cứu gói cước & dịch vụ" },
          ].map((item) => (
            <button
              key={item.text}
              type="button"
              onClick={() => handleSendMessage(item.query)}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-2 py-2 text-[10.5px] font-bold text-slate-800 shadow-xs backdrop-blur transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <item.icon className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span className="truncate">{item.text}</span>
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className={`mb-3.5 flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`flex max-w-[90%] gap-2.5 sm:max-w-[84%] ${
                  msg.type === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {msg.type === "bot" && (
                  <div className="mt-0.5 shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <RobotAvatar size={30} state={robotState} />
                    </div>
                  </div>
                )}

                <div className="min-w-0">
                  <div
                    className={`relative px-3.5 py-2.5 shadow-sm ${
                      msg.type === "user"
                        ? "rounded-2xl rounded-tr text-white"
                        : "rounded-2xl rounded-tl border border-slate-200/85 bg-white/95 text-slate-800 shadow-slate-200/60 backdrop-blur"
                    }`}
                    style={
                      msg.type === "user"
                        ? { 
                            background: `linear-gradient(135deg, ${themeColor} 0%, #0c1829 100%)`,
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.14)"
                          }
                        : {}
                    }
                  >
                    {msg.type === "user" ? (
                      <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{msg.text}</p>
                    ) : (
                      renderFormattedText(msg.text)
                    )}

                    {msg.time && (
                      <div
                        className={`mt-1.5 text-right text-[10px] font-medium ${
                          msg.type === "user" ? "text-white/75" : "text-slate-400"
                        }`}
                      >
                        {msg.time}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-end gap-2.5 pl-0.5 text-xs text-slate-500">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <RobotAvatar size={30} state="thinking" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
              <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: themeColor, animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: themeColor, animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: themeColor, animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      {messages.length <= 2 && suggestions.length > 0 && !loading && (
        <div className="relative z-10 border-t border-slate-200/70 bg-white/74 px-3 py-2 backdrop-blur-xl">
          <div 
            className="scrollbar-none flex items-center gap-1.5 overflow-x-auto whitespace-nowrap"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug)}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="relative z-10 border-t border-slate-200 bg-white/92 p-3 shadow-[0_-12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-slate-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-500/10">
            <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi cần tư vấn..."
              disabled={loading}
              className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            style={{ 
              background: input.trim() && !loading 
                ? `linear-gradient(135deg, ${themeColor} 0%, #0c1829 100%)` 
                : "#94a3b8" 
            }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Small Footer Branding */}
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] font-bold text-slate-400">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>Tổng đài hỗ trợ 18001090</span>
          </div>
          <span className="shrink-0 text-slate-300">Powered by MobiFone AI</span>
        </div>
      </div>
    </div>
  );
}
