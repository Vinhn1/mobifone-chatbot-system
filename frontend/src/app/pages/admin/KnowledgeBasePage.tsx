import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, FileText, File,
  CheckCircle2, Loader2, AlertCircle, Trash2,
  RefreshCw, CloudUpload, Activity, Globe, MessageSquareText,
  ChevronDown, Link2, Eye, X, Square, CheckSquare, Copy
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { API_BASE } from "../../../config";

// KnowledgeBasePage - Updated with Cookie & DOM Ingestion support
type DocStatus = "Synced" | "vectorizing" | "chunking" | "error";
type IngestType = "rag" | "conversation";

type Doc = {
  name: string;
  type: string;
  size: string;
  status: DocStatus;
  progress: number;
  upload_date: string;
  vectors: number;
  chunks: number;
  timestamp?: number;
  source_url?: string;
};

const STATUS_CONFIG: Record<DocStatus, { label: string; textClass: string; bgClass: string; borderClass: string; icon: React.ElementType }> = {
  Synced: { label: "Đã đồng bộ", textClass: "text-emerald-600", bgClass: "bg-emerald-50/70", borderClass: "border-emerald-100", icon: CheckCircle2 },
  vectorizing: { label: "Đang phân tích", textClass: "text-[#0055A5]", bgClass: "bg-blue-50/70", borderClass: "border-blue-100/60", icon: Loader2 },
  chunking: { label: "Đang phân đoạn", textClass: "text-amber-600", bgClass: "bg-amber-50/70", borderClass: "border-amber-100/60", icon: Loader2 },
  error: { label: "Lỗi nạp", textClass: "text-red-600", bgClass: "bg-red-50/70", borderClass: "border-red-100", icon: AlertCircle },
};

const TYPE_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  PDF:          { text: "text-red-500",      bg: "bg-red-50/80",      border: "border-red-100" },
  JSON:         { text: "text-blue-600",     bg: "bg-blue-50/80",     border: "border-blue-100" },
  TXT:          { text: "text-slate-500",    bg: "bg-slate-50/80",    border: "border-slate-100" },
  DOCX:         { text: "text-indigo-600",   bg: "bg-indigo-50/80",   border: "border-indigo-100" },
  DOC:          { text: "text-indigo-600",   bg: "bg-indigo-50/80",   border: "border-indigo-100" },
  PPTX:         { text: "text-orange-600",   bg: "bg-orange-50/80",   border: "border-orange-100" },
  PPT:          { text: "text-orange-600",   bg: "bg-orange-50/80",   border: "border-orange-100" },
  XLSX:         { text: "text-emerald-600",  bg: "bg-emerald-50/80",  border: "border-emerald-100" },
  XLS:          { text: "text-emerald-600",  bg: "bg-emerald-50/80",  border: "border-emerald-100" },
  WEB:          { text: "text-teal-600",     bg: "bg-teal-50/80",     border: "border-teal-200" },
  CONVERSATION: { text: "text-violet-600",   bg: "bg-violet-50/80",   border: "border-violet-200" },
  DEFAULT:      { text: "text-slate-500",    bg: "bg-slate-50/80",    border: "border-slate-100" },
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

