import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, RotateCcw, Copy, Check, ChevronDown,
  Sliders, Zap, Code2, Terminal, Play, Activity
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { RobotAvatar } from "../../components/RobotAvatar";
import { API_BASE } from "../../../config";

type Message = {
  role: "user" | "assistant";
  content: string;
  latency?: number;
  tokens?: number;
};

// Cấu hình thanh trượt đã được loại bỏ để tối giản trải nghiệm người dùng kinh doanh
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-700 text-slate-500 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Sao chép"}
    </button>
  );
}

export function PromptPlaygroundPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.4);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(512);

  const [otherConfig, setOtherConfig] = useState<any>({});

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [sessionId] = useState(() => `playground_${Math.random().toString(36).substring(2, 11)}`);

  // Hàm lưu cấu hình System Prompt lên backend
  const saveConfig = async () => {
    if (!token || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const configHeaders = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const updatedConfig = {
        ...otherConfig,
        system_prompt: systemPrompt,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
      };
      await axios.post(`${API_BASE}/chat/config`, updatedConfig, configHeaders);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (error) {
      console.error("Lỗi khi lưu cấu hình:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (user.role !== "admin") {
      navigate("/admin");
    }
  }, [user, navigate]);

  const loadConfig = async () => {
    if (!token) return;
    setLoadingConfig(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_BASE}/chat/config`, config);
      const data = response.data;
      if (data) {
        setSystemPrompt(data.system_prompt || "");
        setTemperature(data.temperature !== undefined ? data.temperature : 0.4);
        setTopP(data.top_p !== undefined ? data.top_p : 0.9);
        setMaxTokens(data.max_tokens || 512);
        setOtherConfig(data);
      }
    } catch (error) {
      console.error("Lỗi khi tải cấu hình bot playground:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [token]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  const send = async () => {
    const textToSend = input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

    try {
      if (token) {
        const configHeaders = {
          headers: { Authorization: `Bearer ${token}` },
        };
        const updatedConfig = {
          ...otherConfig,
          system_prompt: systemPrompt,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
        };
        await axios.post(`${API_BASE}/chat/config`, updatedConfig, configHeaders);
      }

      const response = await axios.post(`${API_BASE}/chat`, {
        message: textToSend,
        sessionId,
      });

      const latency = Date.now() - startTime;
      const botAnswer = response.data?.answer || "Không nhận được câu trả lời từ AI.";
      const tokenCount = Math.round(botAnswer.split(" ").length * 1.3);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: botAnswer,
        latency,
        tokens: tokenCount
      }]);
    } catch (error) {
      console.error("Lỗi kết nối chat playground:", error);
      const responseData = axios.isAxiosError(error)
        ? error.response?.data as { message?: string; detail?: string } | undefined
        : undefined;
      const errMsg = axios.isAxiosError(error)
        ? (responseData?.message || responseData?.detail || error.message)
        : "Lỗi không xác định.";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `❌ Lỗi hệ thống: ${errMsg}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  function renderContent(text: string) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return part.split("\n").map((line, j, arr) => (
        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
      ));
    });
  }

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-3 text-slate-400 font-outfit">
        <Activity size={32} className="animate-spin text-[#0055A5]" />
        <span className="font-bold text-sm">Khởi chạy Prompt Playground...</span>
      </div>
    );
  }

  return (
    <div className="font-outfit h-[calc(100vh-130px)] flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-2xl tracking-tight">Prompt Playground (Thử nghiệm)</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">Kiểm tra khả năng phản hồi của Bot và tối ưu cấu hình RAG prompt trực tiếp</p>
        </div>
        <div className="flex gap-2.5 items-center">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-1.5 shadow-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 text-xs font-bold">Chế độ Sandbox</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3.5 py-1.5 cursor-pointer hover:border-slate-300">
            <Code2 size={13} className="text-[#0055A5]" />
            <span className="text-xs font-bold text-slate-600">Qwen-2.5-7B</span>
            <ChevronDown size={12} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left config pane - Dedicated System Prompt Editor */}
        <div className="lg:col-span-4 bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-200/60 shadow-xs min-h-0">
          {/* Section header */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#0055A5]" />
              <span className="text-slate-800 font-extrabold text-[11px] tracking-wider uppercase">Cấu hình hành vi (System Prompt)</span>
            </div>
            <CopyButton text={systemPrompt} />
          </div>

          {/* Prompt Editor */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-50/10">
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Nhập hướng dẫn, vai trò và kịch bản hoạt động của Mia tại đây..."
              className="flex-1 w-full bg-transparent border-none outline-none text-slate-700 font-semibold text-xs leading-relaxed p-5 resize-none font-mono overflow-y-auto"
            />
            {/* Character count */}
            <div className="px-5 py-2.5 border-t border-slate-100 flex justify-end items-center bg-slate-50/40 text-[10px] text-slate-400 font-bold shrink-0">
              <span>{systemPrompt.length} ký tự</span>
            </div>
          </div>

          {/* Action bar to Save/Apply Prompt */}
          <div className="border-t border-slate-100 p-5 shrink-0 bg-white">
            <motion.button
              onClick={saveConfig}
              disabled={isSaving || !systemPrompt.trim()}
              whileTap={!isSaving && systemPrompt.trim() ? { scale: 0.98 } : {}}
              className={`w-full py-3.5 rounded-xl border-none font-black text-xs cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all uppercase tracking-wider ${
                isSaving || !systemPrompt.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  : saveSuccess
                  ? "bg-emerald-500 text-white shadow-emerald-500/10"
                  : "bg-gradient-to-r from-[#0055A5] to-[#00B4FF] text-white hover:shadow-md hover:shadow-blue-500/10 active:scale-95"
              }`}
            >
              {isSaving ? (
                <>
                  <Activity size={14} className="animate-spin" />
                  Đang lưu cấu hình...
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} />
                  Áp dụng thành công!
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Áp dụng cấu hình
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Right Sandbox Chat box */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/60 shadow-xs flex flex-col overflow-hidden min-h-0">
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0055A5] to-[#00B4FF] flex items-center justify-center shadow-md shadow-blue-500/10">
                <Zap size={15} className="text-white fill-white" />
              </div>
              <div>
                <div className="text-slate-800 font-bold text-sm">Khung Chat Thử Nghiệm</div>
                <div className="text-slate-400 text-[10px] font-bold mt-0.5">Session ID: {sessionId}</div>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 bg-transparent border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg px-3 py-1.5 cursor-pointer text-xs font-bold transition-colors"
            >
              <RotateCcw size={12} /> Xoá chat
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-50/50"
          >
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="text-3xl mb-3">🧪</div>
                <div className="text-slate-600 font-black text-sm mb-1.5">Hộp cát Thử nghiệm Trống</div>
                <div className="text-slate-400 text-xs font-semibold max-w-xs leading-relaxed">
                  Nhập câu hỏi bất kỳ ở khung bên dưới để AI sử dụng thông tin RAG trả lời theo System Prompt
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {["Gói cước TK135 có ưu đãi gì?", "eSIM MobiFone đăng ký thế nào?", "Đăng ký chuyển mạng giữ số"].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="bg-white border border-slate-200 hover:border-[#0055A5] hover:text-[#0055A5] rounded-full px-4 py-1.5 text-xs font-bold text-slate-500 transition-all cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2.5 items-end`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <RobotAvatar size={28} state="idle" />
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div
                    className={`p-3.5 text-xs leading-relaxed shadow-xs ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-[#0055A5] to-[#0070D0] text-white rounded-2xl rounded-tr-xs"
                        : "bg-white text-slate-700 border border-slate-200/60 rounded-2xl rounded-tl-xs"
                    }`}
                  >
                    {renderContent(msg.content)}
                  </div>
                  {msg.role === "assistant" && (msg.latency || msg.tokens) && (
                    <div className="flex gap-2 mt-1.5 px-1 font-bold">
                      {msg.latency !== undefined && (
                        <span className="bg-blue-50 border border-blue-100 rounded-md px-1.5 py-0.5 text-[#0055A5] text-[9px]">
                          ⚡ {msg.latency}ms
                        </span>
                      )}
                      {msg.tokens !== undefined && (
                        <span className="bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 text-emerald-600 text-[9px]">
                          📊 {msg.tokens} tokens
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-end gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <RobotAvatar size={28} state="thinking" />
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-xs p-3.5 flex gap-1 items-center shadow-xs">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#0055A5] opacity-50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="p-3.5 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi để test RAG pipeline..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:border-[#0055A5] focus:ring-2 focus:ring-[#0055A5]/10 outline-none transition-all"
            />
            <motion.button
              onClick={send}
              disabled={isLoading || !input.trim()}
              whileTap={{ scale: 0.92 }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-none transition-all active:scale-90 shadow-md ${
                input.trim() && !isLoading
                  ? "bg-gradient-to-r from-[#0055A5] to-[#00B4FF] text-white cursor-pointer shadow-blue-500/10"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              <Send size={15} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
