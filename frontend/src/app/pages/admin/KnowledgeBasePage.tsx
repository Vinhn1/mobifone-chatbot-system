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

const STATUS_CONFIG: Record<DocStatus, { label: string; textClass: string; bgClass: string; borderClass: string; icon: React.ElementType }> = {
  Synced: { label: "Đã đồng bộ", textClass: "text-emerald-600", bgClass: "bg-emerald-50/70", borderClass: "border-emerald-100", icon: CheckCircle2 },
  vectorizing: { label: "Đang phân tích", textClass: "text-[#0055A5]", bgClass: "bg-blue-50/70", borderClass: "border-blue-100/60", icon: Loader2 },
  chunking: { label: "Đang phân đoạn", textClass: "text-amber-600", bgClass: "bg-amber-50/70", borderClass: "border-amber-100/60", icon: Loader2 },
  error: { label: "Lỗi nạp", textClass: "text-red-600", bgClass: "bg-red-50/70", borderClass: "border-red-100", icon: AlertCircle },
};

const TYPE_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  PDF: { text: "text-red-500", bg: "bg-red-50/80", border: "border-red-100" },
  JSON: { text: "text-blue-600", bg: "bg-blue-50/80", border: "border-blue-100" },
  TXT: { text: "text-slate-500", bg: "bg-slate-50/80", border: "border-slate-100" },
  DOCX: { text: "text-indigo-600", bg: "bg-indigo-50/80", border: "border-indigo-100" },
  DOC: { text: "text-indigo-600", bg: "bg-indigo-50/80", border: "border-indigo-100" },
  PPTX: { text: "text-orange-600", bg: "bg-orange-50/80", border: "border-orange-100" },
  PPT: { text: "text-orange-600", bg: "bg-orange-50/80", border: "border-orange-100" },
  XLSX: { text: "text-emerald-600", bg: "bg-emerald-50/80", border: "border-emerald-100" },
  XLS: { text: "text-emerald-600", bg: "bg-emerald-50/80", border: "border-emerald-100" },
  DEFAULT: { text: "text-slate-500", bg: "bg-slate-50/80", border: "border-slate-100" }
};

function getFileTypeStyle(type: string) {
  return TYPE_STYLES[type.toUpperCase()] || TYPE_STYLES.DEFAULT;
}

