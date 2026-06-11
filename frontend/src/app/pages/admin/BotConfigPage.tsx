import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Save, RefreshCw, Check, Zap, MessageSquare, Target, Clock, Star, Plus, Trash2, Shield, Eye, EyeOff, Activity, User } from "lucide-react";
import { RobotAvatar } from "../../components/RobotAvatar";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

const DEFAULT_PERSONA = `Bạn là Mia — Chuyên viên tư vấn kinh doanh viễn thông của MobiFone với tâm lý bán hàng chuyên sâu.

PHONG CÁCH GIAO TIẾP:
- Thân thiện, nhiệt tình, tạo cảm giác được quan tâm cá nhân hóa
- Luôn gọi tên khách hàng sau khi biết
- Dùng emoji phù hợp (không quá nhiều)
- Tạo sự cấp bách nhẹ nhàng (còn X suất, kết thúc trong X giờ)
- Đưa ra bằng chứng xã hội (2 triệu khách hàng, bestseller)

MỤC TIÊU THU THẬP:
1. Tên khách hàng → Cá nhân hóa
2. Số điện thoại → Liên hệ lại
3. Mạng đang dùng → So sánh lợi ích
4. Nhu cầu (data/gọi/cả hai)
5. Ngân sách hàng tháng
6. Thời điểm phù hợp để gọi lại`;

const LEAD_FIELDS = [
  { key: "name", label: "Tên khách hàng", active: true, priority: 1 },
  { key: "phone", label: "Số điện thoại", active: true, priority: 2 },
  { key: "currentCarrier", label: "Mạng đang dùng", active: true, priority: 3 },
  { key: "usage", label: "Nhu cầu sử dụng", active: true, priority: 4 },
  { key: "budget", label: "Ngân sách/tháng", active: true, priority: 5 },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: value ? "#0055A5" : "#E2E8F0", position: "relative", transition: "background 0.2s" }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
    </button>
  );
}

