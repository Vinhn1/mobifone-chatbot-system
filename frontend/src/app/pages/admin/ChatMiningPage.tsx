import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit, FileText, Upload, Sparkles, CheckCircle2,
  ShieldCheck, AlertCircle, MessageSquare, Tag, ArrowRight,
  RefreshCw, Check, Zap, Info, FileCode, Download, HelpCircle, X, Trash2, Database,
  User, UserCheck, Settings, Lightbulb, Target, Shield, Rocket, Swords, Search, MessageCircle, Edit3, Folder, FileSpreadsheet
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

export function ChatMiningPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"input" | "preview" | "qa">("input");
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
            { speaker: "agent", text: "Dạ MobiFone chào anh/chị ạ! Với gia đình 4 người dùng 1 Tivi và 4 điện thoại, bên em có gói 6WiFi 1 tốc độ 300 Mbps." },
            { speaker: "customer", text: "Gói đó giá bao nhiêu tiền vậy em?" },
            { speaker: "agent", text: "Dạ cước trọn gói 900.000đ cho 8 tháng sử dụng ạ (đóng 6 tháng tặng thêm 2 tháng free), tính ra chỉ 112.500đ/tháng. MobiFone tặng miễn phí Modem WiFi 6 ạ." },
            { speaker: "customer", text: "Ok em, cho anh đăng ký gói này nhé, SĐT anh 0909123456." },
            { speaker: "agent", text: "Dạ em cảm ơn anh ạ, bên em sẽ xếp kỹ thuật qua lắp ngay cho anh!" }
          ]
        }
      ], null, 2);
      mime = "application/json;charset=utf-8;";
    } else if (type === "csv" || type === "xlsx") {
      content = `\uFEFFconversation_id,speaker,text\n` +
        `CHAT_001,Khách hàng,"Chào shop, em muốn tìm hiểu gói cước Internet cáp quang MobiFiber."\n` +
        `CHAT_001,Nhân viên CSKH,"Dạ MobiFone cung cấp các gói cáp quang tốc độ từ 300 Mbps đến 500 Mbps ạ."\n` +
        `CHAT_001,Khách hàng,"Gói 6WiFi 1 giá bao nhiêu em?"\n` +
        `CHAT_001,Nhân viên CSKH,"Dạ gói 6WiFi 1 cước 900.000đ dùng trọn gói 8 tháng (tính ra 112.500đ/tháng) tặng kèm Modem WiFi 6 miễn phí ạ."\n` +
        `CHAT_002,Khách hàng,"Cho mình hỏi đăng ký gói TK135 như thế nào?"\n` +
        `CHAT_002,Nhân viên CSKH,"Dạ bạn chỉ cần soạn tin nhắn DK TK135 gửi 999 là kích hoạt gói 7GB/ngày ngay ạ."\n`;
      mime = "text/csv;charset=utf-8;";
      filename = type === "xlsx" ? `Mau_Chat_CSKH_MobiFone.csv` : `Mau_Chat_CSKH_MobiFone.csv`;
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
        setDataSourceName("Dán đoạn Chat trực tiếp");
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
        setSuccessMsg(`🎉 Đã phân tích thành công ${results.length} cuộc hội thoại từ file '${file.name}'!`);
        setActiveTab("preview");
      } else {
        setErrorMsg("Không tìm thấy dữ liệu hội thoại hợp lệ trong file. Vui lòng nhấn 'Hướng dẫn Soạn File' để xem định dạng.");
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

  const handleApproveQA = async () => {
    const selectedQAs = qaList.filter(q => q.selected);
    if (selectedQAs.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 cặp Hỏi - Đáp để nạp vào tri thức");
      return;
    }
    setApproving(true);
    setErrorMsg("");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_BASE}/chat/mining/approve-qa`, { qa_list: selectedQAs }, config);
      if (response.data?.status === "success") {
        setSuccessMsg(`✅ ${response.data.message} - Đang chuyển hướng sang Cơ sở tri thức...`);
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

  return (
    <div style={{
      padding: "24px 32px",
      height: "100%",
      overflowY: "auto",
      fontFamily: "'Outfit', sans-serif",
    }} className="custom-scrollbar">
      
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0A1628 0%, #0055A5 100%)",
        borderRadius: 24,
        padding: "28px 36px",
        color: "white",
        boxShadow: "0 20px 40px rgba(0, 85, 165, 0.18)",
        position: "relative",
        overflow: "hidden",
        marginBottom: 24
      }}>
        <div style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(228, 0, 43, 0.25) 0%, transparent 70%)",
          filter: "blur(30px)"
        }} />

        <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", gap: 20, position: "relative", zIndex: 2 }}>
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255, 255, 255, 0.12)",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              color: "#60A5FA",
              marginBottom: 10
            }}>
              <BrainCircuit size={14} /> AI CSKH Chat Mining Engine
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              Học Tri thức & Kịch bản Bán hàng từ Chat CSKH
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 13.5, marginTop: 6, maxWidth: 640, lineHeight: 1.5 }}>
              Tự động phân vai Khách hàng/CSKH, xóa thông tin nhạy cảm (PII), trích xuất các cặp Hỏi-Đáp thực chiến và kỹ thuật tư vấn chốt đơn chuyên nghiệp của nhân viên xuất sắc.
            </p>
          </div>

          <button
            onClick={() => navigate("/admin/knowledge")}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "white",
              padding: "10px 18px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              backdropFilter: "blur(10px)",
              flexShrink: 0
            }}
          >
            Kho Tri thức hiện tại <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: "flex",
        gap: 8,
        background: "rgba(0, 0, 0, 0.04)",
        padding: 6,
        borderRadius: 16,
        marginBottom: 24,
        width: "fit-content"
      }}>
        <button
          onClick={() => setActiveTab("input")}
          style={{
            padding: "8px 20px",
            borderRadius: 12,
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "input" ? "white" : "transparent",
            color: activeTab === "input" ? "#0055A5" : "#64748B",
            boxShadow: activeTab === "input" ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s"
          }}
        >
          <Upload size={15} /> 1. Nạp Dữ liệu Chat
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          disabled={!analysisResult}
          style={{
            padding: "8px 20px",
            borderRadius: 12,
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            cursor: analysisResult ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "preview" ? "white" : "transparent",
            color: activeTab === "preview" ? "#0055A5" : "#64748B",
            opacity: analysisResult ? 1 : 0.5,
            boxShadow: activeTab === "preview" ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s"
          }}
        >
          <ShieldCheck size={15} /> 2. Phân vai & Xóa PII
        </button>

        <button
          onClick={() => setActiveTab("qa")}
          disabled={!analysisResult}
          style={{
            padding: "8px 20px",
            borderRadius: 12,
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            cursor: analysisResult ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: activeTab === "qa" ? "white" : "transparent",
            color: activeTab === "qa" ? "#0055A5" : "#64748B",
            opacity: analysisResult ? 1 : 0.5,
            boxShadow: activeTab === "qa" ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s"
          }}
        >
          <Sparkles size={15} /> 3. Tri thức & Kịch bản Bán hàng ({qaList.length})
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div style={{
          background: "#FEF2F2",
          border: "1px solid #FCA5A5",
          color: "#991B1B",
          padding: "12px 16px",
          borderRadius: 12,
          fontSize: 13,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: "#ECFDF5",
          border: "1px solid #6EE7B7",
          color: "#065F46",
          padding: "12px 16px",
          borderRadius: 12,
          fontSize: 13,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {/* TAB 1: INPUT DATA */}
      {activeTab === "input" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Option A: Paste Text */}
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: 24,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.03)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <FileText size={18} style={{ color: "#0055A5" }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1E293B" }}>
                Cách 1: Dán đoạn Chat trực tiếp
              </h3>
            </div>
            <p style={{ color: "#64748B", fontSize: 12.5, marginBottom: 14 }}>
              Dán đoạn chat copy từ Messenger, Zalo hoặc CRM. Hệ thống tự động phân định người nói & xóa SĐT/CCCD.
            </p>

            <textarea
              rows={12}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Dán nội dung hội thoại CSKH tại đây..."
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid #CBD5E1",
                padding: 14,
                fontSize: 13,
                fontFamily: "monospace",
                outline: "none",
                lineHeight: 1.5,
                background: "#F8FAFC",
                resize: "vertical"
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={handleParseText}
                disabled={textParsing}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #0055A5, #0077D5)",
                  color: "white",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: textParsing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(0,85,165,0.25)"
                }}
              >
                {textParsing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {textParsing ? "Đang AI Phân tích..." : "Phân tích Chat bằng AI"}
              </button>

              <button
                onClick={() => setInputText(SAMPLE_CHAT_TEXT)}
                style={{
                  background: "#F1F5F9",
                  color: "#475569",
                  border: "none",
                  padding: "12px 14px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer"
                }}
              >
                Mẫu Chat Chuẩn
              </button>
            </div>
          </div>

          {/* Option B: Upload File */}
          <div style={{
            background: "white",
            borderRadius: 20,
            padding: 24,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.03)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Upload size={18} style={{ color: "#E4002B" }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1E293B" }}>
                Cách 2: Upload File Chat (.csv, .xlsx, .json)
              </h3>
            </div>
            <p style={{ color: "#64748B", fontSize: 12.5, marginBottom: 14 }}>
              Tải lên file lịch sử chat được xuất ra từ Call Center hoặc CRM. Hỗ trợ Excel, CSV, JSON, TXT.
            </p>

            {/* Sample Templates & Guide Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 14,
              padding: "10px 14px",
              background: "#F8FAFC",
              borderRadius: 12,
              border: "1px solid #E2E8F0"
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                <Download size={14} style={{ color: "#0055A5" }} /> Tải File Mẫu Soạn Sẵn:
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => downloadSampleFile("csv")}
                  style={{
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    border: "1px solid #BFDBFE",
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
                  .CSV / .XLSX
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleFile("json")}
                  style={{
                    background: "#FEF3C7",
                    color: "#B45309",
                    border: "1px solid #FDE68A",
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
                  .JSON
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleFile("txt")}
                  style={{
                    background: "#F3E8FF",
                    color: "#7E22CE",
                    border: "1px solid #E9D5FF",
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
                  .TXT
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  style={{
                    background: "#F1F5F9",
                    color: "#0F172A",
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
                  <HelpCircle size={13} /> Hướng dẫn
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const f = e.dataTransfer.files[0];
                  setSelectedFile(f);
                }
              }}
              style={{
                border: "2px dashed #CBD5E1",
                borderRadius: 16,
                padding: "28px 20px",
                textAlign: "center",
                background: "#F8FAFC",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onClick={() => {
                const el = document.getElementById("file-input");
                if (el) el.click();
              }}
            >
              <FileCode size={36} style={{ color: "#0055A5", margin: "0 auto 12px" }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>
                Kéo thả file vào đây hoặc bấm chọn file
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                Hỗ trợ .CSV, .XLSX, .JSON, .TXT (Tối đa 25MB)
              </div>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls,.json,.txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setSelectedFile(f);
                  }
                }}
              />
            </div>

            {selectedFile && (
              <div style={{
                marginTop: 16,
                padding: "14px 16px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#EFF6FF",
                      color: "#0055A5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 12
                    }}>
                      {selectedFile.name.split('.').pop()?.toUpperCase() || "FILE"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0F172A" }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748B" }}>
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
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={14} /> Xóa file
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleFileUpload(selectedFile)}
                  disabled={fileParsing}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #E4002B 0%, #C00020 100%)",
                    color: "white",
                    border: "none",
                    padding: "12px 20px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: fileParsing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 14px rgba(228, 0, 43, 0.25)"
                  }}
                >
                  {fileParsing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {fileParsing ? "Đang Phân tích File..." : "🚀 Phân tích File Chat bằng AI"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PREVIEW & ROLE TAGGING */}
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
                📂 Đã phân tích {parsedChatResults.length} cuộc hội thoại từ file! Vui lòng chọn cuộc chat cần xem:
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

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
            {/* Analysis Summary */}
            <div style={{
              background: "white",
              borderRadius: 20,
              padding: 24,
              border: "1px solid rgba(0,0,0,0.06)",
              height: "fit-content"
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px", color: "#1E293B" }}>
                📊 Đánh giá Đoạn Chat
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
                  Điểm Chất lượng Hội thoại
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
                  <div style={{ fontSize: 12, color: "#64748B" }}>Đã xóa PII nhạy cảm</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                    {analysisResult.pii_redacted_count} thông tin (SĐT/CCCD)
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
                  <div style={{ fontSize: 12, color: "#64748B" }}>Trích xuất thành công</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                    {analysisResult.extracted_qa_list.length} Cặp Hỏi-Đáp chuẩn
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
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(0,85,165,0.25)"
                }}
              >
                Tiếp tục: Duyệt Tri thức <ArrowRight size={15} />
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
                  Hội thoại đã Phân vai & Bảo mật PII ({analysisResult.sanitized_messages.length} tin nhắn)
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
                {analysisResult.sanitized_messages.filter(m => m.speaker !== "agent" && m.speaker !== "customer").length > 0 && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B", background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "3px 10px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Settings size={13} /> Hệ thống: {analysisResult.sanitized_messages.filter(m => m.speaker !== "agent" && m.speaker !== "customer").length} tin nhắn
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {analysisResult.sanitized_messages.map((msg, idx) => {
                  const isAgent = msg.speaker === "agent";
                  const isCustomer = msg.speaker === "customer";
                  const isSystem = !isAgent && !isCustomer;

                  if (isSystem) {
                    return (
                      <div key={idx} style={{ textAlign: "center" }}>
                        <span style={{
                          fontSize: 11,
                          color: "#94A3B8",
                          background: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontStyle: "italic",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <Settings size={12} /> {msg.speaker}: {msg.text}
                        </span>
                      </div>
                    );
                  }

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
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: isAgent ? "#0055A5" : "#E4002B",
                        marginBottom: 4
                      }}>
                        {isAgent ? <span className="inline-flex items-center gap-1"><UserCheck size={13} /> Nhân viên CSKH MobiFone</span> : <span className="inline-flex items-center gap-1"><User size={13} /> Khách hàng</span>}
                      </div>

                      <div style={{
                        maxWidth: "80%",
                        padding: "12px 16px",
                        borderRadius: isAgent ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        background: isAgent ? "#EFF6FF" : "#FFF1F2",
                        border: isAgent ? "1px solid #BFDBFE" : "1px solid #FECDD3",
                        color: "#1E293B",
                        fontSize: 13,
                        lineHeight: 1.5
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXTRACTED KNOWLEDGE & SALES TACTICS */}
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
                📂 Đã phân tích {parsedChatResults.length} cuộc hội thoại từ file! Đang duyệt tri thức cho:
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

          {/* Section 1: Q&A Extraction */}
          <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "#0055A5" }} />
                  Cặp Hỏi - Đáp Thực chiến ({qaList.length})
                </h4>
                <p style={{ color: "#64748B", fontSize: 12.5, marginTop: 4, margin: 0 }}>
                  Chọn các cặp Hỏi - Đáp chất lượng cao để AI tự động học và nạp vào Kho tri thức ChromaDB & Playbook Sales.
                </p>
              </div>

              <button
                onClick={handleApproveQA}
                disabled={approving || qaList.filter(q => q.selected).length === 0}
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: approving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)"
                }}
              >
                {approving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {approving ? "Đang Nạp vào Kho Tri thức..." : `Duyệt & Nạp (${qaList.filter(q => q.selected).length}) vào Kho Tri thức`}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {qaList.map((qa, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const newQa = [...qaList];
                    newQa[idx].selected = !newQa[idx].selected;
                    setQaList(newQa);
                  }}
                  style={{
                    border: qa.selected ? "2px solid #0055A5" : "1px solid #E2E8F0",
                    borderRadius: 16,
                    padding: 16,
                    background: qa.selected ? "#F0F7FF" : "#F8FAFC",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: qa.selected ? "none" : "2px solid #CBD5E1",
                      background: qa.selected ? "#0055A5" : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      marginTop: 2
                    }}>
                      {qa.selected && <Check size={14} />}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{
                          background: "#0055A5",
                          color: "white",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 10
                        }}>
                          {qa.intent || "Hỏi đáp"}
                        </span>
                        {qa.sales_stage && (
                          <span style={{
                            background: qa.sales_stage === "xu_ly_tu_choi_gia" ? "#FEF3C7" : qa.sales_stage === "chot_don_closing" ? "#D1FAE5" : "#EFF6FF",
                            color: qa.sales_stage === "xu_ly_tu_choi_gia" ? "#92400E" : qa.sales_stage === "chot_don_closing" ? "#065F46" : "#1D4ED8",
                            border: "1px solid rgba(0,0,0,0.08)",
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}>
                            {qa.sales_stage === "xu_ly_tu_choi_gia" ? <><Lightbulb size={12} /> Xử lý từ chối giá</> :
                             qa.sales_stage === "chot_don_closing" ? <><Target size={12} /> Chốt đơn Sales</> :
                             qa.sales_stage === "khach_phan_nan" ? <><Shield size={12} /> Xoa dịu khiếu nại</> :
                             qa.sales_stage === "upsell_cross_sell" ? <><Rocket size={12} /> Upsell gói cước</> :
                             qa.sales_stage === "so_sanh_doi_thu" ? <><Swords size={12} /> So sánh đối thủ</> : <><Search size={12} /> Khám phá nhu cầu</>}
                          </span>
                        )}
                        {qa.package_name && (
                          <span style={{
                            background: "#E4002B",
                            color: "white",
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 10
                          }}>
                            Gói {qa.package_name}
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <HelpCircle size={15} className="text-[#0055A5] shrink-0" /> {qa.question}
                      </div>

                      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, background: "white", padding: 12, borderRadius: 10, border: "1px solid #E2E8F0", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                          <MessageSquare size={14} className="text-slate-500" /> <strong>Trả lời CSKH:</strong>
                        </div>
                        {qa.answer}
                      </div>

                      {qa.sales_tactic && (
                        <div style={{ fontSize: 11.5, color: "#0284C7", background: "#F0F9FF", padding: "6px 10px", borderRadius: 8, border: "1px solid #BAE6FD", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                          <Zap size={13} className="text-sky-600 shrink-0" /> <strong>Kỹ thuật tư vấn:</strong> {qa.sales_tactic}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Sales Tactics */}
          {tacticsList.length > 0 && (
            <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 16px", color: "#1E293B", display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={18} style={{ color: "#E4002B" }} />
                Kịch bản Xử lý Từ chối & Bán hàng Chuyên nghiệp ({tacticsList.length})
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {tacticsList.map((tac, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #FED7AA",
                      borderRadius: 16,
                      padding: 16,
                      background: "#FFF7ED"
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#C2410C", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                      Tình huống: Khách hàng phân vân / Chê đắt
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "#9A3412", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <MessageCircle size={14} className="text-amber-700 shrink-0" /> "{tac.customer_objection}"
                    </div>
                    <div style={{ fontSize: 12.5, color: "#431407", background: "white", padding: 10, borderRadius: 10, border: "1px solid #FFEDD5", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <Target size={14} className="text-amber-600 mt-0.5 shrink-0" /> <div><strong>Chiến thuật nhân viên:</strong> {tac.agent_strategy}</div>
                    </div>
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
                        <th style={{ padding: "8px 12px" }}>Tên Cột Nhận Diện</th>
                        <th style={{ padding: "8px 12px" }}>Giá Trị Mẫu</th>
                        <th style={{ padding: "8px 12px" }}>Mô Tả</th>
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
