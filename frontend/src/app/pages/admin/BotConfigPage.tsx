import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Save, RefreshCw, Check, Zap, MessageSquare, Target, Clock, Star, Plus, Trash2, Shield, Eye, EyeOff, Activity, User, Link2, Upload, FileText, ExternalLink, FileCode, Code2, Copy, CheckCheck, Globe, Palette, Sparkles } from "lucide-react";
import { RobotAvatar } from "../../components/RobotAvatar";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { API_BASE } from "../../../config";

const DEFAULT_PERSONA = `Bạn là Mia — Chuyên viên tư vấn kinh doanh viễn thông của MobiFone với tâm lý bán hàng chuyên sâu.

PHONG CÁCH GIAO TIẾP:
- Thân thiện, nhiệt tình, tạo cảm giác được quan tâm cá nhân hóa
- Luôn gọi tên khách hàng sau khi biết
- Minh bạch giá cước & chu kỳ: Giới thiệu rõ ràng cơ chế đóng cước trước và số tháng được tặng thêm ngay từ đầu.
- Tự động kiểm soát nguyên tắc Grounding: Chỉ tư vấn gói cước có trong dữ liệu tài liệu chính thức. Nếu cơ sở dữ liệu rỗng, thông báo từ chối bịa đặt và đề nghị khách hàng để lại SĐT.
- Tạo sự cấp bách nhẹ nhàng và đưa ra bằng chứng xã hội.

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
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full border-none cursor-pointer relative transition-all duration-200 ease-in-out outline-none ${
        value ? "bg-[#0055A5]" : "bg-slate-200"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-200 ease-in-out shadow-xs ${
          value ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export function BotConfigPage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState("persona");

  // Model parameters state
  const [persona, setPersona] = useState(DEFAULT_PERSONA);
  const [temperature, setTemperature] = useState(0.4);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(512);

  // Channels credentials state
  const [fbEnabled, setFbEnabled] = useState(false);
  const [fbVerifyToken, setFbVerifyToken] = useState("");
  const [fbPageToken, setFbPageToken] = useState("");
  const [fbPageId, setFbPageId] = useState("");

  const [zaloEnabled, setZaloEnabled] = useState(false);
  const [zaloAppId, setZaloAppId] = useState("");
  const [zaloSecretKey, setZaloSecretKey] = useState("");
  const [zaloAccessToken, setZaloAccessToken] = useState("");
  const [zaloRefreshToken, setZaloRefreshToken] = useState("");
  const [zaloOaId, setZaloOaId] = useState("");

  // Widget embed customization states
  const [widgetBotName, setWidgetBotName] = useState("Mia - Chuyên viên MobiFone");
  const [widgetThemeColor, setWidgetThemeColor] = useState("#005BAA");
  const [widgetPosition, setWidgetPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [widgetGreeting, setWidgetGreeting] = useState("Xin chào! Mia là Chuyên viên CSKH số của MobiFone. Mia có thể hỗ trợ gì cho bạn hôm nay?");
  const [widgetAutoOpen, setWidgetAutoOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // UI state
  const [showFbSecret, setShowFbSecret] = useState(false);
  const [showZaloSecret, setShowZaloSecret] = useState(false);
  const [showZaloAccessToken, setShowZaloAccessToken] = useState(false);
  const [showZaloRefreshToken, setShowZaloRefreshToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mock states for behavior triggers and lead fields
  const [fields, setFields] = useState(LEAD_FIELDS);
  const [settings, setSettings] = useState({
    urgencyMode: true,
    socialProof: true,
    namePersonalization: true,
    autoEscalate: true,
    leadScoring: true,
    followUpReminder: true,
  });

  // Zalo Verifier states
  const [verifierFiles, setVerifierFiles] = useState<Array<{ filename: string; size: number; updatedAt: string; content: string; url: string }>>([]);
  const [verifierMode, setVerifierMode] = useState<"upload" | "manual">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualFilename, setManualFilename] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [uploadingVerifier, setUploadingVerifier] = useState(false);

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
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get(`${API_BASE}/chat/config`, config);
      const data = response.data;
      if (data) {
        setPersona(data.system_prompt || DEFAULT_PERSONA);
        setTemperature(data.temperature !== undefined ? data.temperature : 0.4);
        setTopP(data.top_p !== undefined ? data.top_p : 0.9);
        setMaxTokens(data.max_tokens || 512);

        setFbEnabled(!!data.fb_enabled);
        setFbVerifyToken(data.fb_verify_token || "");
        setFbPageToken(data.fb_page_token || "");
        setFbPageId(data.fb_page_id || "");

        setZaloEnabled(!!data.zalo_enabled);
        setZaloAppId(data.zalo_app_id || "");
        setZaloSecretKey(data.zalo_secret_key || "");
        setZaloAccessToken(data.zalo_access_token || "");
        setZaloRefreshToken(data.zalo_refresh_token || "");
        setZaloOaId(data.zalo_oa_id || "");
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
        fb_page_id: fbPageId,
        zalo_enabled: zaloEnabled,
        zalo_app_id: zaloAppId,
        zalo_secret_key: zaloSecretKey,
        zalo_access_token: zaloAccessToken,
        zalo_refresh_token: zaloRefreshToken,
        zalo_oa_id: zaloOaId,
      };

      await axios.post(`${API_BASE}/chat/config`, payload, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error("Lỗi khi lưu cấu hình bot:", error);
      alert("Không thể lưu cấu hình. Vui lòng kiểm tra kết nối!");
    } finally {
      setSaving(false);
    }
  };

  const fetchVerifierFiles = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/zalo_verifier/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setVerifierFiles(res.data.files || []);
      }
    } catch (_) {}
  };

  const handleUploadZaloVerifier = async () => {
    if (!token) return;
    setUploadingVerifier(true);
    try {
      if (verifierMode === "upload") {
        if (!selectedFile) {
          alert("Vui lòng chọn file .html để tải lên!");
          setUploadingVerifier(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await axios.post(`${API_BASE}/zalo_verifier/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.data?.success) {
          alert(`Thành công: ${res.data.message || "Đã lưu file xác thực trên Server!"}`);
          setSelectedFile(null);
          fetchVerifierFiles();
        }
      } else {
        if (!manualFilename) {
          alert("Vui lòng nhập Tên file (ví dụ: zalo_verifier3879828502555234376.html)!");
          setUploadingVerifier(false);
          return;
        }
        const res = await axios.post(
          `${API_BASE}/zalo_verifier/upload`,
          { filename: manualFilename, content: manualContent },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.success) {
          alert(`Thành công: ${res.data.message || "Đã lưu file xác thực trên Server!"}`);
          setManualFilename("");
          setManualContent("");
          fetchVerifierFiles();
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi lưu file xác thực Zalo!");
    } finally {
      setUploadingVerifier(false);
    }
  };

  const handleDeleteZaloVerifier = async (filename: string) => {
    if (!token || !confirm(`Bạn có chắc chắn muốn xóa file ${filename}?`)) return;
    try {
      const res = await axios.delete(`${API_BASE}/zalo_verifier/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        alert("Đã xóa file xác thực thành công!");
        fetchVerifierFiles();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể xóa file!");
    }
  };

  const handleReset = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục Persona Prompt về mặc định không?")) {
      setPersona(DEFAULT_PERSONA);
    }
  };

  useEffect(() => {
    loadConfig();
    fetchVerifierFiles();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-3 text-slate-400 font-outfit">
        <Activity size={32} className="animate-spin text-[#0055A5]" />
        <span className="font-bold text-sm">Đang tải cấu hình Mia AI...</span>
      </div>
    );
  }

  return (
    <div className="font-outfit flex flex-col gap-6 pb-12">
      {/* Upper Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <RobotAvatar size={40} />
          </div>
          <div>
            <h1 className="text-[#0F172A] font-black text-xl tracking-tight">Cấu hình Mia AI Agent</h1>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">Hệ sinh thái Tri thức RAG & Tích hợp Kênh Phân phối Viễn thông MobiFone</p>
          </div>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="gradient-btn-primary flex items-center gap-2 px-6 py-3 text-xs font-black tracking-wider uppercase shadow-lg shadow-blue-500/20"
        >
          {saved ? (
            <><Check size={14} /> Đã lưu cấu hình!</>
          ) : saving ? (
            <><Activity size={14} className="animate-spin" /> Đang lưu...</>
          ) : (
            <><Save size={14} /> Lưu Thay đổi</>
          )}
        </motion.button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-100/80 p-1 rounded-2xl flex flex-wrap gap-1 w-fit border border-slate-200/40 mb-6">
        {[
          { id: "persona", label: "Nhân dạng & Lời thoại", icon: Bot },
          { id: "channels", label: "Kênh truyền thông & Webhook", icon: MessageSquare },
          { id: "widget", label: "Mã nhúng Website (Embed Widget)", icon: Code2 },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer border-none outline-none ${
                active
                  ? "bg-white text-[#0055A5] shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Configurations Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "persona" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* LEFT COLUMN: Avatar & Leads (4/12 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* Persona Avatar Live Card */}
                <div className="bg-gradient-to-br from-[#0A1628] to-[#0B2545] rounded-3xl p-6 border border-[#00B4FF]/20 flex flex-col justify-between items-center gap-4 shadow-xl shadow-slate-950/20 min-h-[320px]">
                  <div className="w-full flex justify-between items-center">
                    <span className="text-white/40 text-[9px] font-black tracking-widest uppercase">Mia Live Core Agent</span>
                    <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22C55E]" />
                      <span className="text-emerald-400 text-[10px] font-bold">Trực Tuyến</span>
                    </div>
                  </div>
                  
                  <motion.div
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="filter drop-shadow-[0_12px_24px_rgba(0,180,255,0.3)] my-2"
                  >
                    <RobotAvatar size={90} state="happy" />
                  </motion.div>

                  <div className="text-center">
                    <div className="text-white font-black text-base tracking-wide">Mia AI Chatbot</div>
                    <div className="text-[#38BDF8] text-xs font-bold mt-1">Chuyên Viên Tư Vấn Viễn Thông MobiFone</div>
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    {[
                      { label: "Core LLM", value: "Qwen 2.5", color: "text-[#38BDF8]" },
                      { label: "Kịch bản RAG", value: "Active", color: "text-emerald-400" },
                      { label: "Độ trễ", value: "~1.2s", color: "text-amber-400" },
                    ].map(s => (
                      <div key={s.label} className="flex-1 bg-white/5 border border-white/5 rounded-2xl py-2 px-1 text-center backdrop-blur-xs">
                        <div className={`font-black text-xs mb-0.5 ${s.color}`}>{s.value}</div>
                        <div className="text-white/45 text-[8px] font-bold tracking-wider uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Capture Fields Config */}
                <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={16} className="text-[#0055A5]" />
                      <div className="text-slate-800 font-extrabold text-sm uppercase tracking-wide">Dữ liệu phễu thu thập</div>
                    </div>
                    <p className="text-slate-400 text-[11px] font-semibold mb-4">Lấy thông tin khéo léo trong cuộc trò chuyện</p>

                    <div className="flex flex-col gap-2">
                      {fields.map((f, i) => (
                        <div
                          key={f.key}
                          className={`flex items-center gap-3 border rounded-xl px-3.5 py-2 transition-all duration-200 ${
                            f.active ? "bg-[#0055A5]/3 border-[#0055A5]/25" : "bg-slate-50 border-slate-200/60"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-black ${
                            f.active ? "bg-[#0055A5]" : "bg-slate-400"
                          }`}>
                            {f.priority}
                          </div>
                          <div className="flex-1 text-slate-700 font-bold text-xs">{f.label}</div>
                          <Toggle value={f.active} onChange={v => setFields(prev => prev.map((fi, idx) => idx === i ? { ...fi, active: v } : fi))} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Prompt Editor (8/12 cols) */}
              <div className="lg:col-span-8 bg-[#0E1B2E] rounded-3xl p-6 border border-[#00B4FF]/15 flex flex-col gap-4 shadow-xl shadow-slate-950/20 justify-between">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <div className="text-white font-extrabold text-sm">RAG System Persona System Prompt</div>
                    <div className="text-white/40 text-xs font-semibold mt-0.5">Định dạng tính cách, luật tương tác và hành vi chốt đơn</div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw size={11} /> Khôi phục
                  </button>
                </div>
                
                <div className="relative w-full flex-1 flex flex-col">
                  <textarea
                    value={persona}
                    onChange={e => setPersona(e.target.value)}
                    className="w-full flex-1 box-border bg-[#0A1628]/60 border border-[#38BDF8]/30 rounded-2xl p-4 text-xs text-[#38BDF8] font-mono resize-none outline-none leading-relaxed shadow-inner h-[500px]"
                  />
                  <div className="absolute bottom-3 right-4 text-white/30 text-[9px] pointer-events-none font-bold">
                    UTF-8 Mode · {persona.length} kí tự
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "channels" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Facebook Connection Card */}
              <div className={`bg-white rounded-3xl border p-6 shadow-xs transition-all duration-200 ${fbEnabled ? "border-[#0055A5]/35 bg-slate-50/20" : "border-slate-200/60"}`}>
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1877F2] font-black text-xl">f</div>
                    <div>
                      <div className="text-slate-800 font-extrabold text-sm">Tích hợp Facebook Messenger</div>
                      <div className="text-slate-400 text-xs font-semibold mt-0.5">Đồng bộ chatbot vào Fanpage MobiFone</div>
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
                      className="flex flex-col gap-4 overflow-hidden border-t border-slate-100 pt-4"
                    >
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Verify Token Webhook</label>
                          <span
                            onClick={() => { navigator.clipboard.writeText(fbVerifyToken); alert("Đã copy Verify Token!"); }}
                            className="text-[#0055A5] text-[10px] font-bold cursor-pointer hover:underline"
                          >
                            Sao chép
                          </span>
                        </div>
                        <input
                          type="text" value={fbVerifyToken} onChange={e => setFbVerifyToken(e.target.value)}
                          placeholder="Nhập verify token tự định nghĩa..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white outline-none focus:border-[#0055A5]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Page Access Token</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 py-1 bg-white focus-within:border-[#0055A5]">
                          <input
                            type={showFbSecret ? "text" : "password"} value={fbPageToken} onChange={e => setFbPageToken(e.target.value)}
                            placeholder="Page Token từ FB Developer..."
                            className="flex-1 border-none outline-none py-1.5 text-xs text-slate-700 font-mono"
                          />
                          <button type="button" onClick={() => setShowFbSecret(p => !p)} className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-500">
                            {showFbSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Facebook Page ID</label>
                        <input
                          type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)}
                          placeholder="Mã Page ID của Facebook Fanpage..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white outline-none focus:border-[#0055A5]"
                        />
                      </div>
                      <div className="bg-blue-50/70 border border-dashed border-blue-200 rounded-xl p-3.5 text-[11px] text-blue-700 flex flex-col gap-1.5 mt-2">
                        {(() => {
                          const base = API_BASE.startsWith("http") ? API_BASE : `${window.location.origin}${API_BASE.startsWith("/") ? "" : "/"}${API_BASE}`;
                          const url = `${base}/chat/webhook/facebook`;
                          return (
                            <>
                              <div className="font-semibold break-all flex items-center gap-1.5"><Link2 size={13} className="text-blue-600 shrink-0" /> URL: <strong className="font-bold">{url}</strong></div>
                              <button
                                onClick={() => { navigator.clipboard.writeText(url); alert("Đã copy URL Facebook Webhook!"); }}
                                className="bg-blue-100 hover:bg-blue-200 border-none rounded-lg py-1.5 text-[10px] font-black text-blue-800 cursor-pointer w-full text-center"
                              >
                                Copy URL
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Zalo Connection Card */}
              <div className={`bg-white rounded-3xl border p-6 shadow-xs transition-all duration-200 ${zaloEnabled ? "border-[#0055A5]/35 bg-slate-50/20" : "border-slate-200/60"}`}>
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-[#0284C7] font-black text-xl">Z</div>
                    <div>
                      <div className="text-slate-800 font-extrabold text-sm">Tích hợp Zalo Official Account</div>
                      <div className="text-slate-400 text-xs font-semibold mt-0.5">Cấu hình webhook phản hồi Zalo OA</div>
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
                      className="flex flex-col gap-4 overflow-hidden border-t border-slate-100 pt-4"
                    >
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Zalo App ID</label>
                        <input
                          type="text" value={zaloAppId} onChange={e => setZaloAppId(e.target.value)}
                          placeholder="Mã ID ứng dụng Zalo..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white outline-none focus:border-[#0055A5]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Zalo Official Account ID (OA ID)</label>
                        <input
                          type="text" value={zaloOaId} onChange={e => setZaloOaId(e.target.value)}
                          placeholder="Nhập Zalo OA ID..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white outline-none focus:border-[#0055A5]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Zalo App Secret Key</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 py-1 bg-white focus-within:border-[#0055A5]">
                          <input
                            type={showZaloSecret ? "text" : "password"} value={zaloSecretKey} onChange={e => setZaloSecretKey(e.target.value)}
                            placeholder="Secret Key cấp từ Zalo..."
                            className="flex-1 border-none outline-none py-1.5 text-xs text-slate-700 font-mono"
                          />
                          <button type="button" onClick={() => setShowZaloSecret(p => !p)} className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-500">
                            {showZaloSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Zalo Access Token</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 py-1 bg-white focus-within:border-[#0055A5]">
                          <input
                            type={showZaloAccessToken ? "text" : "password"} value={zaloAccessToken} onChange={e => setZaloAccessToken(e.target.value)}
                            placeholder="Access Token cấp từ Zalo..."
                            className="flex-1 border-none outline-none py-1.5 text-xs text-slate-700 font-mono"
                          />
                          <button type="button" onClick={() => setShowZaloAccessToken(p => !p)} className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-500">
                            {showZaloAccessToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block mb-1.5">Zalo Refresh Token</label>
                        <div className="flex items-center border border-slate-200 rounded-lg px-3 py-1 bg-white focus-within:border-[#0055A5]">
                          <input
                            type={showZaloRefreshToken ? "text" : "password"} value={zaloRefreshToken} onChange={e => setZaloRefreshToken(e.target.value)}
                            placeholder="Refresh Token cấp từ Zalo..."
                            className="flex-1 border-none outline-none py-1.5 text-xs text-slate-700 font-mono"
                          />
                          <button type="button" onClick={() => setShowZaloRefreshToken(p => !p)} className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-500">
                            {showZaloRefreshToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="bg-blue-50/70 border border-dashed border-blue-200 rounded-xl p-3.5 text-[11px] text-blue-700 flex flex-col gap-1.5 mt-2">
                        {(() => {
                          const base = API_BASE.startsWith("http") ? API_BASE : `${window.location.origin}${API_BASE.startsWith("/") ? "" : "/"}${API_BASE}`;
                          const url = `${base}/chat/webhook/zalo`;
                          return (
                            <>
                              <div className="font-semibold break-all">🔗 URL: <strong className="font-bold">{url}</strong></div>
                              <button
                                onClick={() => { navigator.clipboard.writeText(url); alert("Đã copy URL Zalo Webhook!"); }}
                                className="bg-blue-100 hover:bg-blue-200 border-none rounded-lg py-1.5 text-[10px] font-black text-blue-800 cursor-pointer w-full text-center"
                              >
                                Copy URL
                              </button>
                            </>
                          );
                        })()}
                      </div>

                      {/* Sub-card: Xác thực Domain Zalo (HTML Verification File) */}
                      <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <FileCode size={15} className="text-sky-600" />
                            Xác thực Domain Zalo (HTML File)
                          </div>
                          <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">Web & Server</span>
                        </div>

                        <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                          💡 Tải file <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800 font-mono text-[10px]">zalo_verifier....html</code> từ Zalo Developer lên Server để Zalo quét xác thực tên miền.
                        </div>

                        {/* Chế độ chọn */}
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setVerifierMode("upload")}
                            className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer transition-all ${
                              verifierMode === "upload" ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200"
                            }`}
                          >
                            <Upload size={12} className="inline mr-1" /> Tải file .html
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerifierMode("manual")}
                            className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer transition-all ${
                              verifierMode === "manual" ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200"
                            }`}
                          >
                            <FileText size={12} className="inline mr-1" /> Nhập tên & mã
                          </button>
                        </div>

                        {verifierMode === "upload" ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept=".html"
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  setSelectedFile(e.target.files[0]);
                                }
                              }}
                              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                            />
                            {selectedFile && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                File chọn: <strong>{selectedFile.name}</strong> ({selectedFile.size} bytes)
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={manualFilename}
                              onChange={e => setManualFilename(e.target.value)}
                              placeholder="Tên file (vd: zalo_verifier3879828502555234376.html)"
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700"
                            />
                            <textarea
                              value={manualContent}
                              onChange={e => setManualContent(e.target.value)}
                              placeholder="Nội dung mã xác thực (nếu trống sẽ lấy mã từ tên file)"
                              rows={2}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 resize-none"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleUploadZaloVerifier}
                          disabled={uploadingVerifier}
                          className="bg-[#0055A5] hover:bg-[#004485] text-white border-none rounded-xl py-2 px-4 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                        >
                          {uploadingVerifier ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                          Lưu file xác thực lên Server
                        </button>

                        {/* Danh sách file verifier đã lưu trên Server */}
                        {verifierFiles.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">File xác thực đang có trên Server:</div>
                            {verifierFiles.map(f => {
                              const fullUrl = `${window.location.origin}${f.url}`;
                              return (
                                <div key={f.filename} className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
                                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                                    <FileCode size={14} className="text-sky-600 shrink-0" />
                                    <span className="font-mono font-bold text-slate-800 truncate">{f.filename}</span>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Active</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={fullUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-600 hover:text-sky-800 text-[11px] font-semibold flex items-center gap-1 no-underline"
                                    >
                                      Kiểm tra <ExternalLink size={12} />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteZaloVerifier(f.filename)}
                                      className="text-rose-500 hover:text-rose-700 bg-transparent border-none cursor-pointer p-1"
                                      title="Xóa file này"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {activeTab === "widget" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Customizer & Code Snippet (7/12 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Configuration Options */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055A5] flex items-center justify-center font-bold">
                      <Palette size={18} />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-black text-sm">Tùy biến Giao diện Widget</h3>
                      <p className="text-xs text-slate-400">Thiết lập màu sắc, tiêu đề và vị trí của bong bóng chat nhúng</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bot Title */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Tên hiển thị của Bot</label>
                      <input
                        type="text"
                        value={widgetBotName}
                        onChange={(e) => setWidgetBotName(e.target.value)}
                        placeholder="Mia - Chuyên viên MobiFone"
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:border-[#0055A5] outline-none"
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Vị trí hiển thị trên màn hình</label>
                      <select
                        value={widgetPosition}
                        onChange={(e) => setWidgetPosition(e.target.value as any)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:border-[#0055A5] outline-none cursor-pointer"
                      >
                        <option value="bottom-right">Góc dưới bên phải (Mặc định)</option>
                        <option value="bottom-left">Góc dưới bên trái</option>
                      </select>
                    </div>
                  </div>

                  {/* Theme Color Picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Màu chủ đạo (Brand Theme Color)</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={widgetThemeColor}
                          onChange={(e) => setWidgetThemeColor(e.target.value)}
                          className="w-9 h-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={widgetThemeColor}
                          onChange={(e) => setWidgetThemeColor(e.target.value)}
                          className="w-24 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 uppercase"
                        />
                      </div>

                      {/* Color Presets */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { name: "Mobi Blue", color: "#005BAA" },
                          { name: "Navy Dark", color: "#003B70" },
                          { name: "Mobi Red", color: "#E30613" },
                          { name: "Emerald", color: "#059669" },
                          { name: "Indigo", color: "#4F46E5" },
                        ].map((preset) => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => setWidgetThemeColor(preset.color)}
                            title={preset.name}
                            className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition-transform ${
                              widgetThemeColor === preset.color ? "border-slate-800 scale-110 shadow-xs" : "border-white"
                            }`}
                            style={{ backgroundColor: preset.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Greeting Text */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Lời chào mở đầu khi người dùng bấm chat</label>
                    <textarea
                      value={widgetGreeting}
                      onChange={(e) => setWidgetGreeting(e.target.value)}
                      rows={3}
                      className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:border-[#0055A5] outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>

                  {/* Auto open toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Tự động mở khung chat</div>
                      <div className="text-[11px] text-slate-400">Mở sẵn hộp thoại chat sau 1 giây khi khách truy cập website</div>
                    </div>
                    <Toggle value={widgetAutoOpen} onChange={setWidgetAutoOpen} />
                  </div>
                </div>

                {/* Code Snippet Box */}
                <div className="bg-slate-900 rounded-2xl p-6 shadow-md text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code2 size={18} className="text-sky-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Mã nhúng HTML</h4>
                    </div>
                    <button
                      onClick={() => {
                        const snippet = `<!-- MobiFone AI Chatbot Widget -->\n<script \n  src="${window.location.origin}/widget.js" \n  data-chat-url="${window.location.origin}" \n  data-position="${widgetPosition}" \n  data-theme-color="${widgetThemeColor}" \n  data-bot-name="${widgetBotName}" \n  data-greeting="${widgetGreeting}"\n  ${widgetAutoOpen ? 'data-auto-open="true"' : ''}>\n</script>`;
                        navigator.clipboard.writeText(snippet);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2500);
                      }}
                      className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all shadow-xs"
                    >
                      {copiedCode ? <><CheckCheck size={14} /> Đã sao chép!</> : <><Copy size={14} /> Sao chép mã</>}
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px] mb-3">
                    Dán đoạn mã dưới đây vào trước thẻ đóng <code className="text-sky-300">&lt;/body&gt;</code> trên website của bạn:
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-sky-300 overflow-x-auto leading-relaxed border border-slate-800">
{`<!-- MobiFone AI Chatbot Widget -->
<script 
  src="${window.location.origin}/widget.js" 
  data-chat-url="${window.location.origin}" 
  data-position="${widgetPosition}" 
  data-theme-color="${widgetThemeColor}" 
  data-bot-name="${widgetBotName}" 
  data-greeting="${widgetGreeting}"
  ${widgetAutoOpen ? 'data-auto-open="true"' : ''}>
</script>`}
                  </pre>

                  <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                    <span className="text-slate-400">Kiểm tra hiển thị thực tế:</span>
                    <a
                      href="/test-embed.html"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 no-underline"
                    >
                      Mở trang demo test-embed.html <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Interactive Simulator (5/12 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-[#0055A5]" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Mô phỏng Widget Trực tiếp</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Live Preview</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Xem trước cách widget hoạt động khi nhúng vào website:
                  </p>

                  {/* Mock Browser Container */}
                  <div className="w-full h-[540px] rounded-xl border border-slate-200 shadow-inner bg-slate-100 flex flex-col overflow-hidden relative">
                    {/* Mock Browser Topbar */}
                    <div className="bg-slate-200 px-3 py-1.5 flex items-center gap-1.5 border-b border-slate-300/80 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                      <div className="ml-2 bg-white px-2 py-0.5 rounded text-[10px] text-slate-500 font-mono flex-1 truncate">
                        https://your-website.com/preview
                      </div>
                    </div>

                    {/* Mock Website Background */}
                    <div className="p-4 flex-1 flex flex-col justify-between overflow-hidden relative bg-gradient-to-b from-white to-slate-50">
                      <div>
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-100 rounded w-2/3 mb-4"></div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="h-16 bg-blue-50/60 rounded-lg border border-blue-100 p-2">
                            <div className="h-2.5 bg-blue-200 rounded w-1/2 mb-1.5"></div>
                            <div className="h-2 bg-blue-100 rounded w-3/4"></div>
                          </div>
                          <div className="h-16 bg-slate-100 rounded-lg p-2">
                            <div className="h-2.5 bg-slate-200 rounded w-1/2 mb-1.5"></div>
                            <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>

                      {/* Embedded Live Iframe Preview */}
                      <div 
                        className={`absolute bottom-3 ${widgetPosition === "bottom-right" ? "right-3" : "left-3"} w-[310px] h-[400px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col z-10 transition-all`}
                      >
                        <iframe
                          src={`/embed?theme=${encodeURIComponent(widgetThemeColor)}&title=${encodeURIComponent(widgetBotName)}&greeting=${encodeURIComponent(widgetGreeting)}`}
                          title="Widget Live Preview"
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


        </motion.div>
      </AnimatePresence>
    </div>
  );
}
