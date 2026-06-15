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

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  Synced: { label: "Đã đồng bộ", color: "#10B981", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)", icon: CheckCircle2 },
  vectorizing: { label: "Đang phân tích", color: "#0055A5", bg: "rgba(0, 85, 165, 0.08)", border: "rgba(0, 85, 165, 0.2)", icon: Loader2 },
  chunking: { label: "Đang phân đoạn", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)", icon: Loader2 },
  error: { label: "Lỗi nạp", color: "#EF4444", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)", icon: AlertCircle },
};

const TYPE_COLORS: Record<string, string> = {
  PDF: "#EF4444",
  JSON: "#0055A5",
  TXT: "#64748B",
  DOCX: "#2563EB",
  DOC: "#2563EB",
  XLSX: "#10B981",
  XLS: "#10B981",
  DEFAULT: "#475569"
};

function getFileTypeColor(type: string): string {
  return TYPE_COLORS[type.toUpperCase()] || TYPE_COLORS.DEFAULT;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden", width: 80 }}>
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
      className="admin-card"
      style={{
        border: `2px dashed ${dragging ? "#0055A5" : "#E2E8F0"}`,
        padding: "48px 24px",
        textAlign: "center",
        cursor: uploading ? "not-allowed" : "pointer",
        background: dragging ? "rgba(0,85,165,0.03)" : "rgba(255, 255, 255, 0.4)",
        opacity: uploading ? 0.6 : 1,
        transition: "all 0.25s",
        marginBottom: 20,
      }}
    >
      <input ref={inputRef} type="file" accept=".pdf,.json,.txt,.docx,.doc,.xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} disabled={uploading} />
      <motion.div animate={{ y: dragging ? -4 : 0 }}>
        <div
          style={{
            width: 60, height: 60, borderRadius: "50%",
            background: dragging ? "rgba(0,85,165,0.1)" : "#F1F5F9",
            border: `1.5px solid ${dragging ? "#0055A5" : "#E2E8F0"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            transition: "all 0.2s",
          }}
        >
          {uploading ? (
            <Activity size={24} style={{ color: "#0055A5", animation: "spin 2s linear infinite" }} />
          ) : (
            <CloudUpload size={24} style={{ color: dragging ? "#0055A5" : "#94A3B8" }} />
          )}
        </div>
        <div style={{ color: dragging ? "#0055A5" : "#334155", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
          {uploading ? "Đang xử lý tài liệu tri thức..." : dragging ? "Thả file để bắt đầu tải lên" : "Kéo & thả file tài liệu tri thức tại đây"}
        </div>
        <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 18 }}>
          {uploading ? "AI đang lập chỉ mục vector và trích xuất dữ liệu" : "hoặc nhấn để duyệt tệp từ máy tính · TXT, JSON, PDF, WORD, EXCEL"}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {["PDF", "JSON", "TXT", "DOCX", "XLSX"].map(t => (
            <span
              key={t}
              style={{
                background: `${getFileTypeColor(t)}10`,
                color: getFileTypeColor(t),
                border: `1px solid ${getFileTypeColor(t)}25`,
                borderRadius: 8, padding: "3px 12px",
                fontSize: 10, fontWeight: 800,
              }}
            >
              .{t.toUpperCase()}
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
      const response = await axios.get("http://localhost:3000/chat/documents", { headers: { Authorization: `Bearer ${token}` } });
      setDocs(response.data || []);
    } catch (error) {
      console.error("Lỗi khi tải tài liệu lên:", error);
      const errMsg = axios.isAxiosError(error) ? error.response?.data?.message : "Vui lòng kiểm tra lại cấu hình.";
      alert(`Lỗi upload tài liệu: ${errMsg}`);
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
    <div style={{ fontFamily: "'Outfit', sans-serif", display: "flex", flexDirection: "column", gap: 20, paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
        <div>
          <h1 style={{ color: "#0F172A", fontWeight: 900, fontSize: 24, margin: 0 }}>Cơ sở tri thức (Knowledge Base)</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0 0" }}>
            Đã lập chỉ mục <span style={{ color: "#0055A5", fontWeight: 800 }}>{totalVectors.toLocaleString()}</span> vectors trong ChromaDB từ <span style={{ color: "#0055A5", fontWeight: 800 }}>{totalDocs}</span> tài liệu.
          </p>
        </div>
        <button
          onClick={loadDocs}
          className="gradient-btn-primary"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0, 85, 165, 0.2)"
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 2s linear infinite" : "none" }} /> Tải lại danh sách
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { label: "Tổng số tài liệu", value: docs.length, color: "#0055A5" },
          { label: "Đã đồng bộ", value: docs.filter(d => d.status === "Synced").length, color: "#10B981" },
          { label: "Đang đồng bộ", value: docs.filter(d => ["chunking","vectorizing"].includes(d.status)).length, color: "#F59E0B" },
          { label: "Tổng số Vectors", value: totalVectors.toLocaleString(), color: "#8B5CF6" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #F1F5F9", borderLeft: `3.5px solid ${s.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ color: s.color, fontSize: "1.6rem", fontWeight: 900 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <DropZone onUpload={handleUpload} uploading={uploading} />

      {/* Search & filter */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
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
        <div style={{ display: "flex", gap: 4, background: "rgba(241, 245, 249, 0.8)", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: 3 }}>
          {(["all", "Synced", "vectorizing", "chunking", "error"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "6px 12px", borderRadius: 8,
                border: "none",
                background: filter === s ? "#0055A5" : "transparent",
                color: filter === s ? "white" : "#64748B",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
              }}
            >
              {s === "all" ? "Tất cả" : s === "Synced" ? "Đã đồng bộ" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="admin-card" style={{ background: "white", overflow: "auto", padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94A3B8" }}>
            <File size={36} style={{ marginBottom: 12, opacity: 0.4, color: "#64748B", margin: "0 auto" }} />
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Không tìm thấy tài liệu nào trong cơ sở tri thức</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead style={{ background: "#F8FAFC" }}>
              <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                {["Tài liệu", "Loại", "Kích thước", "Trạng thái", "Tiến độ", "Vectors", "Ngày tải", ""].map(h => (
                  <th key={h} style={{ padding: "14px 18px", textAlign: "left", color: "#64748B", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
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
                      style={{ borderBottom: "1px solid #F8FAFC" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#FAFAFA"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${getFileTypeColor(doc.type)}08`, border: `1px solid ${getFileTypeColor(doc.type)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText size={15} style={{ color: getFileTypeColor(doc.type) }} />
                          </div>
                          <div>
                            <div style={{ color: "#0F172A", fontWeight: 700, fontSize: 13, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                            <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>{doc.chunks > 0 ? `${doc.chunks} đoạn` : "Đang xử lý..."}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ background: `${getFileTypeColor(doc.type)}08`, color: getFileTypeColor(doc.type), border: `1px solid ${getFileTypeColor(doc.type)}15`, borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 800 }}>
                          {doc.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", color: "#475569", fontSize: 13, whiteSpace: "nowrap" }}>{doc.size}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 8, padding: "3px 8px" }}>
                          <StIcon size={11} style={{ color: st.color, animation: ["vectorizing","chunking"].includes(doc.status) ? "spin 1s linear infinite" : "none" }} />
                          <span style={{ color: st.color, fontSize: 10, fontWeight: 800 }}>{st.label.toUpperCase()}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ProgressBar pct={doc.progress} color={st.color} />
                          <span style={{ color: "#64748B", fontSize: 11, fontWeight: 700, minWidth: 30 }}>{doc.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", color: doc.vectors > 0 ? "#0F172A" : "#94A3B8", fontSize: 13, fontWeight: doc.vectors > 0 ? 700 : 400 }}>
                        {doc.vectors > 0 ? doc.vectors.toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "14px 18px", color: "#94A3B8", fontSize: 12, whiteSpace: "nowrap" }}>{doc.upload_date}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <button
                          onClick={() => handleDelete(doc.name)}
                          style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#EF4444", transition: "all 0.2s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#EF4444"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#EF4444"; }}
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
