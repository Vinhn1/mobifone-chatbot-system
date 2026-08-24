import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit, FileText, Upload, Sparkles, CheckCircle2,
  ShieldCheck, AlertCircle, MessageSquare, Tag, ArrowRight,
  RefreshCw, Check, Zap, Info, FileCode, Download, HelpCircle, X, Trash2, Database,
  User, UserCheck, Settings, Lightbulb, Target, Shield, Rocket, Swords, Search, MessageCircle, Edit3, Folder, FileSpreadsheet,
  Layers, BarChart3, Lock, Flame, Save, Filter, CheckSquare, Square, Eye
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { API_BASE } from "../../../config";

type MessageItem = {
  speaker: "customer" | "agent" | "system" | "unknown";
  text: string;
  timestamp?: string;
};

type ExtractedQA = {
  question: string;
  answer: string;
  package_name?: string;
  intent?: string;
  sales_stage?: string;
  sales_tactic?: string;
  confidence_score?: number;
  selected?: boolean;
  is_duplicate?: boolean;
  matched_question?: string;
};

type ExtractedSalesTactic = {
  customer_objection: string;
  agent_strategy: string;
  recommended_pitch: string;
  package_name?: string;
  selected?: boolean;
};

type AnalysisResult = {
  conversation_id: string;
  quality_score: number;
  quality_reason: string;
  sanitized_messages: MessageItem[];
  extracted_qa_list: ExtractedQA[];
  extracted_tactics: ExtractedSalesTactic[];
  pii_redacted_count: number;
};

const SAMPLE_CHAT_TEXT = `Khách hàng: Chào bạn, mình muốn hỏi gói cước 4G MobiFone nào rẻ mà nhiều data? SĐT mình 0903123456.
Nhân viên CSKH: Dạ MobiFone chào anh/chị ạ! Hiện tại gói TK135 đang rất hot với ưu đãi 7GB/ngày (tổng 210GB/tháng) giá chỉ 135.000đ/tháng ạ.
Khách hàng: 135k/tháng hơi đắt so với nhu cầu của mình, có gói nào tầm 90k không em?
Nhân viên CSKH: Dạ nếu anh/chị cần tiết kiệm thì bên em có gói KC90 giá 90.000đ/tháng có 1GB/ngày + miễn phí tất cả cuộc gọi nội mạng dưới 10 phút ạ. Tuy nhiên gói TK135 tính ra chỉ 4.5k/ngày mà Data gấp 7 lần KC90 đó ạ.
Khách hàng: Ồ tính ra TK135 lời hơn nhỉ. Đăng ký TK135 cú pháp thế nào em?
Nhân viên CSKH: Dạ anh/chị chỉ cần soạn tin nhắn: DK TK135 gửi 999 là được kích hoạt ngay ạ. Chúc anh/chị đăng ký thành công!`;

const FUNNEL_STAGES = [
  { id: "all", label: "Tất cả kịch bản", icon: Layers, color: "#0055A5", bg: "#EFF6FF" },
  { id: "kham_pha_nhu_cau", label: "1. Khám phá nhu cầu", icon: Search, color: "#0284C7", bg: "#F0F9FF" },
  { id: "xu_ly_tu_choi_gia", label: "2. Xử lý phản bác giá", icon: Lightbulb, color: "#D97706", bg: "#FEF3C7" },
  { id: "so_sanh_doi_thu", label: "3. So sánh đối thủ", icon: Swords, color: "#7C3AED", bg: "#F5F3FF" },
  { id: "upsell_cross_sell", label: "4. Upsell & Giá trị", icon: Rocket, color: "#E11D48", bg: "#FFE4E6" },
  { id: "chot_don_closing", label: "5. Chốt đơn & Bắt Lead", icon: Target, color: "#059669", bg: "#ECFDF5" },
];

