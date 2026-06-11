import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bot, Save, RefreshCw, Check, Zap, MessageSquare, Target, Clock, Star, Plus, Trash2, Shield, Eye, EyeOff, Activity } from "lucide-react";
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
    <div style={{ fontFamily: "'Outfit',sans-serif", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 22, marginBottom: 2 }}>Cấu hình Mia AI & Kết nối Kênh</h1>
          <p style={{ color: "#64748B", fontSize: 13 }}>Tùy chỉnh prompt hệ sinh thái RAG, tham số mô hình LLM và thông số kỹ thuật webhook Zalo, Facebook</p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 12, border: "none", background: saved ? "#22C55E" : "linear-gradient(135deg,#F39C12,#FF5722)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Outfit',sans-serif", boxShadow: `0 4px 16px ${saved ? "rgba(34,197,94,0.4)" : "rgba(243,156,18,0.4)"}`, opacity: saving ? 0.7 : 1, transition: "all 0.3s" }}
        >
          {saved ? <><Check size={15} /> Đã lưu!</> : saving ? <><Activity size={15} style={{ animation: "spin 2s linear infinite" }} /> Đang lưu...</> : <><Save size={15} /> Lưu cấu hình</>}
        </motion.button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Robot preview & Parameters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "linear-gradient(145deg,#001F3F,#003466)", borderRadius: 20, padding: 24, border: "1px solid rgba(0,180,255,0.15)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>PREVIEW NHÂN VẬT</div>
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 8px 24px rgba(0,85,165,0.5))" }}
            >
              <RobotAvatar size={100} state="happy" />
            </motion.div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Mia</div>
              <div style={{ color: "#60B4FF", fontSize: 13 }}>AI Sales Consultant</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", marginTop: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E" }} />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Online · Đang trực tuyến</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              {[
                { label: "Mô hình LLM", value: "Qwen 2.5", color: "#60B4FF" },
                { label: "Nhiệt độ (Temp)", value: temperature.toString(), color: "#F39C12" },
                { label: "Token tối đa", value: maxTokens.toString(), color: "#22C55E" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ color: s.color, fontWeight: 900, fontSize: "1.05rem" }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model parameters sliders */}
          <div style={{ background: "white", borderRadius: 20, padding: 22, border: "1.5px solid #F1F5F9" }}>
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Tham số mô hình AI</div>
            <div style={{ color: "#94A3B8", fontSize: 12, marginBottom: 18 }}>Điều chỉnh độ sáng tạo và giới hạn của câu trả lời chatbot</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Temperature */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  <span>Độ sáng tạo (Temperature)</span>
                  <span style={{ color: "#0055A5" }}>{temperature}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#0055A5" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                  <span>Chính xác & Thực tế (0.1)</span>
                  <span>Sáng tạo & Bay bổng (1.0)</span>
                </div>
              </div>

              {/* Top P */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  <span>Độ đa dạng (Top P)</span>
                  <span style={{ color: "#0055A5" }}>{topP}</span>
                </div>
                <input
                  type="range" min="0.1" max="1.0" step="0.05"
                  value={topP} onChange={e => setTopP(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#0055A5" }}
                />
              </div>

              {/* Max Tokens */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  <span>Độ dài tối đa (Max Tokens)</span>
                  <span style={{ color: "#0055A5" }}>{maxTokens} từ</span>
                </div>
                <input
                  type="range" min="64" max="1024" step="64"
                  value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#0055A5" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channels configuration credentials */}
        <div style={{ background: "white", borderRadius: 20, padding: 22, border: "1.5px solid #F1F5F9", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Kênh tích hợp Chat</div>
            <div style={{ color: "#94A3B8", fontSize: 12 }}>Kết nối chatbot với các nền tảng mạng xã hội lớn</div>
          </div>

          {/* Facebook integration card */}
          <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E8F0FE", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#1877F2", fontSize: 18, fontWeight: 800 }}>f</div>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>Tích hợp Facebook Messenger</div>
                  <div style={{ color: "#94A3B8", fontSize: 11 }}>Cấu hình webhook nhận sự kiện tin nhắn từ Fanpage</div>
                </div>
              </div>
              <Toggle value={fbEnabled} onChange={setFbEnabled} />
            </div>

            {fbEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>VERIFY TOKEN (Dùng cấu hình webhook Fanpage)</label>
                  <input
                    type="text" value={fbVerifyToken} onChange={e => setFbVerifyToken(e.target.value)}
                    placeholder="Nhập verify token tùy ý..."
                    style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", color: "#334155", fontFamily: "monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>PAGE ACCESS TOKEN</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 10px", background: "white" }}>
                    <input
                      type={showFbSecret ? "text" : "password"} value={fbPageToken} onChange={e => setFbPageToken(e.target.value)}
                      placeholder="EAA..."
                      style={{ flex: 1, border: "none", outline: "none", padding: "8px 0", fontSize: 12, color: "#334155", fontFamily: "monospace" }}
                    />
                    <button type="button" onClick={() => setShowFbSecret(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", padding: 0 }}>
                      {showFbSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div style={{ background: "#F8FAFC", border: "1.5px dashed #E2E8F0", borderRadius: 8, padding: 10, fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                  🔗 Webhook URL của bạn: <strong style={{ color: "#0F172A" }}>http://localhost:3000/facebook/webhook</strong>
                </div>
              </motion.div>
            )}
          </div>

          {/* Zalo integration card */}
          <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E0F2FE", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#0284C7", fontSize: 15, fontWeight: 900 }}>Z</div>
                <div>
                  <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 14 }}>Tích hợp Zalo Official Account (OA)</div>
                  <div style={{ color: "#94A3B8", fontSize: 11 }}>Cấu hình webhook nhận sự kiện tin nhắn từ Zalo OA</div>
                </div>
              </div>
              <Toggle value={zaloEnabled} onChange={setZaloEnabled} />
            </div>

            {zaloEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>ZALO APP ID</label>
                  <input
                    type="text" value={zaloAppId} onChange={e => setZaloAppId(e.target.value)}
                    placeholder="Nhập ID ứng dụng Zalo..."
                    style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", color: "#334155" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4 }}>ZALO APP SECRET KEY</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "0 10px", background: "white" }}>
                    <input
                      type={showZaloSecret ? "text" : "password"} value={zaloSecretKey} onChange={e => setZaloSecretKey(e.target.value)}
                      placeholder="Nhập Secret Key..."
                      style={{ flex: 1, border: "none", outline: "none", padding: "8px 0", fontSize: 12, color: "#334155", fontFamily: "monospace" }}
                    />
                    <button type="button" onClick={() => setShowZaloSecret(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", padding: 0 }}>
                      {showZaloSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div style={{ background: "#F8FAFC", border: "1.5px dashed #E2E8F0", borderRadius: 8, padding: 10, fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                  🔗 Webhook URL của bạn: <strong style={{ color: "#0F172A" }}>http://localhost:3000/zalo/webhook</strong>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Behavior triggers & Lead fields (Aesthetic placeholders) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "white", borderRadius: 20, padding: 22, border: "1.5px solid #F1F5F9" }}>
          <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Chiến lược bán hàng</div>
          <div style={{ color: "#94A3B8", fontSize: 12, marginBottom: 18 }}>Bật/tắt các kỹ thuật tâm lý kinh doanh của Mia</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "urgencyMode", icon: Clock, label: "Tạo cảm giác khan hiếm", desc: "\"Còn 127 suất, kết thúc trong 3h\"" },
              { key: "socialProof", icon: Star, label: "Bằng chứng xã hội", desc: "\"2 triệu khách hàng đang dùng\"" },
              { key: "namePersonalization", icon: User, label: "Cá nhân hóa theo tên", desc: "Gọi tên khách trong mọi tin nhắn" },
              { key: "autoEscalate", icon: Zap, label: "Tự động chuyển nhân viên", desc: "Khi khách hàng cần xử lý phức tạp" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} style={{ color: "#64748B" }} />
                    </div>
                    <div>
                      <div style={{ color: "#0F172A", fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                      <div style={{ color: "#94A3B8", fontSize: 11 }}>{item.desc}</div>
                    </div>
                  </div>
                  <Toggle value={settings[item.key as keyof typeof settings]} onChange={v => setSettings(p => ({ ...p, [item.key]: v }))} />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 20, padding: 22, border: "1.5px solid #F1F5F9", display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#0F172A", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Trường dữ liệu Lead cần thu thập</div>
          <div style={{ color: "#94A3B8", fontSize: 12, marginBottom: 16 }}>Mia sẽ hỏi khéo léo để thu thập các thông tin này trong hội thoại tự nhiên</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
            {fields.map((f, i) => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, background: f.active ? "#F0FDF4" : "#FAFAFA", border: `1.5px solid ${f.active ? "#BBF7D0" : "#E2E8F0"}`, borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: f.active ? "#22C55E" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{f.priority}</span>
                </div>
                <div style={{ flex: 1, color: "#0F172A", fontWeight: 600, fontSize: 13 }}>{f.label}</div>
                <Toggle value={f.active} onChange={v => setFields(prev => prev.map((fi, idx) => idx === i ? { ...fi, active: v } : fi))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Persona Prompt area */}
      <div style={{ background: "#0A1628", borderRadius: 20, padding: 22, border: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 15, marginBottom: 2 }}>RAG System Persona Prompt</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Định nghĩa nhân vật, luật trả lời và phong cách của Mia trong hệ thống RAG</div>
          </div>
          <button onClick={handleReset} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            <RefreshCw size={12} /> Reset về mặc định
          </button>
        </div>
        <textarea
          value={persona}
          onChange={e => setPersona(e.target.value)}
          rows={10}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#94D4FF", fontFamily: "'Courier New', monospace", resize: "vertical", outline: "none", lineHeight: 1.7, boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}
