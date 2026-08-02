import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, FileText, File,
  CheckCircle2, Loader2, AlertCircle, Trash2,
  RefreshCw, CloudUpload, Activity, Globe, MessageSquareText,
  ChevronDown, Link2
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import { API_BASE } from "../../../config";

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

function IngestTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: IngestType;
  onChange: (v: IngestType) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options: { value: IngestType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    { value: "rag", label: "Tai lieu RAG", desc: "PDF, DOCX, XLSX, TXT, PPTX, JSON", icon: FileText, color: "text-[#0055A5]" },
    { value: "conversation", label: "Chat mau CSKH", desc: "Doan hoi thoai nhan vien tu van", icon: MessageSquareText, color: "text-violet-600" },
  ];
  const selected = options.find((o) => o.value === value)!;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:border-[#0055A5]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
      >
        <selected.icon size={13} className={selected.color} />
        <span className="flex-1 text-left">{selected.label}</span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${value === opt.value ? "bg-slate-50" : ""}`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg border ${value === opt.value ? "bg-white border-slate-200" : "bg-slate-100/60 border-transparent"}`}>
                  <opt.icon size={13} className={opt.color} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{opt.desc}</div>
                </div>
                {value === opt.value && <CheckCircle2 size={13} className="ml-auto mt-1 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropZone({
  onUpload,
  uploading,
  ingestType,
  onIngestTypeChange,
}: {
  onUpload: (file: globalThis.File) => void;
  uploading: boolean;
  ingestType: IngestType;
  onIngestTypeChange: (v: IngestType) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isConversation = ingestType === "conversation";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onUpload(e.target.files[0]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loai tai lieu</span>
        <IngestTypeSelector value={ingestType} onChange={onIngestTypeChange} disabled={uploading} />
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length > 0) onUpload(e.dataTransfer.files[0]); }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-3xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
          dragging
            ? isConversation ? "border-violet-400 bg-violet-50/50 shadow-inner" : "border-[#0055A5] bg-[#0055A5]/5 shadow-inner"
            : "border-slate-200 bg-white/40 hover:border-slate-300 hover:bg-white/60"
        } ${uploading ? "opacity-60 cursor-not-allowed" : "opacity-100"}`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.json,.txt,.docx,.doc,.pptx,.ppt,.xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={uploading} />
        <motion.div animate={{ y: dragging ? -4 : 0 }}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border transition-all duration-200 ${
            dragging
              ? isConversation ? "bg-violet-50 border-violet-400 text-violet-600" : "bg-[#0055A5]/10 border-[#0055A5] text-[#0055A5]"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}>
            {uploading
              ? <Activity size={24} className={isConversation ? "animate-spin text-violet-600" : "animate-spin text-[#0055A5]"} />
              : isConversation
                ? <MessageSquareText size={24} className={dragging ? "text-violet-600" : "text-slate-400"} />
                : <CloudUpload size={24} className={dragging ? "text-[#0055A5]" : "text-slate-400"} />
            }
          </div>
          <div className={`font-extrabold text-sm sm:text-base mb-1 ${dragging ? (isConversation ? "text-violet-600" : "text-[#0055A5]") : "text-slate-700"}`}>
            {uploading
              ? (isConversation ? "AI dang phan tich doan chat mau..." : "Dang xu ly tai lieu tri thuc...")
              : dragging ? "Tha file de bat dau tai len"
              : (isConversation ? "Keo & tha file chat mau CSKH tai day" : "Keo & tha file tai lieu tri thuc tai day")
            }
          </div>
          <div className="text-slate-400 text-xs font-semibold mb-5">
            {uploading
              ? (isConversation ? "Gemini dang trich xuat cap hoi-dap chuyen nghiep" : "AI dang lap chi muc vector va trich xuat du lieu")
              : (isConversation ? "File TXT/DOCX chua hoi thoai nhan vien tu van" : "hoac nhan de duyet tep tu may tinh")
            }
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {(isConversation ? ["TXT","DOCX","PDF"] : ["PDF","JSON","TXT","DOCX","PPTX","XLSX"]).map(t => {
              const style = getFileTypeStyle(t);
              return <span key={t} className={`border rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>.{t}</span>;
            })}
            {isConversation && (
              <span className="border rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-violet-50/80 text-violet-600 border-violet-200">CONVERSATION</span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function IngestUrlPanel({ onIngest, loading }: { onIngest: (url: string) => Promise<void>; loading: boolean }) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const isValidUrl = url.trim().length > 8 && (url.startsWith("http://") || url.startsWith("https://") || url.includes("."));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    await onIngest(url.trim());
    setUrl("");
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/60 p-5 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
          <Globe size={14} className="text-teal-600" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-800">Nạp từ URL trang web</div>
          <div className="text-[10px] text-slate-400 font-semibold">Hỗ trợ mọi website công khai (không giới hạn tên miền)</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className={`flex-1 flex items-center gap-2 bg-white border rounded-xl px-3.5 py-2.5 transition-all duration-200 ${focused ? "border-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.08)]" : "border-slate-200"}`}>
          <Link2 size={13} className={`shrink-0 transition-colors ${focused ? "text-teal-500" : "text-slate-300"}`} />
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="https://mobifone.online/goi-cuoc-4g-cua-mobifone"
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
          {loading ? <><Loader2 size={13} className="animate-spin" /><span>Dang crawl...</span></> : <><Globe size={13} /><span>Crawl & Nap</span></>}
        </motion.button>
      </form>
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

export function KnowledgeBasePage() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DocStatus>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingestType, setIngestType] = useState<IngestType>("rag");
  const [crawling, setCrawling] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
    else if (user.role !== "admin") navigate("/admin");
  }, [user, navigate]);

  const loadDocs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/chat/documents`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
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

  const handleUpload = async (file: globalThis.File) => {
    if (!token) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toUpperCase() || "TXT";
    const tempDoc: Doc = {
      name: file.name,
      type: ingestType === "conversation" ? "CONVERSATION" : ext,
      size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
      status: "chunking", progress: 40, upload_date: "Hom nay", vectors: 0, chunks: 0, timestamp: Date.now(),
    };
    setDocs(prev => [tempDoc, ...prev]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ingest_type", ingestType);
      await axios.post(`${API_BASE}/chat/upload`, formData, { headers: { Authorization: `Bearer ${token}` } });
      const res = await axios.get(`${API_BASE}/chat/documents`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
    } catch (error: any) {
      let msg = "Vui long kiem tra lai cau hinh he thong.";
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) msg = "Dung luong file qua lon (vuot qua gioi han 100MB).";
        else if (error.response?.status === 504) msg = "Qua thoi gian xu ly. File dang duoc he thong tiep tuc.";
        else { const d = error.response?.data; msg = typeof d === "string" ? d : (d?.message || d?.detail || error.message); }
      }
      alert(`Loi upload tai lieu: ${msg}`);
      setDocs(prev => prev.filter(d => d.name !== file.name));
    } finally {
      setUploading(false);
    }
  };

  const handleIngestUrl = async (url: string) => {
    if (!token) return;
    setCrawling(true);
    const tempName = url.length > 60 ? url.substring(0, 57) + "..." : url;
    setDocs(prev => [{ name: tempName, type: "WEB", size: "Dang crawl...", status: "vectorizing", progress: 20, upload_date: "Vua xong", vectors: 0, chunks: 0, timestamp: Date.now(), source_url: url }, ...prev]);
    try {
      const res = await axios.post(`${API_BASE}/chat/ingest-url`, { url }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const data = res.data;
      setDocs(prev => prev.map(d => d.name === tempName ? { ...d, name: data.source_title || tempName, status: "Synced", progress: 100, size: `${data.chunks_count} doan` } : d));
      setTimeout(() => loadDocs(), 1500);
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
      alert(`Loi crawl URL: ${detail}`);
      setDocs(prev => prev.filter(d => d.name !== tempName));
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async (docName: string) => {
    if (!token || !window.confirm(`Ban co chac chan muon xoa '${docName}'?`)) return;
    try {
      await axios.delete(`${API_BASE}/chat/documents/${encodeURIComponent(docName)}`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(prev => prev.filter(d => d.name !== docName));
    } catch { alert("Khong the xoa tai lieu. Vui long thu lai!"); }
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
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || d.status === filter))
    .sort((a, b) => { const diff = parseDocDate(b) - parseDocDate(a); return diff !== 0 ? diff : a.name.localeCompare(b.name); });

  return (
    <div className="font-outfit flex flex-col gap-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200/60 pb-5 gap-4">
        <div>
          <h1 className="text-[#0F172A] font-black text-2xl tracking-tight">Co so tri thuc (Knowledge Base)</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Da lap chi muc <span className="text-[#0055A5] font-extrabold">{totalVectors.toLocaleString()}</span> vectors tu <span className="text-[#0055A5] font-extrabold">{totalDocs}</span> tai lieu.
          </p>
        </div>
        <button onClick={loadDocs} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#0055A5] to-[#003B75] text-white border-none font-bold text-xs cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Tai lai danh sach
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Tong tai lieu", value: docs.length, color: "border-l-[#0055A5] text-[#0055A5]" },
          { label: "Da dong bo",    value: docs.filter(d => d.status === "Synced").length, color: "border-l-emerald-500 text-emerald-500" },
          { label: "Dang xu ly",   value: docs.filter(d => ["chunking","vectorizing"].includes(d.status)).length, color: "border-l-amber-500 text-amber-500" },
          { label: "Trang web (WEB)", value: docs.filter(d => d.type?.toUpperCase() === "WEB").length, color: "border-l-teal-500 text-teal-500" },
          { label: "Chat mau (CONV)", value: docs.filter(d => d.type?.toUpperCase() === "CONVERSATION").length, color: "border-l-violet-500 text-violet-500" },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-4 border border-slate-200/50 border-l-4 ${s.color.split(" ")[0]} shadow-xs`}>
            <div className="text-slate-400 text-[9px] font-bold tracking-wider uppercase mb-1">{s.label}</div>
            <div className={`text-xl font-black ${s.color.split(" ")[1]}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <IngestUrlPanel onIngest={handleIngestUrl} loading={crawling} />

      <DropZone onUpload={handleUpload} uploading={uploading} ingestType={ingestType} onIngestTypeChange={setIngestType} />

      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-xl px-3.5 py-2 w-full sm:max-w-xs shadow-xs focus-within:border-[#0055A5]/60 transition-colors">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input placeholder="Tim kiem tai lieu..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-600" />
        </div>
        <div className="flex gap-1 bg-slate-100 border border-slate-200/40 rounded-xl p-1 shrink-0">
          {(["all", "Synced", "vectorizing", "chunking", "error"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg border-none font-bold text-xs cursor-pointer transition-all ${filter === s ? "bg-[#0055A5] text-white shadow-xs" : "bg-transparent text-slate-500 hover:text-slate-700"}`}>
              {s === "all" ? "Tat ca" : s === "Synced" ? "Da dong bo" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
            <File size={36} className="opacity-45" />
            <p className="text-sm">Khong tim thay tai lieu nao trong co so tri thuc</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {["Tai lieu","Loai","Kich thuoc","Trang thai","Tien do","Vectors","Ngay tai",""].map(h => (
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
                        className="border-b border-slate-100/80 hover:bg-slate-50/20 transition-colors duration-150"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${style.bg} ${style.border}`}>
                              {isWeb ? <Globe size={14} className="text-teal-600" /> : isConv ? <MessageSquareText size={14} className="text-violet-600" /> : <FileText size={14} className={style.text} />}
                            </div>
                            <div>
                              <div className="text-slate-800 font-bold text-xs max-w-xs truncate" title={doc.source_url || doc.name}>{doc.name}</div>
                              <div className="text-slate-400 text-[10px] font-bold mt-0.5">
                                {isConv ? "Cap hoi-dap CSKH" : isWeb ? "Noi dung trang web" : doc.chunks > 0 ? `${doc.chunks} doan` : "Dang xu ly..."}
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
                            <span className="text-slate-400 text-[10px] font-bold min-w-7">{doc.progress}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-800 font-extrabold text-xs">{doc.vectors > 0 ? doc.vectors.toLocaleString() : "—"}</td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{doc.upload_date}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => handleDelete(doc.name)}
                            className="bg-transparent border border-red-100 hover:bg-red-500 hover:text-white text-red-500 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer transition-colors">
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