export function ChatMiningPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"input" | "preview" | "qa">("input");
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [inputText, setInputText] = useState(SAMPLE_CHAT_TEXT);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [parsedChatResults, setParsedChatResults] = useState<any[]>([]);
  const [selectedChatIndex, setSelectedChatIndex] = useState<number>(0);
  const [dataSource, setDataSource] = useState<"text" | "file" | null>(null);
  const [dataSourceName, setDataSourceName] = useState<string>("");

  const [textParsing, setTextParsing] = useState(false);
  const [fileParsing, setFileParsing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [qaList, setQaList] = useState<ExtractedQA[]>([]);
  const [tacticsList, setTacticsList] = useState<ExtractedSalesTactic[]>([]);

  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState<string>("all");
  const [editingQaIdx, setEditingQaIdx] = useState<number | null>(null);
  const [editingQaData, setEditingQaData] = useState<ExtractedQA | null>(null);

  const downloadSampleFile = (type: "txt" | "json" | "csv" | "xlsx") => {
    let content = "";
    let mime = "text/plain";
    let filename = `Mau_Chat_CSKH_MobiFone.${type}`;

    if (type === "txt") {
      content = SAMPLE_CHAT_TEXT;
      mime = "text/plain;charset=utf-8;";
    } else if (type === "json") {
      content = JSON.stringify([
        {
          conversation_id: "CHAT_001",
          messages: [
            { speaker: "customer", text: "Chào shop, tư vấn giúp em gói WiFi cáp quang cho gia đình 4 người." },
            { speaker: "agent", text: "Dạ MobiFone chào anh/chị ạ! Với gia đình 4 người dùng 1 Tivi và 4 điện thoại, bên em có gói 6WiFi 1Plus tốc độ 350 Mbps." },
            { speaker: "customer", text: "Gói đó giá bao nhiêu tiền vậy em?" },
            { speaker: "agent", text: "Dạ cước trọn gói 990.000đ cho 8 tháng sử dụng ạ (đóng 6 tháng tặng thêm 2 tháng free), tính ra chỉ 123.750đ/tháng. MobiFone tặng miễn phí Modem WiFi 6 thế hệ mới ạ." },
            { speaker: "customer", text: "Ok em, cho anh đăng ký gói này nhé, SĐT anh 0909123456." },
            { speaker: "agent", text: "Dạ em cảm ơn anh ạ, bên em sẽ xếp kỹ thuật qua đo kiểm tín hiệu và lắp đặt tại nhà ngay cho anh!" }
          ]
        }
      ], null, 2);
      mime = "application/json;charset=utf-8;";
    } else if (type === "csv" || type === "xlsx") {
      content = `\uFEFFconversation_id,speaker,text\n` +
        `CHAT_001,Khách hàng,"Chào shop, em muốn tìm hiểu gói cước Internet cáp quang MobiFiber."\n` +
        `CHAT_001,Nhân viên CSKH,"Dạ MobiFone cung cấp các gói cáp quang tốc độ từ 350 Mbps đến 600 Mbps kèm Modem WiFi 6 miễn phí ạ."\n` +
        `CHAT_001,Khách hàng,"Gói 6WiFi 1Plus giá bao nhiêu em?"\n` +
        `CHAT_001,Nhân viên CSKH,"Dạ gói 6WiFi 1Plus cước 990.000đ dùng trọn gói 8 tháng (tính ra 123.750đ/tháng) tặng kèm Modem WiFi 6 miễn phí ạ."\n` +
        `CHAT_002,Khách hàng,"Cho mình hỏi đăng ký gói TK135 như thế nào?"\n` +
        `CHAT_002,Nhân viên CSKH,"Dạ bạn chỉ cần soạn tin nhắn DK TK135 gửi 999 là kích hoạt gói 7GB/ngày ngay ạ."\n`;
      mime = "text/csv;charset=utf-8;";
      filename = `Mau_Chat_CSKH_MobiFone.csv`;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseText = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Vui lòng nhập hoặc dán nội dung đoạn chat");
      return;
    }
    setTextParsing(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_BASE}/chat/mining/parse-text`, { raw_text: inputText }, config);
      
      if (response.data?.analysis) {
        const analysis: AnalysisResult = response.data.analysis;
        setAnalysisResult(analysis);
        setQaList(analysis.extracted_qa_list.map(qa => ({ ...qa, selected: !qa.is_duplicate })));
        setTacticsList(analysis.extracted_tactics.map(t => ({ ...t, selected: true })));
        setParsedChatResults([response.data]);
        setSelectedChatIndex(0);
        setDataSource("text");
        setDataSourceName("Dán văn bản trực tiếp");
        setActiveTab("preview");
      }
    } catch (err: any) {
      console.error("Lỗi khi phân tích đoạn chat:", err);
      setErrorMsg(err.response?.data?.detail || err.response?.data?.message || "Không thể phân tích đoạn chat.");
    } finally {
      setTextParsing(false);
    }
  };

  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) {
      setErrorMsg("Vui lòng chọn hoặc kéo thả file lịch sử chat cần phân tích");
      return;
    }
    setFileParsing(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      };
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API_BASE}/chat/mining/parse-file`, formData, config);
      if (response.data?.results && response.data.results.length > 0) {
        const results = response.data.results;
        setParsedChatResults(results);
        setSelectedChatIndex(0);
        const firstResult = results[0].analysis;
        setAnalysisResult(firstResult);
        setQaList(firstResult.extracted_qa_list.map((qa: ExtractedQA) => ({ ...qa, selected: !qa.is_duplicate })));
        setTacticsList(firstResult.extracted_tactics.map((t: ExtractedSalesTactic) => ({ ...t, selected: true })));
        setDataSource("file");
        setDataSourceName(file.name);
        setSuccessMsg(`Đã phân tích thành công ${results.length} cuộc hội thoại từ file '${file.name}'!`);
        setActiveTab("preview");
      } else {
        setErrorMsg("Không tìm thấy dữ liệu hội thoại hợp lệ trong file. Vui lòng nhấn 'Hướng dẫn' để xem định dạng.");
      }
    } catch (err: any) {
      console.error("Lỗi khi upload file chat:", err);
      setErrorMsg(err.response?.data?.detail || err.response?.data?.message || "Lỗi khi xử lý file chat.");
    } finally {
      setFileParsing(false);
    }
  };

  const handleSelectChatIndex = (idx: number) => {
    setSelectedChatIndex(idx);
    if (parsedChatResults[idx]?.analysis) {
      const res = parsedChatResults[idx].analysis;
      setAnalysisResult(res);
      setQaList(res.extracted_qa_list.map((qa: ExtractedQA) => ({ ...qa, selected: !qa.is_duplicate })));
      setTacticsList(res.extracted_tactics.map((t: ExtractedSalesTactic) => ({ ...t, selected: true })));
    }
  };

  const handleToggleSpeakerRole = (msgIdx: number) => {
    if (!analysisResult) return;
    const updatedMessages = [...analysisResult.sanitized_messages];
    const currentSpeaker = updatedMessages[msgIdx].speaker;
    updatedMessages[msgIdx].speaker = currentSpeaker === "customer" ? "agent" : "customer";
    setAnalysisResult({ ...analysisResult, sanitized_messages: updatedMessages });
  };

  const handleApproveQA = async () => {
    const selectedQAs = qaList.filter(q => q.selected);
    if (selectedQAs.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 kịch bản để nạp vào tri thức");
      return;
    }
    setApproving(true);
    setErrorMsg("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_BASE}/chat/mining/approve-qa`, { qa_list: selectedQAs }, config);
      if (response.data?.status === "success") {
        setSuccessMsg(`${response.data.message} - Đang chuyển hướng sang Cơ sở tri thức...`);
        setTimeout(() => {
          setSuccessMsg("");
          navigate("/admin/knowledge");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Lỗi nạp tri thức:", err);
      setErrorMsg(err.response?.data?.detail || "Lỗi khi nạp tri thức vào kho.");
    } finally {
      setApproving(false);
    }
  };

  const startEditQa = (idx: number) => {
    setEditingQaIdx(idx);
    setEditingQaData({ ...qaList[idx] });
  };

  const saveEditQa = () => {
    if (editingQaIdx !== null && editingQaData) {
      const updated = [...qaList];
      updated[editingQaIdx] = editingQaData;
      setQaList(updated);
      setEditingQaIdx(null);
      setEditingQaData(null);
    }
  };

  const filteredQAList = selectedFunnelFilter === "all"
    ? qaList
    : qaList.filter(q => q.sales_stage === selectedFunnelFilter);

  const renderMessageWithBadges = (text: string) => {
    const parts = text.split(/(\[SDT_KH\]|\[CCCD_KH\]|\[EMAIL_KH\]|\[SO_THE_NH_KH\]|\[STK_KH\])/g);
    return parts.map((part, i) => {
      if (part === "[SDT_KH]") {
        return (
          <span key={i} style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A", padding: "1px 6px", borderRadius: 6, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Lock size={10} /> SĐT ĐÃ CHE
          </span>
        );
      }
      if (part === "[CCCD_KH]") {
        return (
          <span key={i} style={{ background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: 6, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Shield size={10} /> CCCD ĐÃ CHE
          </span>
        );
      }
      if (part === "[EMAIL_KH]") {
        return (
          <span key={i} style={{ background: "#F3E8FF", color: "#7E22CE", border: "1px solid #E9D5FF", padding: "1px 6px", borderRadius: 6, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Lock size={10} /> EMAIL ĐÃ CHE
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div style={{
      padding: "20px 28px",
      height: "100%",
      overflowY: "auto",
      fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif",
    }} className="custom-scrollbar">
      
      {/* Header Banner - Sleek Modern Style */}
      <div style={{
        background: "linear-gradient(135deg, #06152B 0%, #004D99 100%)",
        borderRadius: 20,
        padding: "22px 28px",
        color: "white",
        boxShadow: "0 12px 30px rgba(0, 77, 153, 0.15)",
        position: "relative",
        overflow: "hidden",
        marginBottom: 16
      }}>
        <div style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(228, 0, 43, 0.2) 0%, transparent 70%)",
          filter: "blur(25px)"
        }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, position: "relative", zIndex: 2 }}>
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.1)",
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              color: "#93C5FD",
              marginBottom: 6
            }}>
              <BrainCircuit size={13} /> AI Conversation Intelligence
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
              Học Tri Thức & Kịch Bản Bán Hàng từ Top Performers
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: 13, marginTop: 4, maxWidth: 640, lineHeight: 1.45 }}>
              Tự động bóc tách chiến thuật chốt deal, bẻ phản bác giá và nghệ thuật tư vấn từ lịch sử chat thực tế.
            </p>
          </div>

          <button
            onClick={() => navigate("/admin/knowledge")}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "white",
              padding: "9px 16px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(10px)",
              flexShrink: 0
            }}
          >
            Kho Tri thức <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 18
      }}>
        <div style={{ background: "white", borderRadius: 14, padding: "12px 16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EFF6FF", color: "#0055A5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Hội thoại đã nạp</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#0F172A" }}>
              {parsedChatResults.length > 0 ? parsedChatResults.length : "1 phiên"}
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: "12px 16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Bảo vệ PII Nhạy cảm</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#065F46" }}>
              {analysisResult ? `${analysisResult.pii_redacted_count} thông tin` : "100% An toàn"}
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: "12px 16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Flame size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Điểm Chất lượng Sales</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#92400E" }}>
              {analysisResult ? `${analysisResult.quality_score}/10` : "Top Performer"}
            </div>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: "12px 16px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5F3FF", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>Kịch bản bóc tách</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#5B21B6" }}>
              {qaList.length > 0 ? `${qaList.length} kịch bản` : "Sẵn sàng"}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 3-Step Stepper */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        padding: "6px 10px",
        borderRadius: 14,
        border: "1px solid #E2E8F0",
        marginBottom: 18
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setActiveTab("input")}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "input" ? "linear-gradient(135deg, #0055A5, #0077D5)" : "transparent",
              color: activeTab === "input" ? "white" : "#64748B",
              boxShadow: activeTab === "input" ? "0 4px 10px rgba(0,85,165,0.18)" : "none",
              transition: "all 0.15s"
            }}
          >
            <Upload size={14} /> 1. Nạp Dữ Liệu
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            disabled={!analysisResult}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 800,
              cursor: analysisResult ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "preview" ? "linear-gradient(135deg, #0055A5, #0077D5)" : "transparent",
              color: activeTab === "preview" ? "white" : "#64748B",
              opacity: analysisResult ? 1 : 0.45,
              boxShadow: activeTab === "preview" ? "0 4px 10px rgba(0,85,165,0.18)" : "none",
              transition: "all 0.15s"
            }}
          >
            <ShieldCheck size={14} /> 2. Phân Vai & PII
          </button>

          <button
            onClick={() => setActiveTab("qa")}
            disabled={!analysisResult}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 800,
              cursor: analysisResult ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === "qa" ? "linear-gradient(135deg, #0055A5, #0077D5)" : "transparent",
              color: activeTab === "qa" ? "white" : "#64748B",
              opacity: analysisResult ? 1 : 0.45,
              boxShadow: activeTab === "qa" ? "0 4px 10px rgba(0,85,165,0.18)" : "none",
              transition: "all 0.15s"
            }}
          >
            <Sparkles size={14} /> 3. Duyệt Kịch Bản ({qaList.length})
          </button>
        </div>

        {activeTab === "qa" && (
          <button
            onClick={handleApproveQA}
            disabled={approving || qaList.filter(q => q.selected).length === 0}
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white",
              border: "none",
              padding: "8px 18px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12.5,
              cursor: approving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
            }}
          >
            {approving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {approving ? "Đang Nạp..." : `Nạp (${qaList.filter(q => q.selected).length}) Kịch Bản`}
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div style={{
          background: "#FEF2F2",
          border: "1px solid #FCA5A5",
          color: "#991B1B",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 12.5,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <AlertCircle size={15} /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: "#ECFDF5",
          border: "1px solid #6EE7B7",
          color: "#065F46",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 12.5,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}

      {/* TAB 1: UNIFIED INPUT WORKSPACE WITH SEGMENTED TOGGLE */}
      {activeTab === "input" && (
        <div style={{
          background: "white",
          borderRadius: 18,
          border: "1px solid #E2E8F0",
          boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
          overflow: "hidden"
        }}>
          {/* Top Control Bar with Segmented Switch & Utilities */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC"
          }}>
            {/* Segmented Pill Toggle */}
            <div style={{
              display: "inline-flex",
              background: "#E2E8F0",
              padding: 3,
              borderRadius: 10,
              gap: 2
            }}>
              <button
                type="button"
                onClick={() => setInputMode("text")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: inputMode === "text" ? "white" : "transparent",
                  color: inputMode === "text" ? "#0055A5" : "#64748B",
                  boxShadow: inputMode === "text" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s"
                }}
              >
                <FileText size={14} /> Dán văn bản trực tiếp
              </button>

              <button
                type="button"
                onClick={() => setInputMode("file")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: inputMode === "file" ? "white" : "transparent",
                  color: inputMode === "file" ? "#0055A5" : "#64748B",
                  boxShadow: inputMode === "file" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s"
                }}
              >
                <Upload size={14} /> Tải tệp tin (.xlsx, .csv, .json)
              </button>
            </div>

            {/* Quick Actions / Sample Links */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {inputMode === "text" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setInputText(SAMPLE_CHAT_TEXT)}
                    style={{
                      background: "#EFF6FF",
                      color: "#1D4ED8",
                      border: "1px solid #BFDBFE",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Sparkles size={13} /> Nạp Mẫu Chuẩn
                  </button>
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => setInputText("")}
                      style={{
                        background: "#F1F5F9",
                        color: "#64748B",
                        border: "1px solid #CBD5E1",
                        padding: "6px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Xóa trắng
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>Tải mẫu:</span>
                  <button
                    type="button"
                    onClick={() => downloadSampleFile("csv")}
                    style={{
                      background: "#EFF6FF",
                      color: "#1D4ED8",
                      border: "1px solid #BFDBFE",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    .CSV / .XLSX
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSampleFile("json")}
                    style={{
                      background: "#FEF3C7",
                      color: "#B45309",
                      border: "1px solid #FDE68A",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    .JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "1px solid #CBD5E1",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 3
                    }}
                  >
                    <HelpCircle size={12} /> Hướng dẫn
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Body Content Area */}
          <div style={{ padding: "20px" }}>
            {inputMode === "text" ? (
              <div>
                <textarea
                  rows={13}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Dán nội dung hội thoại tư vấn CSKH/Bán hàng tại đây (Hệ thống tự động phân định người nói & che SĐT/CCCD)..."
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #CBD5E1",
                    padding: "14px 16px",
                    fontSize: 13,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    outline: "none",
                    lineHeight: 1.55,
                    background: "#F8FAFC",
                    resize: "vertical",
                    boxSizing: "border-box"
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    onClick={handleParseText}
                    disabled={textParsing}
                    style={{
                      background: "linear-gradient(135deg, #0055A5 0%, #0077D5 100%)",
                      color: "white",
                      border: "none",
                      padding: "11px 26px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: textParsing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(0,85,165,0.25)"
                    }}
                  >
                    {textParsing ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {textParsing ? "Đang Phân Tích Kịch Bản Bằng AI..." : "Phân Tích & Bóc Tách Kịch Bản AI"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setSelectedFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const el = document.getElementById("unified-file-input");
                    if (el) el.click();
                  }}
                  style={{
                    border: "2px dashed #CBD5E1",
                    borderRadius: 14,
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "#F8FAFC",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  <FileCode size={40} style={{ color: "#0055A5", margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1E293B" }}>
                    Kéo thả file lịch sử chat vào đây hoặc bấm để chọn tệp
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    Hỗ trợ định dạng .XLSX, .CSV, .JSON, .TXT (Tối đa 25MB)
                  </div>
                  <input
                    id="unified-file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls,.json,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {selectedFile && (
                  <div style={{
                    marginTop: 14,
                    padding: "12px 16px",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: "#0055A5",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 11
                      }}>
                        {selectedFile.name.split('.').pop()?.toUpperCase() || "FILE"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          Dung lượng: {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#EF4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      <Trash2 size={13} /> Xóa tệp
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => handleFileUpload(selectedFile || undefined)}
                    disabled={fileParsing || !selectedFile}
                    style={{
                      background: selectedFile ? "linear-gradient(135deg, #0055A5 0%, #0077D5 100%)" : "#94A3B8",
                      color: "white",
                      border: "none",
                      padding: "11px 26px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: fileParsing || !selectedFile ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: selectedFile ? "0 4px 14px rgba(0,85,165,0.25)" : "none"
                    }}
                  >
                    {fileParsing ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {fileParsing ? "Đang Phân Tích File Bằng AI..." : "Bắt Đầu Phân Tích File Chat"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PREVIEW & ROLE TAGGING & PII CHECK */}
      {activeTab === "preview" && analysisResult && (
        <div>
          {/* Data Source Badge */}
          {dataSource && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
              background: dataSource === "file" ? "#FFF7ED" : "#EFF6FF",
              border: `1px solid ${dataSource === "file" ? "#FED7AA" : "#BFDBFE"}`,
              color: dataSource === "file" ? "#C2410C" : "#1D4ED8"
            }}>
              {dataSource === "file" ? <Database size={13} /> : <FileText size={13} />}
              Nguồn dữ liệu: {dataSource === "file" ? <span className="inline-flex items-center gap-1"><Folder size={13} /> File "{dataSourceName}"</span> : <span className="inline-flex items-center gap-1"><Edit3 size={13} /> {dataSourceName}</span>}
              {parsedChatResults.length > 1 && (
                <span style={{
                  background: dataSource === "file" ? "#C2410C" : "#1D4ED8",
                  color: "white",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: 10.5,
                  fontWeight: 800
                }}>{parsedChatResults.length} hội thoại</span>
              )}
            </div>
          )}

          {parsedChatResults.length > 1 && (
            <div style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 16,
              padding: "12px 20px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1E40AF", display: "flex", alignItems: "center", gap: 8 }}>
                <Folder size={16} className="text-[#0055A5]" /> Đã phân tích {parsedChatResults.length} cuộc hội thoại từ file. Vui lòng chọn cuộc chat cần xem:
              </span>
              <select
                value={selectedChatIndex}
                onChange={(e) => handleSelectChatIndex(Number(e.target.value))}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid #93C5FD",
                  background: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1E3A8A",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {parsedChatResults.map((r, idx) => (
                  <option key={idx} value={idx}>
                    Cuộc chat #{idx + 1} ({r.analysis?.conversation_id || `Hội thoại ${idx+1}`}) - Điểm: {r.analysis?.quality_score}/10
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
            {/* Analysis Summary */}
            <div style={{
              background: "white",
              borderRadius: 20,
              padding: 24,
              border: "1px solid rgba(0,0,0,0.06)",
              height: "fit-content"
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px", color: "#1E293B", display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={16} className="text-[#0055A5]" /> Đánh giá Đoạn Chat
              </h4>

              <div style={{
                background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
                border: "1px solid #A7F3D0",
                borderRadius: 16,
                padding: 16,
                textAlign: "center",
                marginBottom: 16
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#047857", textTransform: "uppercase", letterSpacing: 1 }}>
                  Điểm Chất lượng Sales
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#065F46", margin: "4px 0" }}>
                  {analysisResult.quality_score} <span style={{ fontSize: 14, fontWeight: 600, color: "#047857" }}>/ 10</span>
                </div>
                <div style={{ fontSize: 12, color: "#064E3B", lineHeight: 1.4 }}>
                  {analysisResult.quality_reason}
                </div>
              </div>

              <div style={{
                background: "#F8FAFC",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12
              }}>
                <ShieldCheck size={18} style={{ color: "#0055A5" }} />
                <div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Đã che thông tin PII</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                    {analysisResult.pii_redacted_count} mục (SĐT/CCCD/Email)
                  </div>
                </div>
              </div>

              <div style={{
                background: "#F8FAFC",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20
              }}>
                <Sparkles size={18} style={{ color: "#E4002B" }} />
                <div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Kịch bản Sales bóc tách</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                    {analysisResult.extracted_qa_list.length} Kịch bản & Q&A
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("qa")}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #0055A5, #0077D5)",
                  color: "white",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(0,85,165,0.25)"
                }}
              >
                Tiếp tục: Duyệt Kịch Bản Sales <ArrowRight size={15} />
              </button>
            </div>

            {/* Sanitized Chat Preview */}
            <div style={{
              background: "white",
              borderRadius: 20,
              padding: 24,
              border: "1px solid rgba(0,0,0,0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageSquare size={18} style={{ color: "#0055A5" }} />
                  Hội thoại đã Phân vai & Che giấu PII ({analysisResult.sanitized_messages.length} tin nhắn)
                </h4>
                <span style={{ fontSize: 12, color: "#64748B", background: "#F1F5F9", padding: "4px 10px", borderRadius: 8, fontWeight: 600 }}>
                  ID: {analysisResult.conversation_id}
                </span>
              </div>

              {/* Role count summary */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0055A5", background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "3px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <UserCheck size={13} /> Nhân viên: {analysisResult.sanitized_messages.filter(m => m.speaker === "agent").length} tin nhắn
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#E4002B", background: "#FFF1F2", border: "1px solid #FECDD3", padding: "3px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <User size={13} /> Khách hàng: {analysisResult.sanitized_messages.filter(m => m.speaker === "customer").length} tin nhắn
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {analysisResult.sanitized_messages.map((msg, idx) => {
                  const isAgent = msg.speaker === "agent";
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isAgent ? "flex-end" : "flex-start"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: isAgent ? "#0055A5" : "#E4002B",
                        marginBottom: 4
                      }}>
                        {isAgent ? (
                          <span className="inline-flex items-center gap-1"><UserCheck size={13} /> Nhân viên CSKH MobiFone</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><User size={13} /> Khách hàng</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleSpeakerRole(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#64748B",
                            cursor: "pointer",
                            fontSize: 10.5,
                            textDecoration: "underline",
                            padding: 0
                          }}
                        >
                          (Đổi sang {isAgent ? "Khách hàng" : "Nhân viên"})
                        </button>
                      </div>

                      <div style={{
                        maxWidth: "85%",
                        padding: "12px 16px",
                        borderRadius: isAgent ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        background: isAgent ? "#EFF6FF" : "#FFF1F2",
                        border: isAgent ? "1px solid #BFDBFE" : "1px solid #FECDD3",
                        color: "#1E293B",
                        fontSize: 13,
                        lineHeight: 1.5
                      }}>
                        {renderMessageWithBadges(msg.text)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXTRACTED KNOWLEDGE & SALES PLAYBOOK */}
      {activeTab === "qa" && analysisResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {parsedChatResults.length > 1 && (
            <div style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 16,
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1E40AF", display: "flex", alignItems: "center", gap: 8 }}>
                <Folder size={16} className="text-[#0055A5]" /> Đã phân tích {parsedChatResults.length} cuộc hội thoại từ file. Đang duyệt tri thức cho:
              </span>
              <select
                value={selectedChatIndex}
                onChange={(e) => handleSelectChatIndex(Number(e.target.value))}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid #93C5FD",
                  background: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1E3A8A",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {parsedChatResults.map((r, idx) => (
                  <option key={idx} value={idx}>
                    Cuộc chat #{idx + 1} ({r.analysis?.conversation_id || `Hội thoại ${idx+1}`})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Funnel Stage Filter Bar */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: "12px 16px",
            border: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto"
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748B", display: "flex", alignItems: "center", gap: 4, marginRight: 8, flexShrink: 0 }}>
              <Filter size={14} /> LỌC THEO PHỄU SALES:
            </div>
            {FUNNEL_STAGES.map(st => {
              const IconComp = st.icon;
              const count = st.id === "all" ? qaList.length : qaList.filter(q => q.sales_stage === st.id).length;
              const isAct = selectedFunnelFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedFunnelFilter(st.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: isAct ? `1.5px solid ${st.color}` : "1px solid #E2E8F0",
                    background: isAct ? st.bg : "#F8FAFC",
                    color: isAct ? st.color : "#475569",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                    transition: "all 0.15s"
                  }}
                >
                  <IconComp size={13} /> {st.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Section 1: Q&A and Playbook Scripts */}
          <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "#0055A5" }} />
                  Kịch Bản Bán Hàng & Hỏi-Đáp Thực Chiến ({filteredQAList.length}/{qaList.length})
                </h4>
                <p style={{ color: "#64748B", fontSize: 12.5, marginTop: 4, margin: 0 }}>
                  Đã bóc tách theo mô hình Top Sales (SPIN, Bẻ phản bác, Value Framing). Bạn có thể bấm Sửa trực tiếp trước khi nạp vào ChromaDB.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const allSel = qaList.every(q => q.selected);
                    setQaList(qaList.map(q => ({ ...q, selected: !allSel })));
                  }}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    padding: "8px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {qaList.every(q => q.selected) ? <Square size={13} /> : <CheckSquare size={13} />}
                  {qaList.every(q => q.selected) ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredQAList.map((qa, idx) => {
                const globalIdx = qaList.indexOf(qa);
                const isEditing = editingQaIdx === globalIdx;

                return (
                  <div
                    key={idx}
                    style={{
                      border: qa.selected ? "2px solid #0055A5" : "1px solid #E2E8F0",
                      borderRadius: 16,
                      padding: 18,
                      background: qa.selected ? "#F0F7FF" : "#F8FAFC",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        onClick={() => {
                          const newQa = [...qaList];
                          newQa[globalIdx].selected = !newQa[globalIdx].selected;
                          setQaList(newQa);
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: qa.selected ? "none" : "2px solid #CBD5E1",
                          background: qa.selected ? "#0055A5" : "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          marginTop: 2,
                          cursor: "pointer"
                        }}
                      >
                        {qa.selected && <Check size={14} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{
                              background: "#0055A5",
                              color: "white",
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 8
                            }}>
                              {qa.intent || "Tư vấn"}
                            </span>

                            {qa.sales_stage && (
                              <span style={{
                                background: qa.sales_stage === "xu_ly_tu_choi_gia" ? "#FEF3C7" : qa.sales_stage === "chot_don_closing" ? "#D1FAE5" : qa.sales_stage === "so_sanh_doi_thu" ? "#F5F3FF" : "#EFF6FF",
                                color: qa.sales_stage === "xu_ly_tu_choi_gia" ? "#92400E" : qa.sales_stage === "chot_don_closing" ? "#065F46" : qa.sales_stage === "so_sanh_doi_thu" ? "#6B21A8" : "#1D4ED8",
                                border: "1px solid rgba(0,0,0,0.08)",
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 8,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}>
                                {qa.sales_stage === "xu_ly_tu_choi_gia" ? <><Lightbulb size={12} /> Xử lý từ chối giá</> :
                                 qa.sales_stage === "chot_don_closing" ? <><Target size={12} /> Chốt đơn Sales</> :
                                 qa.sales_stage === "khach_phan_nan" ? <><Shield size={12} /> Xoa dịu khiếu nại</> :
                                 qa.sales_stage === "upsell_cross_sell" ? <><Rocket size={12} /> Upsell & Định khung giá</> :
                                 qa.sales_stage === "so_sanh_doi_thu" ? <><Swords size={12} /> So sánh đối thủ</> : <><Search size={12} /> Khám phá nhu cầu</>}
                              </span>
                            )}

                            {qa.package_name && (
                              <span style={{
                                background: "#E4002B",
                                color: "white",
                                fontSize: 10.5,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 8
                              }}>
                                Gói {qa.package_name}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => isEditing ? saveEditQa() : startEditQa(globalIdx)}
                            style={{
                              background: isEditing ? "#10B981" : "white",
                              color: isEditing ? "white" : "#475569",
                              border: "1px solid #CBD5E1",
                              padding: "4px 10px",
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            {isEditing ? <Save size={12} /> : <Edit3 size={12} />}
                            {isEditing ? "Lưu thay đổi" : "Chỉnh sửa"}
                          </button>
                        </div>

                        {/* Question View / Edit */}
                        {isEditing && editingQaData ? (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Câu hỏi của khách:</div>
                            <input
                              type="text"
                              value={editingQaData.question}
                              onChange={(e) => setEditingQaData({ ...editingQaData, question: e.target.value })}
                              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #94A3B8", fontSize: 13, fontWeight: 700 }}
                            />
                          </div>
                        ) : (
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <HelpCircle size={15} className="text-[#0055A5] shrink-0" /> {qa.question}
                          </div>
                        )}

                        {/* Answer View / Edit */}
                        {isEditing && editingQaData ? (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Câu trả lời tư vấn chuẩn:</div>
                            <textarea
                              rows={4}
                              value={editingQaData.answer}
                              onChange={(e) => setEditingQaData({ ...editingQaData, answer: e.target.value })}
                              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #94A3B8", fontSize: 13, lineHeight: 1.5 }}
                            />
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, background: "white", padding: 12, borderRadius: 10, border: "1px solid #E2E8F0", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, color: "#0055A5" }}>
                              <MessageSquare size={14} /> <strong>Tư vấn mẫu của Chuyên viên Top Sales:</strong>
                            </div>
                            {qa.answer}
                          </div>
                        )}

                        {qa.sales_tactic && (
                          <div style={{ fontSize: 12, color: "#0284C7", background: "#F0F9FF", padding: "6px 12px", borderRadius: 8, border: "1px solid #BAE6FD", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <Zap size={14} className="text-sky-600 shrink-0" /> <strong>Chiến thuật Sales áp dụng:</strong> {qa.sales_tactic}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Gong/Cresta Style Sales Tactics Battlecards */}
          {tacticsList.length > 0 && (
            <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FFF1F2", color: "#E4002B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Flame size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1E293B" }}>
                    Battlecards: Nghệ Thuật Bẻ Phản Bác & Chốt Hẹn ({tacticsList.length})
                  </h4>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Các đòn tâm lý bán hàng của Top Performer giúp xoay chuyển tình thế khi khách chê đắt hoặc so sánh đối thủ
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {tacticsList.map((tac, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #FED7AA",
                      borderRadius: 16,
                      padding: 18,
                      background: "linear-gradient(180deg, #FFFDFB 0%, #FFF7ED 100%)",
                      boxShadow: "0 4px 12px rgba(234, 88, 12, 0.04)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#C2410C", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                      <Lightbulb size={13} /> Tình huống phản bác của khách:
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#9A3412", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <MessageCircle size={15} className="text-amber-700 shrink-0 mt-0.5" /> "{tac.customer_objection}"
                    </div>

                    <div style={{ fontSize: 12.5, color: "#431407", background: "white", padding: 12, borderRadius: 10, border: "1px solid #FFEDD5", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <Target size={15} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <strong>Chiến thuật nhân viên:</strong> {tac.agent_strategy}
                      </div>
                    </div>

                    {tac.recommended_pitch && (
                      <div style={{ fontSize: 12, color: "#065F46", background: "#ECFDF5", padding: "8px 12px", borderRadius: 8, border: "1px solid #A7F3D0", lineHeight: 1.4 }}>
                        <strong>Mẫu câu chốt hạ:</strong> "{tac.recommended_pitch}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Format Guide Modal */}
      {showGuideModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24
        }}>
          <div style={{
            background: "white",
            borderRadius: 24,
            width: "100%",
            maxWidth: 740,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #E2E8F0",
            padding: 28
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#EFF6FF", color: "#0055A5", padding: 10, borderRadius: 12 }}>
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0F172A" }}>
                    Hướng dẫn Soạn File Lịch sử Chat CSKH
                  </h3>
                  <div style={{ fontSize: 12.5, color: "#64748B" }}>
                    Định dạng cột và cấu trúc file hỗ trợ tốt nhất cho AI Chat Mining
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748B"
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 1. Excel / CSV Format */}
              <div style={{ background: "#F8FAFC", borderRadius: 16, padding: 16, border: "1px solid #E2E8F0" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileSpreadsheet size={18} className="text-[#0055A5]" /> 1. File Excel (.xlsx) hoặc CSV (.csv)
                </div>
                <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
                  Tạo các dòng tin nhắn nối tiếp nhau theo thời gian. Hệ thống hỗ trợ tự động nhận diện tiêu đề cột tiếng Việt hoặc tiếng Anh:
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid #CBD5E1" }}>
                    <thead>
                      <tr style={{ background: "#0055A5", color: "white", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>conversation_id</th>
                        <th style={{ padding: "8px 12px" }}>speaker / vai_tro</th>
                        <th style={{ padding: "8px 12px" }}>text / noi_dung</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0F172A" }}>conversation_id <br/><span style={{ fontSize: 10, color: "#64748B" }}>(hoặc: Mã cuộc chat / session_id)</span></td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>CHAT_001</td>
                        <td style={{ padding: "8px 12px" }}>Mã định danh nhóm các tin nhắn thuộc cùng 1 cuộc chat. (Nếu để trống, hệ thống gộp chung 1 file).</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0F172A" }}>speaker <br/><span style={{ fontSize: 10, color: "#64748B" }}>(hoặc: role / Người nói / sender)</span></td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>Khách hàng / Nhân viên CSKH</td>
                        <td style={{ padding: "8px 12px" }}>Nhận diện vai trò: <br/>- Khách hàng: <i>Khách hàng, KH, customer, user</i><br/>- CSKH: <i>Nhân viên CSKH, NV, agent, cskh</i></td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0F172A" }}>text <br/><span style={{ fontSize: 10, color: "#64748B" }}>(hoặc: Nội dung / message / content)</span></td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>Chào shop, tư vấn giúp em gói WiFi...</td>
                        <td style={{ padding: "8px 12px" }}>Nội dung đoạn tin nhắn tương tác.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. JSON Format */}
              <div style={{ background: "#F8FAFC", borderRadius: 16, padding: 16, border: "1px solid #E2E8F0" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileCode size={18} className="text-amber-600" /> 2. File JSON (.json)
                </div>
                <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
                  Mảng các Object đại diện cho từng hội thoại kèm mảng tin nhắn:
                </p>
                <pre style={{
                  background: "#0F172A",
                  color: "#E2E8F0",
                  padding: 12,
                  borderRadius: 10,
                  fontSize: 11.5,
                  overflowX: "auto",
                  fontFamily: "monospace",
                  margin: 0
                }}>
{`[
  {
    "conversation_id": "CHAT_001",
    "messages": [
      { "speaker": "customer", "text": "Gói 6WiFi 1 tốc độ bao nhiêu Mbps?" },
      { "speaker": "agent", "text": "Dạ gói 6WiFi 1 tốc độ 300 Mbps giá 900k/8 tháng ạ." }
    ]
  }
]`}
                </pre>
              </div>

              {/* 3. TXT Format */}
              <div style={{ background: "#F8FAFC", borderRadius: 16, padding: 16, border: "1px solid #E2E8F0" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={18} className="text-purple-600" /> 3. File Văn bản TXT (.txt)
                </div>
                <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
                  Mỗi dòng là một tin nhắn có ghi rõ tên người nói ở đầu dòng (ví dụ: <code style={{ color: "#E4002B" }}>Khách hàng: ...</code> hoặc <code style={{ color: "#0055A5" }}>Nhân viên CSKH: ...</code>).
                </p>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => downloadSampleFile("csv")}
                style={{
                  background: "#0055A5",
                  color: "white",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Download size={14} /> Tải Mẫu CSV / Excel Chuẩn
              </button>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{
                  background: "#F1F5F9",
                  color: "#475569",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