function DropZone({
  onUpload,
  uploading,
}: {
  onUpload: (files: globalThis.File[]) => void;
  uploading: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(Array.from(e.dataTransfer.files));
          }
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
          dragging
            ? "border-[#0055A5] bg-[#0055A5]/5 shadow-inner"
            : "border-slate-200 bg-white/40 hover:border-slate-300 hover:bg-white/60"
        } ${uploading ? "opacity-60 cursor-not-allowed" : "opacity-100"}`}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.json,.txt,.docx,.doc,.pptx,.ppt,.xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={uploading} />
        <motion.div animate={{ y: dragging ? -4 : 0 }}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border transition-all duration-200 ${
            dragging
              ? "bg-[#0055A5]/10 border-[#0055A5] text-[#0055A5]"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}>
            {uploading
              ? <Activity size={24} className="animate-spin text-[#0055A5]" />
              : <CloudUpload size={24} className={dragging ? "text-[#0055A5]" : "text-slate-400"} />
            }
          </div>
          <div className={`font-extrabold text-sm sm:text-base mb-1 ${dragging ? "text-[#0055A5]" : "text-slate-700"}`}>
            {uploading ? "Đang xử lý các tài liệu tri thức..." : dragging ? "Thả (các) file để bắt đầu tải lên" : "Kéo & thả một hoặc nhiều file tài liệu tri thức tại đây"}
          </div>
          <div className="text-slate-400 text-xs font-semibold mb-5">
            {uploading ? "AI đang lập chỉ mục vector và trích xuất dữ liệu" : "hoặc nhấn để duyệt các tệp từ máy tính (hỗ trợ chọn nhiều file)"}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {["PDF","JSON","TXT","DOCX","PPTX","XLSX"].map(t => {
              const style = getFileTypeStyle(t);
              return <span key={t} className={`border rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>.{t}</span>;
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function IngestUrlPanel({
  onIngest,
  loading
}: {
  onIngest: (url: string, cookies?: string, deepCrawl?: boolean) => Promise<void>;
  loading: boolean;
}) {
  const [url, setUrl] = useState("");
  const [deepCrawl, setDeepCrawl] = useState(true);
  const [focused, setFocused] = useState(false);
  const isValidUrl = url.trim().length > 8 && (url.startsWith("http://") || url.startsWith("https://") || url.includes("."));

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    await onIngest(url.trim(), undefined, deepCrawl);
    setUrl("");
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/60 p-5 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
          <Globe size={14} className="text-teal-600" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-800">Nạp dữ liệu từ URL trang web</div>
          <div className="text-[10px] text-slate-400 font-semibold">Tự động cào dữ liệu công khai & tự động qua rào cản đăng nhập</div>
        </div>
      </div>

      <form onSubmit={handleSubmitUrl} className="flex gap-2 items-center">
        <div className={`flex-1 flex items-center gap-2 bg-white border rounded-xl px-3.5 py-2.5 transition-all duration-200 ${focused ? "border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.08)]" : "border-slate-200"}`}>
          <Link2 size={13} className={`shrink-0 transition-colors ${focused ? "text-teal-500" : "text-slate-300"}`} />
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="https://noidungsohanoi.mobifone.vn/..."
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300 disabled:opacity-60"
          />
          {url && !loading && (
            <button type="button" onClick={() => setUrl("")} className="text-slate-300 hover:text-slate-500 transition-colors text-sm leading-none">&times;</button>
          )}
        </div>
        <motion.button
          type="submit"
          disabled={!isValidUrl || loading}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? <><Loader2 size={13} className="animate-spin" /><span>Đang crawl...</span></> : <><Globe size={13} /><span>Crawl & Nạp</span></>}
        </motion.button>
      </form>

      <div className="flex items-center justify-between px-1">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={deepCrawl}
            onChange={e => setDeepCrawl(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <span>Cào sâu các trang con (Deep Crawl — Thu thập toàn bộ bài viết & gói cước chi tiết trên domain)</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["www.mobifone.vn","mobifone.online","shop.mobifone.vn","dichvumobile.vn"].map(d => (
          <button key={d} type="button" onClick={() => setUrl(`https://${d}/`)}
            className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-2 py-0.5 hover:bg-teal-100 transition-colors">
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const style = getFileTypeStyle(type);
  const upper = type.toUpperCase();
  const Icon = upper === "WEB" ? Globe : upper === "CONVERSATION" ? MessageSquareText : FileText;
  return (
    <span className={`inline-flex items-center gap-1 border rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>
      <Icon size={9} />{upper}
    </span>
  );
}

type WebChunk = {
  chunk_index: number;
  text: string;
  metadata: any;
};

function WebPreviewModal({
  docName,
  onClose,
  token
}: {
  docName: string;
  onClose: () => void;
  token: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [chunks, setChunks] = useState<WebChunk[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchChunks = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API_BASE}/chat/documents/web-chunks`, {
          params: { name: docName },
          headers: { Authorization: `Bearer ${token}` }
        });
        setTitle(res.data.source_title || docName);
        setUrl(res.data.source_url || docName);
        setChunks(res.data.chunks || []);
      } catch (err: any) {
        const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchChunks();
  }, [docName, token]);

  const filteredChunks = chunks.filter(c =>
    c.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-teal-600 uppercase tracking-wider">Chi Tiết Tri Thức Website Đã Cào</div>
              <h3 className="text-slate-800 font-extrabold text-sm line-clamp-1" title={title}>{title}</h3>
              {url && <div className="text-[11px] text-slate-400 font-bold truncate max-w-md">{url}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2 font-bold">
              <Loader2 size={24} className="animate-spin text-teal-600" />
              <span>Đang đọc dữ liệu Vector Chunks từ CSDL...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span>Tổng số Vector Chunks:</span>
                  <span className="bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-lg font-extrabold">
                    {chunks.length} đoạn
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 w-64">
                  <Search size={12} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm trong nội dung..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {filteredChunks.map(chunk => (
                  <div
                    key={chunk.chunk_index}
                    className="p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/90 flex flex-col gap-2.5 hover:border-teal-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        <span>Đoạn Vector #{chunk.chunk_index}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {chunk.text.length} ký tự
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(chunk.text)}
                          title="Sao chép đoạn text này"
                          className="text-slate-400 hover:text-teal-600 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Copy size={11} /> Sao chép
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                      {chunk.text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
  const [sourceTab, setSourceTab] = useState<"rag" | "conversation">("rag");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingestType, setIngestType] = useState<IngestType>("rag");
  const [crawling, setCrawling] = useState(false);
  const [previewWebDocName, setPreviewWebDocName] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
    else if (user.role !== "admin" && user.role !== "sales") navigate("/admin");
  }, [user, navigate]);

  const loadDocs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/chat/documents`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout(); navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, [token]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { type, payload } = (e as CustomEvent).detail;
      if (type !== "doc-status") return;
      setDocs(prev => {
        const statusMapped: DocStatus = payload.status === "synced" ? "Synced" : payload.status === "error" ? "error" : "vectorizing";
        const exists = prev.some(d => d.name === payload.name);
        if (exists) return prev.map(d => d.name === payload.name ? { ...d, status: statusMapped, progress: payload.progress } : d);
        const ext = payload.name.split(".").pop()?.toUpperCase() || "TXT";
        return [{ name: payload.name, type: ext, size: "...", status: statusMapped, progress: payload.progress, upload_date: "Vua xong", vectors: 0, chunks: 0, timestamp: Date.now() }, ...prev];
      });
      if (payload.status === "synced") setTimeout(() => loadDocs(), 1500);
    };
    window.addEventListener("app-notification", handler);
    return () => window.removeEventListener("app-notification", handler);
  }, []);

  const handleUpload = async (files: globalThis.File[]) => {
    if (!token || !files || files.length === 0) return;
    setUploading(true);

    const tempDocs: Doc[] = files.map(file => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "TXT";
      return {
        name: file.name,
        type: ingestType === "conversation" ? "CONVERSATION" : ext,
        size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
        status: "chunking", progress: 40, upload_date: "Hôm nay", vectors: 0, chunks: 0, timestamp: Date.now(),
      };
    });

    setDocs(prev => [...tempDocs, ...prev]);

    const errorMessages: string[] = [];

    const uploadPromises = files.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("ingest_type", ingestType);
        await axios.post(`${API_BASE}/chat/upload`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error: any) {
        let msg = `Lỗi tải lên file '${file.name}'.`;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 413) msg = `File '${file.name}': Dung lượng vượt quá giới hạn 100MB.`;
          else if (error.response?.status === 504) msg = `File '${file.name}': Quá thời gian xử lý server.`;
          else {
            const d = error.response?.data;
            const detail = typeof d === "string" ? d : (d?.message || d?.detail || error.message);
            msg = `File '${file.name}': ${detail}`;
          }
        }
        errorMessages.push(msg);
        setDocs(prev => prev.filter(d => d.name !== file.name));
      }
    });

    await Promise.allSettled(uploadPromises);

    try {
      const res = await axios.get(`${API_BASE}/chat/documents`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
      setSourceTab(ingestType === "conversation" ? "conversation" : "rag");
    } catch {
      // Retain existing docs list if reload fails
    } finally {
      setUploading(false);
      if (errorMessages.length > 0) {
        alert(errorMessages.join("\n"));
      }
    }
  };

  const handleIngestUrl = async (url: string, cookies?: string, deepCrawl: boolean = false) => {
    if (!token) return;
    setCrawling(true);
    const tempName = url.length > 60 ? url.substring(0, 57) + "..." : url;
    setDocs(prev => [{ name: tempName, type: "WEB", size: deepCrawl ? "Đang cào sâu..." : "Đang crawl...", status: "vectorizing", progress: 20, upload_date: "Vừa xong", vectors: 0, chunks: 0, timestamp: Date.now(), source_url: url }, ...prev]);
    try {
      const res = await axios.post(`${API_BASE}/chat/ingest-url`, { url, cookies, deep_crawl: deepCrawl }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const data = res.data;
      setDocs(prev => prev.map(d => d.name === tempName ? { ...d, name: data.source_title || tempName, status: "Synced", progress: 100, size: `${data.chunks_count} đoạn` } : d));
      setSourceTab("rag");
      setTimeout(() => loadDocs(), 1500);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
      alert(`Lỗi crawl URL: ${detail}`);
      setDocs(prev => prev.filter(d => d.name !== tempName));
    } finally {
      setCrawling(false);
    }
  };

  const handleIngestHtml = async (title: string, htmlContent: string, sourceUrl?: string) => {
    if (!token) return;
    setCrawling(true);
    const tempName = title || "Nội dung DOM HTML";
    setDocs(prev => [{ name: tempName, type: "WEB", size: "Đang nạp DOM...", status: "vectorizing", progress: 40, upload_date: "Vừa xong", vectors: 0, chunks: 0, timestamp: Date.now() }, ...prev]);
    try {
      const res = await axios.post(`${API_BASE}/chat/ingest-html`, { source_title: title, html_content: htmlContent, source_url: sourceUrl }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const data = res.data;
      setDocs(prev => prev.map(d => d.name === tempName ? { ...d, name: data.source_title || tempName, status: "Synced", progress: 100, size: `${data.chunks_count} đoạn` } : d));
      setSourceTab("rag");
      setTimeout(() => loadDocs(), 1500);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
      alert(`Lỗi nạp HTML DOM: ${detail}`);
      setDocs(prev => prev.filter(d => d.name !== tempName));
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async (docItem: Doc) => {
    if (!token || !window.confirm(`Bạn có chắc chắn muốn xóa '${docItem.name}'?`)) return;
    const targetName = docItem.source_url || docItem.name;
    try {
      await axios.delete(`${API_BASE}/chat/documents`, {
        params: { name: targetName },
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Delete API returned error, attempting fallback:", err);
      try {
        await axios.delete(`${API_BASE}/chat/documents/${encodeURIComponent(targetName)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        // Suppress alert for items that weren't persisted in DB
      }
    } finally {
      setDocs(prev => prev.filter(d => {
        // Xóa đúng doc theo tên
        if (d.name === docItem.name) return false;
        // Với web doc (có source_url): cũng xóa nếu source_url trùng
        if (docItem.source_url && d.source_url === docItem.source_url) return false;
        return true;
      }));
      setSelectedDocs(prev => { const next = new Set(prev); next.delete(docItem.name); return next; });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocs.size === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedDocs.size} tài liệu đã chọn?`)) return;
    setDeletingMultiple(true);
    const toDelete = filtered.filter(d => selectedDocs.has(d.name));
    for (const docItem of toDelete) {
      const targetName = docItem.source_url || docItem.name;
      try {
        await axios.delete(`${API_BASE}/chat/documents`, {
          params: { name: targetName },
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        try {
          await axios.delete(`${API_BASE}/chat/documents/${encodeURIComponent(targetName)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch { /* suppress */ }
      }
    }
    setDocs(prev => prev.filter(d => !selectedDocs.has(d.name)));
    setSelectedDocs(new Set());
    setDeletingMultiple(false);
  };


  const toggleSelectDoc = (docName: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docName)) next.delete(docName);
      else next.add(docName);
      return next;
    });
  };



  const totalVectors = docs.filter(d => d.status === "Synced").reduce((a, d) => a + d.vectors, 0);
  const totalDocs = docs.filter(d => d.status === "Synced").length;

  const parseDocDate = (d: Doc) => {
    if (d.status === "chunking" || d.status === "vectorizing") return Infinity;
    if (d.timestamp) return d.timestamp > 1e11 ? d.timestamp : d.timestamp * 1000;
    if (!d.upload_date || d.upload_date === "N/A") return 0;
    const parts = d.upload_date.split(" ");
    if (parts.length === 3) {
      const months: { [k: string]: number } = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
      return new Date(+parts[2], months[parts[1]] ?? 0, +parts[0]).getTime();
    }
    return 0;
  };

  const filtered = docs
    .filter(d => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filter === "all" || d.status === filter;
      const isConv = d.type?.toUpperCase() === "CONVERSATION";
      const matchSource = sourceTab === "conversation" ? isConv : !isConv;
      return matchSearch && matchStatus && matchSource;
    })
    .sort((a, b) => { const diff = parseDocDate(b) - parseDocDate(a); return diff !== 0 ? diff : a.name.localeCompare(b.name); });

  const isAllSelected = filtered.length > 0 && filtered.every(d => selectedDocs.has(d.name));
  const isSomeSelected = filtered.some(d => selectedDocs.has(d.name));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocs(prev => {
        const next = new Set(prev);
        filtered.forEach(d => next.delete(d.name));
        return next;
      });
    } else {
      setSelectedDocs(prev => {
        const next = new Set(prev);
        filtered.forEach(d => next.add(d.name));
        return next;
      });
    }
  };

  return (
    <div className="font-outfit flex flex-col gap-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-2xl tracking-tight">Cơ sở tri thức</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Đã lập chỉ mục <span className="text-[#0055A5] font-extrabold">{totalVectors.toLocaleString()}</span> vectors từ <span className="text-[#0055A5] font-extrabold">{totalDocs}</span> tài liệu.
          </p>
        </div>
        <button onClick={loadDocs} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#003B75] text-white border-none font-bold text-xs cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Tải lại danh sách
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Tổng tài liệu", value: docs.length, color: "border-l-[#0055A5] text-[#0055A5]" },
          { label: "Đã đồng bộ",    value: docs.filter(d => d.status === "Synced").length, color: "border-l-emerald-500 text-emerald-500" },
          { label: "Đang xử lý",   value: docs.filter(d => ["chunking","vectorizing"].includes(d.status)).length, color: "border-l-amber-500 text-amber-500" },
          { label: "Trang web (WEB)", value: docs.filter(d => d.type?.toUpperCase() === "WEB").length, color: "border-l-teal-500 text-teal-500" },
          { label: "Chat mẫu (CONV)", value: docs.filter(d => d.type?.toUpperCase() === "CONVERSATION").length, color: "border-l-violet-500 text-violet-500" },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-4 border border-slate-200/50 border-l-4 ${s.color.split(" ")[0]} shadow-xs`}>
            <div className="text-slate-400 text-[9px] font-bold tracking-wider uppercase mb-1">{s.label}</div>
            <div className={`text-xl font-black ${s.color.split(" ")[1]}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <IngestUrlPanel onIngest={handleIngestUrl} loading={crawling} />

      <DropZone onUpload={handleUpload} uploading={uploading} />

      {/* Primary Source Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "rag", label: "Tài liệu RAG (Files & Web)", count: docs.filter(d => d.type?.toUpperCase() !== "CONVERSATION").length, icon: FileText, color: "text-emerald-600" },
            { id: "conversation", label: "Tri thức Chat CSKH (CONVERSATION)", count: docs.filter(d => d.type?.toUpperCase() === "CONVERSATION").length, icon: MessageSquareText, color: "text-violet-600" },
          ].map(tab => {
            const active = sourceTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSourceTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#0055A5] text-white shadow-sm"
                    : "bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/50"
                }`}
              >
                <Icon size={14} className={active ? "text-white" : tab.color} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  active ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {sourceTab === "conversation" && (
          <button
            onClick={() => navigate("/admin/chat-mining")}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <MessageSquareText size={13} />
            <span>Học từ Chat CSKH mới</span>
          </button>
        )}
      </div>

      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3.5 py-2 w-full sm:max-w-xs shadow-xs focus-within:border-[#0055A5]/60 transition-colors">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input placeholder="Tìm kiếm tài liệu..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-600" />
        </div>
        <div className="flex gap-1 bg-slate-100 border border-slate-200/40 rounded-xl p-1 shrink-0">
          {(["all", "Synced", "vectorizing", "chunking", "error"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg border-none font-bold text-xs cursor-pointer transition-all ${filter === s ? "bg-[#0055A5] text-white shadow-xs" : "bg-transparent text-slate-500 hover:text-slate-700"}`}>
              {s === "all" ? "Tất cả" : s === "Synced" ? "Đã đồng bộ" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Delete Toolbar */}
      <AnimatePresence>
        {isSomeSelected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center justify-between bg-[#0055A5] text-white rounded-2xl px-5 py-3 shadow-lg"
          >
            <span className="text-sm font-extrabold flex items-center gap-2">
              <CheckSquare size={16} />
              Đã chọn <span className="bg-white/20 px-2 py-0.5 rounded-lg font-black">{selectedDocs.size}</span> tài liệu
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDocs(new Set())}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deletingMultiple}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60 shadow-md"
              >
                {deletingMultiple
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
                {deletingMultiple ? "Đang xóa..." : `Xóa ${selectedDocs.size} tài liệu`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
            <File size={36} className="opacity-45" />
            <p className="text-sm">Không tìm thấy tài liệu nào trong cơ sở tri thức</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3.5 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-slate-400 hover:text-[#0055A5] transition-colors cursor-pointer"
                      title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    >
                      {isAllSelected
                        ? <CheckSquare size={15} className="text-[#0055A5]" />
                        : isSomeSelected
                          ? <CheckSquare size={15} className="text-[#0055A5] opacity-50" />
                          : <Square size={15} />}
                    </button>
                  </th>
                  {["Tài liệu","Loại","Kích thước","Trạng thái","Tiến độ","Vectors","Ngày tải",""].map(h => (
                    <th key={h} className="px-5 py-3.5 text-slate-400 font-extrabold text-[10px] tracking-wider uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((doc) => {
                    const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.Synced;
                    const StIcon = st.icon;
                    const style = getFileTypeStyle(doc.type);
                    const isWeb = doc.type?.toUpperCase() === "WEB";
                    const isConv = doc.type?.toUpperCase() === "CONVERSATION";
                    const isSelected = selectedDocs.has(doc.name);
                    const progressColor = doc.status === "Synced" ? "bg-emerald-500"
                      : doc.status === "error" ? "bg-red-500"
                      : doc.status === "chunking" ? "bg-amber-500"
                      : isWeb ? "bg-teal-500"
                      : isConv ? "bg-violet-500"
                      : "bg-[#0055A5]";
                    return (
                      <motion.tr
                        key={doc.name}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`border-b border-slate-100/80 transition-colors duration-150 ${
                          isSelected ? "bg-blue-50/40" : "hover:bg-slate-50/20"
                        }`}
                      >
                        <td className="px-4 py-3.5 w-10">
                          <button
                            onClick={() => toggleSelectDoc(doc.name)}
                            className="flex items-center justify-center text-slate-400 hover:text-[#0055A5] transition-colors cursor-pointer"
                          >
                            {isSelected
                              ? <CheckSquare size={15} className="text-[#0055A5]" />
                              : <Square size={15} />}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${style.bg} ${style.border}`}>
                              {isWeb ? <Globe size={14} className="text-teal-600" /> : isConv ? <MessageSquareText size={14} className="text-violet-600" /> : <FileText size={14} className={style.text} />}
                            </div>
                            <div>
                              <div className="text-slate-800 font-bold text-xs max-w-xs truncate" title={doc.source_url || doc.name}>{doc.name}</div>
                              <div className="text-slate-400 text-[10px] font-bold mt-0.5">
                                {isConv ? "Cặp hỏi-đáp CSKH" : isWeb ? "Nội dung trang web" : doc.chunks > 0 ? `${doc.chunks} đoạn` : "Đang xử lý..."}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><TypeBadge type={doc.type || "TXT"} /></td>
                        <td className="px-5 py-3.5 text-slate-600 font-bold text-xs">{doc.size}</td>
                        <td className="px-5 py-3.5">
                          <div className={`inline-flex items-center gap-1.5 border rounded-lg px-2 py-0.5 ${st.bgClass} ${st.borderClass}`}>
                            <StIcon size={10} className={`${st.textClass} ${["vectorizing","chunking"].includes(doc.status) ? "animate-spin" : ""}`} />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${st.textClass}`}>{st.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar pct={doc.progress} colorClass={progressColor} />
                            <span className="text-[10px] font-extrabold text-slate-500">{doc.progress}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-extrabold text-xs text-slate-700">{doc.vectors > 0 ? doc.vectors.toLocaleString() : "—"}</td>
                        <td className="px-5 py-3.5 text-slate-400 font-semibold text-xs whitespace-nowrap">
                          {doc.upload_date || "Hôm nay"}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {isWeb && (
                              <button
                                onClick={() => setPreviewWebDocName(doc.source_url || doc.name)}
                                className="w-7 h-7 rounded-lg text-teal-600 hover:bg-teal-50 hover:text-teal-700 flex items-center justify-center transition-colors cursor-pointer"
                                title="Xem nội dung chi tiết CSDL"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(doc)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                              title="Xóa tài liệu"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

      <AnimatePresence>
        {previewWebDocName && token && (
          <WebPreviewModal
            docName={previewWebDocName}
            onClose={() => setPreviewWebDocName(null)}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
