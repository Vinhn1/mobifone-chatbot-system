import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, RotateCcw, Copy, Check, ChevronDown,
  Sliders, Zap, Code2, Terminal, Play, Activity
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

type Message = {
  role: "user" | "assistant";
  content: string;
  latency?: number;
  tokens?: number;
};

function Slider({ label, value, min, max, step, onChange, desc }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; desc?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 600 }}>{label}</span>
          {desc && <span style={{ color: "#64748B", fontSize: 11, marginLeft: 6 }}>{desc}</span>}
        </div>
        <span
          style={{
            background: "rgba(0,180,255,0.15)", border: "1px solid rgba(0,180,255,0.3)",
            borderRadius: 6, padding: "2px 10px",
            color: "#60B4FF", fontSize: 13, fontWeight: 700,
          }}
        >
          {value}
        </span>
      </div>
      <div style={{ position: "relative", height: 6 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 3, background: "linear-gradient(90deg,#0055A5,#00B4FF)", width: `${((value - min) / (max - min)) * 100}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%",
            margin: 0, padding: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${((value - min) / (max - min)) * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 16, height: 16,
            borderRadius: "50%",
            background: "white",
            border: "2px solid #0055A5",
            boxShadow: "0 0 8px rgba(0,85,165,0.4)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}
    >
      {copied ? <Check size={12} style={{ color: "#22C55E" }} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
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

  // Remaining configuration parameters (to preserve when saving)
  const [otherConfig, setOtherConfig] = useState<any>({});

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Session ID for chatbot continuity
  const [sessionId] = useState(() => `playground_${Math.random().toString(36).substring(2, 11)}`);

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  // Load active prompt & model config on page mount
  const loadConfig = async () => {
    if (!token) return;
    setLoadingConfig(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get("http://localhost:3000/chat/config", config);
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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  const send = async () => {
    const textToSend = input.trim();
    if (!textToSend || isLoading) return;

    // 1. Add user message
    const userMsg: Message = { role: "user", content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // 2. Auto-save current playground parameters & system prompt to backend config
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
        await axios.post("http://localhost:3000/chat/config", updatedConfig, configHeaders);
      }

      // 3. Send query to chat API
      const response = await axios.post("http://localhost:3000/chat", {
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
      const errMsg = axios.isAxiosError(error) ? (error.response?.data?.message || error.message) : "Lỗi không xác định.";
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
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split("\n").map((line, j, arr) => (
        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
      ));
    });
  }

  if (loadingConfig) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 12, color: "#64748B" }}>
        <Activity size={32} style={{ animation: "spin 2s linear infinite", color: "#0055A5" }} />
        <span style={{ fontWeight: 600 }}>Khởi chạy Prompt Playground...</span>
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
    <div style={{ fontFamily: "'Outfit', sans-serif", height: "calc(100vh - 108px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 800, fontSize: 22, marginBottom: 2 }}>Prompt Playground (Thử nghiệm)</h1>
          <p style={{ color: "#64748B", fontSize: 14 }}>Nhập prompt, đổi thông số và chat trực tiếp để thử độ chính xác của cơ sở tri thức</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "5px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
            <span style={{ color: "#16A34A", fontSize: 12, fontWeight: 600 }}>Chế độ Sandbox</span>
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "6px 12px",
            }}
          >
            <Code2 size={14} style={{ color: "#0055A5" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Qwen-2.5-7B</span>
            <ChevronDown size={13} style={{ color: "#94A3B8" }} />
          </div>
        </div>
      </div>

      {/* Main two-pane layout */}
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, flex: 1, overflow: "hidden" }}>
        {/* LEFT PANE — System prompt + params */}
        <div
          style={{
            background: "#0A1628",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Prompt section header */}
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Terminal size={15} style={{ color: "#60B4FF" }} />
              <span style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 14 }}>System Prompt hiện thời</span>
            </div>
            <CopyButton text={systemPrompt} />
          </div>

          {/* Prompt textarea */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#94D4FF",
                fontSize: 12.5,
                lineHeight: 1.7,
                padding: "14px 20px",
                resize: "none",
                fontFamily: "'Courier New', 'Monaco', monospace",
                overflowY: "auto",
              }}
            />
          </div>

          {/* Parameters section */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "16px 20px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Sliders size={14} style={{ color: "#60B4FF" }} />
              <span style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 14 }}>Tham số mô hình</span>
            </div>

            <Slider label="Temperature" desc="Độ sáng tạo" value={temperature} min={0} max={1} step={0.05} onChange={setTemperature} />
            <Slider label="Top-P" desc="Độ đa dạng từ" value={topP} min={0} max={1} step={0.05} onChange={setTopP} />

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 600 }}>Max Tokens</span>
                <span style={{ background: "rgba(0,180,255,0.15)", border: "1px solid rgba(0,180,255,0.3)", borderRadius: 6, padding: "2px 10px", color: "#60B4FF", fontSize: 13, fontWeight: 700 }}>{maxTokens}</span>
              </div>
              <Slider label="" value={maxTokens} min={128} max={2048} step={64} onChange={setMaxTokens} />
            </div>

            <motion.button
              onClick={send}
              disabled={isLoading || !input.trim()}
              whileHover={!isLoading && input.trim() ? { scale: 1.02 } : {}}
              whileTap={!isLoading && input.trim() ? { scale: 0.98 } : {}}
              style={{
                width: "100%", padding: "11px", borderRadius: 10,
                background: isLoading || !input.trim() ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #F39C12, #FF5722)",
                border: "none",
                color: isLoading || !input.trim() ? "rgba(255,255,255,0.3)" : "white",
                fontWeight: 700, fontSize: 14, cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                fontFamily: "'Outfit', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: isLoading || !input.trim() ? "none" : "0 4px 16px rgba(243,156,18,0.35)",
                transition: "all 0.2s",
              }}
            >
              <Play size={15} />
              {isLoading ? "Đang chạy..." : "Gửi thử nghiệm"}
            </motion.button>
          </div>
        </div>

        {/* RIGHT PANE — Live chat */}
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #F1F5F9", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          {/* Chat header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0055A5,#00B4FF)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={15} color="white" />
              </div>
              <div>
                <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>Khung Chat Thử Nghiệm</div>
                <div style={{ color: "#94A3B8", fontSize: 11 }}>Session ID: {sessionId}</div>
              </div>
            </div>
            <button
              onClick={clearChat}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #E2E8F0", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#64748B", fontSize: 12, fontFamily: "'Outfit',sans-serif" }}
            >
              <RotateCcw size={12} /> Clear
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1, overflowY: "auto", padding: "16px",
              display: "flex", flexDirection: "column", gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#94A3B8", padding: "40px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🧪</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "#64748B" }}>Hộp cát (Sandbox) trống</div>
                <div style={{ fontSize: 13 }}>Nhập câu hỏi bên dưới để kiểm tra khả năng trả lời và trích xuất dữ liệu của AI</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
                  {["Gói cước TK135 có ưu đãi gì?", "eSIM MobiFone đăng ký thế nào?", "Đăng ký chuyển mạng giữ số"].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#475569", fontFamily: "'Outfit',sans-serif", transition: "all 0.2s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#0055A5"; el.style.color = "#0055A5"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = "#E2E8F0"; el.style.color = "#475569"; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0055A5,#00B4FF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>🤖</div>
                )}
                <div style={{ maxWidth: "75%" }}>
                  <div
                    style={
                      msg.role === "user"
                        ? { background: "linear-gradient(135deg,#0055A5,#0070D0)", color: "white", borderRadius: "16px 2px 16px 16px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.55 }
                        : { background: "#F8FAFC", color: "#1E293B", border: "1px solid #E2E8F0", borderRadius: "2px 16px 16px 16px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.6 }
                    }
                  >
                    {renderContent(msg.content)}
                  </div>
                  {msg.role === "assistant" && (msg.latency || msg.tokens) && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {msg.latency !== undefined && (
                        <span style={{ background: "#EFF6FF", color: "#0055A5", border: "1px solid #BFDBFE", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>
                          ⚡ {msg.latency}ms
                        </span>
                      )}
                      {msg.tokens !== undefined && (
                        <span style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>
                          📊 {msg.tokens} tokens
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#0055A5,#00B4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "2px 16px 16px 16px", padding: "10px 14px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#0055A5", opacity: 0.5, animation: "bounce-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi để test RAG pipeline..."
              style={{
                flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 10,
                padding: "9px 14px", fontSize: 13.5, outline: "none",
                color: "#1E293B", background: "#F8FAFC",
                transition: "border-color 0.2s, box-shadow 0.2s",
                fontFamily: "'Outfit', sans-serif",
              }}
              onFocus={e => { e.target.style.borderColor = "#0055A5"; e.target.style.boxShadow = "0 0 0 3px rgba(0,85,165,0.1)"; e.target.style.background = "white"; }}
              onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; e.target.style.background = "#F8FAFC"; }}
            />
            <motion.button
              onClick={send}
              disabled={isLoading || !input.trim()}
              whileTap={{ scale: 0.92 }}
              style={{
                width: 40, height: 40, borderRadius: 10,
                border: "none",
                background: input.trim() && !isLoading ? "linear-gradient(135deg,#0055A5,#00B4FF)" : "#E2E8F0",
                color: input.trim() && !isLoading ? "white" : "#94A3B8",
                cursor: input.trim() && !isLoading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: input.trim() && !isLoading ? "0 4px 12px rgba(0,85,165,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              <Send size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