function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${colorClass}`}
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
      className={`rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
        dragging
          ? "border-[#0055A5] bg-[#0055A5]/5 shadow-inner"
          : "border-slate-200 bg-white/40 hover:border-slate-300 hover:bg-white/60"
      } ${uploading ? "opacity-60 cursor-not-allowed" : "opacity-100"}`}
    >
      <input ref={inputRef} type="file" accept=".pdf,.json,.txt,.docx,.doc,.pptx,.ppt,.xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={uploading} />
      <motion.div animate={{ y: dragging ? -4 : 0 }}>
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border transition-all duration-200 ${
            dragging
              ? "bg-[#0055A5]/10 border-[#0055A5] text-[#0055A5]"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}
        >
          {uploading ? (
            <Activity size={24} className="animate-spin text-[#0055A5]" />
          ) : (
            <CloudUpload size={24} className={dragging ? "text-[#0055A5]" : "text-slate-400"} />
          )}
        </div>
        <div className={`font-extrabold text-sm sm:text-base mb-1 ${dragging ? "text-[#0055A5]" : "text-slate-700"}`}>
          {uploading ? "Đang xử lý tài liệu tri thức..." : dragging ? "Thả file để bắt đầu tải lên" : "Kéo & thả file tài liệu tri thức tại đây"}
        </div>
        <div className="text-slate-400 text-xs font-semibold mb-5">
          {uploading ? "AI đang lập chỉ mục vector và trích xuất dữ liệu" : "hoặc nhấn để duyệt tệp từ máy tính · TXT, JSON, PDF, WORD, POWERPOINT, EXCEL"}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          {["PDF", "JSON", "TXT", "DOCX", "PPTX", "XLSX"].map(t => {
            const style = getFileTypeStyle(t);
            return (
              <span
                key={t}
                className={`border rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
              >
                .{t}
              </span>
            );
          })}
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
    if (!user) {
      navigate("/login");
    } else if (user.role !== "admin") {
      navigate("/admin");
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

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const { type, payload } = (e as CustomEvent).detail;
      if (type === 'doc-status') {
        setDocs(prev => {
          const docName = payload.name;
          const extension = docName.split(".").pop()?.toUpperCase() || "TXT";
          const exists = prev.some(d => d.name === docName);

          const statusMapped: DocStatus = 
            payload.status === 'synced' ? 'Synced' :
            payload.status === 'error' ? 'error' :
            'vectorizing';

          if (exists) {
            return prev.map(d => {
              if (d.name === docName) {
                return {
                  ...d,
                  status: statusMapped,
                  progress: payload.progress,
                };
              }
              return d;
            });
          } else {
            const newDoc: Doc = {
              name: docName,
              type: extension,
              size: "Đang tính...",
              status: statusMapped,
              progress: payload.progress,
              upload_date: "Vừa xong",
              vectors: 0,
              chunks: 0
            };
            return [newDoc, ...prev];
          }
        });

        if (payload.status === 'synced') {
          setTimeout(() => {
            loadDocs();
          }, 1500);
        }
      }
    };
    window.addEventListener('app-notification', handleNotification);
    return () => window.removeEventListener('app-notification', handleNotification);
  }, []);

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

  const parseDocDate = (d: Doc) => {
    if (d.status === "chunking" || d.status === "vectorizing") return Infinity;
    if (d.upload_date === "Vừa xong" || d.upload_date === "Hôm nay") return Infinity - 1;
    if (!d.upload_date || d.upload_date === "N/A") return 0;
    
    const parts = d.upload_date.split(" ");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1];
      const year = parseInt(parts[2], 10);
      const months: { [key: string]: number } = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const month = months[monthStr] !== undefined ? months[monthStr] : 0;
      return new Date(year, month, day).getTime();
    }
    return 0;
  };

  const filtered = docs
    .filter(d => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || d.status === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const diff = parseDocDate(b) - parseDocDate(a);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="font-outfit flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-2xl tracking-tight">Cơ sở tri thức (Knowledge Base)</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Đã lập chỉ mục <span className="text-[#0055A5] font-extrabold">{totalVectors.toLocaleString()}</span> vectors trong ChromaDB từ <span className="text-[#0055A5] font-extrabold">{totalDocs}</span> tài liệu.
          </p>
        </div>
        <button
          onClick={loadDocs}
          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#003B75] text-white border-none font-bold text-xs cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Tải lại danh sách
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng tài liệu", value: docs.length, color: "border-l-[#0055A5] text-[#0055A5]" },
          { label: "Đã đồng bộ", value: docs.filter(d => d.status === "Synced").length, color: "border-l-emerald-500 text-emerald-500" },
          { label: "Đang đồng bộ", value: docs.filter(d => ["chunking", "vectorizing"].includes(d.status)).length, color: "border-l-amber-500 text-amber-500" },
          { label: "Tổng số Vectors", value: totalVectors.toLocaleString(), color: "border-l-purple-500 text-purple-500" },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-4.5 border border-slate-200/50 border-l-4 ${s.color.split(" ")[0]} shadow-xs`}>
            <div className="text-slate-400 text-[9px] font-bold tracking-wider uppercase mb-1">{s.label}</div>
            <div className={`text-xl font-black ${s.color.split(" ")[1]}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <DropZone onUpload={handleUpload} uploading={uploading} />

      {/* Search & filter */}
      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3.5 py-2 w-full sm:max-w-xs shadow-xs focus-within:border-[#0055A5]/60 transition-colors">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-600 font-outfit"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 border border-slate-200/40 rounded-xl p-1 shrink-0">
          {(["all", "Synced", "vectorizing", "chunking", "error"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg border-none font-bold text-xs cursor-pointer transition-all ${
                filter === s
                  ? "bg-[#0055A5] text-white shadow-xs"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "Tất cả" : s === "Synced" ? "Đã đồng bộ" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
            <File size={36} className="opacity-45 text-slate-400" />
            <p className="text-sm">Không tìm thấy tài liệu nào trong cơ sở tri thức</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {["Tài liệu", "Loại", "Kích thước", "Trạng thái", "Tiến độ", "Vectors", "Ngày tải", ""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-slate-400 font-extrabold text-[10px] tracking-wider uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((doc) => {
                    const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.Synced;
                    const StIcon = st.icon;
                    const style = getFileTypeStyle(doc.type);
                    return (
                      <motion.tr
                        key={doc.name}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="border-b border-slate-100/80 hover:bg-slate-50/20 transition-colors duration-150"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${style.bg} ${style.border}`}>
                              <FileText size={14} className={style.text} />
                            </div>
                            <div>
                              <div className="text-slate-800 font-bold text-xs max-w-xs truncate">{doc.name}</div>
                              <div className="text-slate-400 text-[10px] font-bold mt-0.5">
                                {doc.chunks > 0 ? `${doc.chunks} đoạn` : "Đang xử lý..."}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`border rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-bold text-xs">{doc.size}</td>
                        <td className="px-5 py-3.5">
                          <div className={`inline-flex items-center gap-1.5 border rounded-lg px-2 py-0.5 ${st.bgClass} ${st.borderClass}`}>
                            <StIcon size={10} className={`${st.textClass} ${["vectorizing", "chunking"].includes(doc.status) ? "animate-spin" : ""}`} />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${st.textClass}`}>{st.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar pct={doc.progress} colorClass={doc.status === "Synced" ? "bg-emerald-500" : doc.status === "error" ? "bg-red-500" : doc.status === "chunking" ? "bg-amber-500" : "bg-[#0055A5]"} />
                            <span className="text-slate-400 text-[10px] font-bold min-w-7">{doc.progress}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-800 font-extrabold text-xs">
                          {doc.vectors > 0 ? doc.vectors.toLocaleString() : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{doc.upload_date}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(doc.name)}
                            className="bg-transparent border border-red-100 hover:bg-red-500 hover:text-white text-red-500 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
                            title="Xóa tài liệu"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
