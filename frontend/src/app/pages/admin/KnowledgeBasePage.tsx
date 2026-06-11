import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, Search, FileText, File,
  CheckCircle2, Loader2, AlertCircle, Trash2,
  RefreshCw, CloudUpload, Activity
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

type DocStatus = "Synced" | "vectorizing" | "chunking" | "error";

type Doc = {
  name: string;
  type: string;
  size: string;
  status: DocStatus;
  progress: number;
  upload_date: string;
  vectors: number;
  chunks: number;
};

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Synced: { label: "Đã đồng bộ", color: "#16A34A", bg: "#DCFCE7", icon: CheckCircle2 },
  vectorizing: { label: "Đang phân tích", color: "#0055A5", bg: "#EFF6FF", icon: Loader2 },
  chunking: { label: "Đang phân đoạn", color: "#D97706", bg: "#FEF3C7", icon: Loader2 },
  error: { label: "Lỗi nạp", color: "#DC2626", bg: "#FEE2E2", icon: AlertCircle },
};

const TYPE_COLORS: Record<string, string> = {
  PDF: "#EF4444",
  JSON: "#0055A5",
  TXT: "#64748B",
  DOCX: "#2563EB",
  DOC: "#2563EB",
  XLSX: "#16A34A",
  XLS: "#16A34A",
  DEFAULT: "#475569"
};

function getFileTypeColor(type: string): string {
  return TYPE_COLORS[type.toUpperCase()] || TYPE_COLORS.DEFAULT;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden", width: 80 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 3 }}
      />
    </div>
  );
}