export function BotConfigPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  // Model parameters state
  const [persona, setPersona] = useState(DEFAULT_PERSONA);
  const [temperature, setTemperature] = useState(0.4);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(512);

  // Channels credentials state
  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbVerifyToken, setFbVerifyToken] = useState("");
  const [fbPageToken, setFbPageToken] = useState("");

  const [zaloEnabled, setZaloEnabled] = useState(false);
  const [zaloAppId, setZaloAppId] = useState("");
  const [zaloSecretKey, setZaloSecretKey] = useState("");

  // UI state
  const [showFbSecret, setShowFbSecret] = useState(false);
  const [showZaloSecret, setShowZaloSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mock states for behavior triggers and lead fields (preserved for aesthetic layouts)
  const [fields, setFields] = useState(LEAD_FIELDS);
  const [settings, setSettings] = useState({
    urgencyMode: true,
    socialProof: true,
    namePersonalization: true,
    autoEscalate: true,
    leadScoring: true,
    followUpReminder: true,
  });

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  const loadConfig = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get("http://localhost:3000/chat/config", config);
      const data = response.data;
      if (data) {
        setPersona(data.system_prompt || DEFAULT_PERSONA);
        setTemperature(data.temperature !== undefined ? data.temperature : 0.4);
        setTopP(data.top_p !== undefined ? data.top_p : 0.9);
        setMaxTokens(data.max_tokens || 512);

        setFbEnabled(!!data.fb_enabled);
        setFbVerifyToken(data.fb_verify_token || "");
        setFbPageToken(data.fb_page_token || "");

        setZaloEnabled(!!data.zalo_enabled);
        setZaloAppId(data.zalo_app_id || "");
        setZaloSecretKey(data.zalo_secret_key || "");
      }
    } catch (error) {
      console.error("Lỗi khi tải cấu hình bot:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const payload = {
        system_prompt: persona,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        fb_enabled: fbEnabled,
        fb_verify_token: fbVerifyToken,
        fb_page_token: fbPageToken,
        zalo_enabled: zaloEnabled,
        zalo_app_id: zaloAppId,
        zalo_secret_key: zaloSecretKey,
      };

      await axios.post("http://localhost:3000/chat/config", payload, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error("Lỗi khi lưu cấu hình bot:", error);
      alert("Không thể lưu cấu hình. Vui lòng kiểm tra kết nối!");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục Persona Prompt về mặc định không?")) {
      setPersona(DEFAULT_PERSONA);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 12, color: "#64748B" }}>
        <Activity size={32} style={{ animation: "spin 2s linear infinite", color: "#0055A5" }} />
        <span style={{ fontWeight: 600 }}>Đang tải cấu hình Mia AI...</span>
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
    <div style={{ fontFamily: "'Outfit',sans-serif", display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Upper Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0055A5, #E4002B)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <Bot size={22} />
            </div>
            <div>
              <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 22, margin: 0 }}>Cấu hình Mia AI Agent</h1>
              <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>Hệ sinh thái Tri thức RAG & Tích hợp Kênh Phân phối Viễn thông MobiFone</p>
            </div>
          </div>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="gradient-btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", fontSize: 14, boxShadow: "0 8px 20px rgba(0, 85, 165, 0.25)" }}
        >
          {saved ? (
            <><Check size={16} /> Đã lưu cấu hình!</>
          ) : saving ? (
            <><Activity size={16} style={{ animation: "spin 1.5s linear infinite" }} /> Đang lưu...</>
          ) : (
            <><Save size={16} /> Lưu Thay đổi</>
          )}
        </motion.button>
      </div>

      {/* Main Configurations Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.20fr", gap: 20 }}>
        {/* LEFT COLUMN: Bot Core Brain & Parameters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Persona Avatar Live Card */}
          <div style={{ background: "linear-gradient(135deg, #0A1628, #0B2545)", borderRadius: 24, padding: 26, border: "1px solid rgba(0, 180, 255, 0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, boxShadow: "0 10px 30px rgba(10, 22, 40, 0.3)" }}>
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>MIA LIVE CORE AGENT</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(34, 197, 94, 0.15)", borderRadius: 10, padding: "4px 10px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E", display: "inline-block" }} />
                <span style={{ color: "#22C55E", fontSize: 11, fontWeight: 700 }}>Trực Tuyến</span>
              </div>
            </div>
            
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 12px 30px rgba(0, 180, 255, 0.4))", margin: "10px 0" }}
            >
              <RobotAvatar size={105} state="happy" />
            </motion.div>

            <div style={{ textAlign: "center" }}>
              <div style={{ color: "white", fontWeight: 900, fontSize: 20, letterSpacing: 0.5 }}>Mia AI Chatbot</div>
              <div style={{ color: "#38BDF8", fontSize: 13, fontWeight: 600, marginTop: 4 }}>Chuyên Viên Tư Vấn Viễn Thông MobiFone</div>
            </div>

            <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 6 }}>
              {[
                { label: "Mô hình Core LLM", value: "Qwen 2.5 (14B)", color: "#38BDF8" },
                { label: "Nhiệt độ (Temp)", value: temperature.toString(), color: "#FB923C" },
                { label: "Max Tokens", value: maxTokens.toString(), color: "#4ADE80" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 8px", textAlign: "center", backdropFilter: "blur(4px)" }}>
                  <div style={{ color: s.color, fontWeight: 900, fontSize: "1.1rem", marginBottom: 2 }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600 }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model AI Parameters Sliders */}
          <div className="admin-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Zap size={16} style={{ color: "#0055A5" }} />
              <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 16 }}>Tham số mô hình AI</div>
            </div>
            <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 20px 0" }}>Hiệu chỉnh tính sáng tạo và khối lượng từ ngữ phản hồi tối đa của Agent</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Temperature */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                  <span>Nhiệt độ (Temperature)</span>
                  <span style={{ color: "#0055A5", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "2px 8px", borderRadius: 6 }}>{temperature}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#0055A5", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 4 }}>
                  <span>Chính xác & Logic (0.1)</span>
                  <span>Sáng tạo & Đa dạng (1.0)</span>
                </div>
              </div>

              {/* Top P */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                  <span>Độ chọn lọc từ ngữ (Top P)</span>
                  <span style={{ color: "#0055A5", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "2px 8px", borderRadius: 6 }}>{topP}</span>
                </div>
                <input
                  type="range" min="0.1" max="1.0" step="0.05"
                  value={topP} onChange={e => setTopP(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#0055A5", cursor: "pointer" }}
                />
              </div>

              {/* Max Tokens */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
                  <span>Giới hạn từ tối đa (Max Tokens)</span>
                  <span style={{ color: "#0055A5", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "2px 8px", borderRadius: 6 }}>{maxTokens} từ</span>
                </div>
                <input
                  type="range" min="64" max="1024" step="64"
                  value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#0055A5", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Connection Channels & Strategy */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Telecom Channels Hub */}
          <div className="admin-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <MessageSquare size={16} style={{ color: "#E4002B" }} />
                <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 16 }}>Kênh truyền thông & Webhook</div>
              </div>
              <p style={{ color: "#64748B", fontSize: 12, margin: 0 }}>Kết nối chatbot với các kênh chính thống của MobiFone</p>
            </div>

            {/* Facebook Connection Card */}
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 16, padding: 18, background: fbEnabled ? "#F8FAFC" : "white", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#E8F0FE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1877F2", fontSize: 18, fontWeight: 900 }}>f</div>
                  <div>
                    <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>Tích hợp Facebook Messenger</div>
                    <div style={{ color: "#94A3B8", fontSize: 11 }}>Đồng bộ chatbot vào Fanpage của MobiFone</div>
                  </div>
                </div>
                <Toggle value={fbEnabled} onChange={setFbEnabled} />
              </div>

              <AnimatePresence>
                {fbEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", borderTop: "1px solid #F1F5F9", paddingTop: 12 }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>VERIFY TOKEN WEBHOOK</label>
                        <span
                          onClick={() => { navigator.clipboard.writeText(fbVerifyToken); alert("Đã copy Verify Token!"); }}
                          style={{ color: "#0055A5", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                        >
                          Sao chép
                        </span>
                      </div>
                      <input
                        type="text" value={fbVerifyToken} onChange={e => setFbVerifyToken(e.target.value)}
                        placeholder="Nhập verify token tự định nghĩa để verify với Facebook..."
                        style={{ width: "100%", boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", color: "#334155", fontFamily: "monospace" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>PAGE ACCESS TOKEN (TOKEN CỦA TRANG)</label>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 10px", background: "white" }}>
                        <input
                          type={showFbSecret ? "text" : "password"} value={fbPageToken} onChange={e => setFbPageToken(e.target.value)}
                          placeholder="Nhập token dài từ Facebook Developer portal (EAA...)"
                          style={{ flex: 1, border: "none", outline: "none", padding: "8px 0", fontSize: 12, color: "#334155", fontFamily: "monospace" }}
                        />
                        <button type="button" onClick={() => setShowFbSecret(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", padding: 0 }}>
                          {showFbSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ background: "#EFF6FF", border: "1.5px dashed #BFDBFE", borderRadius: 10, padding: "10px 12px", fontSize: 11, color: "#1E40AF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🔗 Callback URL: <strong>http://localhost:3000/facebook/webhook</strong></span>
                      <button
                        onClick={() => { navigator.clipboard.writeText("http://localhost:3000/facebook/webhook"); alert("Đã copy URL Facebook Webhook!"); }}
                        style={{ background: "#DBEAFE", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#1E40AF", cursor: "pointer" }}
                      >
                        Copy URL
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Zalo Connection Card */}
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 16, padding: 18, background: zaloEnabled ? "#F8FAFC" : "white", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#E0F2FE", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284C7", fontSize: 16, fontWeight: 900 }}>Z</div>
                  <div>
                    <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>Tích hợp Zalo Official Account</div>
                    <div style={{ color: "#94A3B8", fontSize: 11 }}>Cấu hình webhook phản hồi Zalo OA</div>
                  </div>
                </div>
                <Toggle value={zaloEnabled} onChange={setZaloEnabled} />
              </div>

              <AnimatePresence>
                {zaloEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", borderTop: "1px solid #F1F5F9", paddingTop: 12 }}
                  >
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>ZALO APP ID</label>
                      <input
                        type="text" value={zaloAppId} onChange={e => setZaloAppId(e.target.value)}
                        placeholder="Mã ID ứng dụng Zalo..."
                        style={{ width: "100%", boxSizing: "border-box", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", color: "#334155" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>ZALO APP SECRET KEY</label>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 10px", background: "white" }}>
                        <input
                          type={showZaloSecret ? "text" : "password"} value={zaloSecretKey} onChange={e => setZaloSecretKey(e.target.value)}
                          placeholder="Secret Key cấp từ Zalo Developer..."
                          style={{ flex: 1, border: "none", outline: "none", padding: "8px 0", fontSize: 12, color: "#334155", fontFamily: "monospace" }}
                        />
                        <button type="button" onClick={() => setShowZaloSecret(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", padding: 0 }}>
                          {showZaloSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ background: "#EFF6FF", border: "1.5px dashed #BFDBFE", borderRadius: 10, padding: "10px 12px", fontSize: 11, color: "#1E40AF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🔗 Callback URL: <strong>http://localhost:3000/zalo/webhook</strong></span>
                      <button
                        onClick={() => { navigator.clipboard.writeText("http://localhost:3000/zalo/webhook"); alert("Đã copy URL Zalo Webhook!"); }}
                        style={{ background: "#DBEAFE", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#1E40AF", cursor: "pointer" }}
                      >
                        Copy URL
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sales Psychological Strategy Triggers */}
          <div className="admin-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Target size={16} style={{ color: "#E4002B" }} />
              <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 16 }}>Kỹ thuật chốt đơn AI (Sales Strategy)</div>
            </div>
            <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 16px 0" }}>Kích hoạt các kỹ năng tâm lý tiếp cận khách hàng tự động</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "urgencyMode", icon: Clock, label: "Tạo cảm giác khẩn cấp (Scarcity)", desc: "Ví dụ: \"Chỉ còn 3 suất khuyến mãi cuối cùng\"" },
                { key: "socialProof", icon: Star, label: "Bằng chứng cộng đồng (Social Proof)", desc: "Ví dụ: \"23,000 người đã tin dùng và đăng ký\"" },
                { key: "namePersonalization", icon: User, label: "Cá nhân hóa theo tên", desc: "Luôn tìm và xưng hô bằng tên riêng khách hàng" },
                { key: "autoEscalate", icon: Zap, label: "Tự động chuyển nhân viên", desc: "Đẩy thẳng sang chat trực tiếp khi gặp ca khó" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={14} style={{ color: "#0055A5" }} />
                      </div>
                      <div>
                        <div style={{ color: "#334155", fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                        <div style={{ color: "#64748B", fontSize: 11 }}>{item.desc}</div>
                      </div>
                    </div>
                    <Toggle value={settings[item.key as keyof typeof settings]} onChange={v => setSettings(p => ({ ...p, [item.key]: v }))} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: Lead Capture Fields & Persona Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20 }}>
        {/* Lead Capture Fields Config */}
        <div className="admin-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Shield size={16} style={{ color: "#0055A5" }} />
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 16 }}>Dữ liệu phễu cần thu thập</div>
          </div>
          <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 16px 0" }}>Mia AI sẽ khéo léo lấy các thông tin này trong cuộc trò chuyện tự nhiên</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fields.map((f, i) => (
              <div
                key={f.key}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: f.active ? "rgba(0, 85, 165, 0.03)" : "#F8FAFC",
                  border: `1.5px solid ${f.active ? "#93C5FD" : "#E2E8F0"}`,
                  borderRadius: 12, padding: "10px 14px",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: f.active ? "#0055A5" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontSize: 10, fontWeight: 900 }}>{f.priority}</span>
                </div>
                <div style={{ flex: 1, color: "#334155", fontWeight: 700, fontSize: 13 }}>{f.label}</div>
                <Toggle value={f.active} onChange={v => setFields(prev => prev.map((fi, idx) => idx === i ? { ...fi, active: v } : fi))} />
              </div>
            ))}
          </div>
        </div>

        {/* System Prompt Workspace */}
        <div style={{ background: "#0E1B2E", borderRadius: 24, padding: 24, border: "1px solid rgba(0, 180, 255, 0.15)", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 10px 30px rgba(14, 27, 46, 0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "white", fontWeight: 900, fontSize: 16 }}>RAG System Persona System Prompt</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>Định dạng tính cách, luật tương tác và hành vi chốt đơn viễn thông</div>
            </div>
            <button
              onClick={handleReset}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            >
              <RefreshCw size={12} /> Khôi phục mặc định
            </button>
          </div>
          
          <div style={{ position: "relative", width: "100%" }}>
            <textarea
              value={persona}
              onChange={e => setPersona(e.target.value)}
              rows={12}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(10, 22, 40, 0.6)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: 14, padding: "16px 18px",
                fontSize: 13, color: "#38BDF8",
                fontFamily: "'Fira Code', 'Courier New', monospace",
                resize: "vertical", outline: "none",
                lineHeight: 1.6,
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)"
              }}
            />
            <div style={{ position: "absolute", bottom: 10, right: 10, color: "rgba(255,255,255,0.25)", fontSize: 10, pointerEvents: "none", fontWeight: 600 }}>
              UTF-8 Mode · {persona.length} kí tự
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