function DropZone({ onUpload, uploading }: { onUpload: (file: globalThis.File) => void; uploading: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length > 0) onUpload(e.dataTransfer.files[0]); }}
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#0055A5" : "#CBD5E1"}`,
        borderRadius: 16,
        padding: "40px 24px",
        textAlign: "center",
        cursor: uploading ? "not-allowed" : "pointer",
        background: dragging ? "rgba(0,85,165,0.04)" : "#FAFAFA",
        opacity: uploading ? 0.6 : 1,
        transition: "all 0.2s",
        marginBottom: 24,
      }}
    >
      <input ref={inputRef} type="file" accept=".pdf,.json,.txt,.docx,.doc,.xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} disabled={uploading} />
      <motion.div animate={{ y: dragging ? -4 : 0 }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: dragging ? "rgba(0,85,165,0.1)" : "#F1F5F9",
            border: `1.5px solid ${dragging ? "#0055A5" : "#E2E8F0"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            transition: "all 0.2s",
          }}
        >
          {uploading ? (
            <Activity size={24} style={{ color: "#0055A5", animation: "spin 2s linear infinite" }} />
          ) : (
            <CloudUpload size={24} style={{ color: dragging ? "#0055A5" : "#94A3B8" }} />
          )}
        </div>
        <div style={{ color: dragging ? "#0055A5" : "#334155", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          {uploading ? "Đang xử lý tải lên tài liệu tri thức..." : dragging ? "Thả file vào đây" : "Kéo & thả file tài liệu vào đây"}
        </div>
        <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 14 }}>
          {uploading ? "AI đang lập chỉ mục vector và trích xuất dữ liệu" : "hoặc nhấn để duyệt file · TXT, JSON, PDF, WORD, EXCEL"}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {["PDF", "JSON", "TXT", "DOCX", "XLSX"].map(t => (
            <span
              key={t}
              style={{
                background: `${getFileTypeColor(t)}12`,
                color: getFileTypeColor(t),
                border: `1px solid ${getFileTypeColor(t)}30`,
                borderRadius: 6, padding: "2px 10px",
                fontSize: 11, fontWeight: 700,
              }}
            >
              .{t.toLowerCase()}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function KnowledgeBasePage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DocStatus>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/login");
    }
  }, [user, navigate]);

  const loadDocs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const response = await axios.get("http://localhost:3000/chat/documents", config);
      setDocs(response.data || []);
    } catch (error) {
      console.error("Lỗi khi tải tài liệu tri thức:", error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [token]);

  const handleUpload = async (file: globalThis.File) => {
    if (!token) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    // Thêm tạm thời file vào list với trạng thái loading
    const tempDocName = file.name;
    const extension = tempDocName.split(".").pop()?.toUpperCase() || "TXT";
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`;

    const tempDoc: Doc = {
      name: tempDocName,
      type: extension,
      size: sizeStr,
      status: "chunking",
      progress: 40,
      upload_date: "Hôm nay",
      vectors: 0,
      chunks: 0
    };

    setDocs(prev => [tempDoc, ...prev]);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
      };
      await axios.post("http://localhost:3000/chat/upload", formData, config);
      // reload lists
      const response = await axios.get("http://localhost:3000/chat/documents", { headers: { Authorization: `Bearer ${token}` } });
      setDocs(response.data || []);
    } catch (error) {
      console.error("Lỗi khi tải tài liệu lên:", error);
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.message : "Vui lòng kiểm tra lại cấu hình.";
      alert(`Lỗi upload tài liệu: ${errMsg}`);
      // Xoá tài liệu bị lỗi khỏi danh sách tạm thời
      setDocs(prev => prev.filter(d => d.name !== tempDocName));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docName: string) => {
    if (!token) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài liệu '${docName}' khỏi cơ sở tri thức?`)) {
      return;
    }

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.delete(`http://localhost:3000/chat/documents/${encodeURIComponent(docName)}`, config);
      setDocs(prev => prev.filter(d => d.name !== docName));
    } catch (error) {
      console.error("Lỗi khi xóa tài liệu:", error);
      alert("Không thể xóa tài liệu. Vui lòng thử lại!");
    }
  };

  const totalVectors = docs.filter(d => d.status === "Synced").reduce((a, d) => a + d.vectors, 0);
  const totalDocs = docs.filter(d => d.status === "Synced").length;

  const filtered = docs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Cơ sở tri thức (Knowledge Base)</h1>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Đã lập chỉ mục <span style={{ color: "#0055A5", fontWeight: 700 }}>{totalVectors.toLocaleString()}</span> vectors ·{" "}
            <span style={{ color: "#0055A5", fontWeight: 700 }}>{totalDocs}</span> tài liệu đã đồng bộ trong ChromaDB
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={loadDocs}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10,
              background: "white", border: "1.5px solid #E2E8F0",
              color: "#64748B", fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 2s linear infinite" : "none" }} /> Tải lại
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng tài liệu", value: docs.length, color: "#0055A5" },
          { label: "Đã đồng bộ", value: docs.filter(d => d.status === "Synced").length, color: "#22C55E" },
          { label: "Đang xử lý", value: docs.filter(d => ["chunking","vectorizing"].includes(d.status)).length, color: "#F59E0B" },
          { label: "Tổng số Vectors", value: totalVectors.toLocaleString(), color: "#8B5CF6" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #F1F5F9", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ color: "#64748B", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ color: s.color, fontSize: "1.5rem", fontWeight: 900 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <DropZone onUpload={handleUpload} uploading={uploading} />

      {/* Search & filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10,
            padding: "0 14px", height: 40, flex: 1, minWidth: 200,
          }}
        >
          <Search size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
          <input
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#334155", fontFamily: "'Outfit', sans-serif" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "white", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: 3 }}>
          {(["all", "Synced", "vectorizing", "chunking", "error"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 12px", borderRadius: 8,
                border: "none",
                background: filter === s ? "#0055A5" : "transparent",
                color: filter === s ? "white" : "#64748B",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
                textTransform: "capitalize",
              }}
            >
              {s === "all" ? "Tất cả" : s === "Synced" ? "Đã đồng bộ" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #F1F5F9", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAFA", borderBottom: "1px solid #F1F5F9" }}>
              {["Tài liệu", "Loại", "Kích thước", "Trạng thái", "Tiến độ", "Vectors", "Ngày tải", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((doc) => {
                const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.Synced;
                const StIcon = st.icon;
                return (
                  <motion.tr
                    key={doc.name}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{ borderTop: "1px solid #F8FAFC" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#FAFAFA"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${getFileTypeColor(doc.type)}12`, border: `1px solid ${getFileTypeColor(doc.type)}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <FileText size={16} style={{ color: getFileTypeColor(doc.type) }} />
                        </div>
                        <div>
                          <div style={{ color: "#0F172A", fontWeight: 600, fontSize: 13, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                          <div style={{ color: "#94A3B8", fontSize: 11 }}>{doc.chunks > 0 ? `${doc.chunks} đoạn` : "Đang xử lý..."}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: `${getFileTypeColor(doc.type)}12`, color: getFileTypeColor(doc.type), border: `1px solid ${getFileTypeColor(doc.type)}30`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {doc.type}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: 13, whiteSpace: "nowrap" }}>{doc.size}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: st.bg, border: `1px solid ${st.color}30`, borderRadius: 8, padding: "3px 10px" }}>
                        <StIcon size={11} style={{ color: st.color, animation: ["vectorizing","chunking"].includes(doc.status) ? "spin 1s linear infinite" : "none" }} />
                        <span style={{ color: st.color, fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ProgressBar pct={doc.progress} color={st.color} />
                        <span style={{ color: "#64748B", fontSize: 11, fontWeight: 600, minWidth: 30 }}>{doc.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: doc.vectors > 0 ? "#0F172A" : "#94A3B8", fontSize: 13, fontWeight: doc.vectors > 0 ? 600 : 400 }}>
                      {doc.vectors > 0 ? doc.vectors.toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: 12, whiteSpace: "nowrap" }}>{doc.upload_date}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleDelete(doc.name)}
                          style={{ background: "none", border: "1px solid #FEE2E2", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#EF4444" }}
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "#94A3B8" }}>
            <File size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p>Không tìm thấy tài liệu nào trong ChromaDB</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
