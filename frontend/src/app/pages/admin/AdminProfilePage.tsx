import { useState } from "react";
import { motion } from "motion/react";
import { User, Mail, Phone, MapPin, Calendar, Lock, Bell, Shield, Camera, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function InfoRow({ icon: Icon, label, value, editable = false, onEdit }: {
  icon: React.ElementType; label: string; value: string; editable?: boolean; onEdit?: () => void;
}) {
  return (
    <div className="flex items-center gap-3.5 py-4 border-b border-slate-100 font-outfit">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-slate-400" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-0.5">{label}</div>
        <div className="text-slate-800 font-bold text-sm">{value}</div>
      </div>
      {editable && (
        <button
          onClick={onEdit}
          className="text-[#0055A5] hover:text-[#00448A] text-xs font-bold bg-transparent border-none cursor-pointer transition-colors"
        >
          Sửa
        </button>
      )}
    </div>
  );
}

export function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<"info" | "security" | "notifications">("info");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    logs: true, alerts: true, backups: false, updates: true
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateUser({ avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!editing) return;
    setIsSaving(true);
    
    // Cập nhật thông tin admin cục bộ (lưu vào localStorage qua AuthContext)
    updateUser({ [editing]: editValue });

    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setEditing(null);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  return (
    <div className="max-w-[760px] mx-auto font-outfit pb-12">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-200/30 mb-6 flex flex-wrap items-center gap-5"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F39C12] to-[#E4002B] flex items-center justify-center text-white text-2xl font-black shadow-md shadow-[#E4002B]/25 border-4 border-white overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) ?? "A"
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E4002B] hover:bg-[#c30024] border-2 border-white flex items-center justify-center cursor-pointer transition-all">
            <Camera size={12} className="text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <div className="flex-1 min-w-[200px]">
          <h2 className="text-slate-800 text-xl font-black tracking-tight mb-1">{user?.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200/60 shadow-xs">
              <ShieldCheck size={11} className="fill-current" /> Administrator
            </span>
          </div>
          <div className="text-slate-500 text-xs font-semibold mt-1.5">
            ID: <span className="text-slate-700 font-bold">{user?.id}</span> · Quyền hạn: <span className="text-slate-700 font-bold">Quản trị viên cấp cao</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 mb-6 w-fit">
        {[
          { key: "info", label: "👤 Thông tin" },
          { key: "security", label: "🔒 Bảo mật" },
          { key: "notifications", label: "🔔 Thông báo hệ thống" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4.5 py-2 rounded-xl border-none font-bold text-xs cursor-pointer transition-all duration-200 ${
              tab === t.key
                ? "bg-white text-[#0055A5] shadow-xs border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800 bg-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-200/30"
        >
          <InfoRow icon={User} label="Họ và tên" value={user?.name ?? ""} editable onEdit={() => { setEditing("name"); setEditValue(user?.name ?? ""); }} />
          <InfoRow icon={Phone} label="Số điện thoại liên hệ" value={user?.phone ?? ""} />
          <InfoRow icon={Mail} label="Email quản trị" value={user?.email ?? ""} editable onEdit={() => { setEditing("email"); setEditValue(user?.email ?? ""); }} />
          <InfoRow icon={Calendar} label="Ngày sinh" value={user?.dob ?? ""} editable onEdit={() => { setEditing("dob"); setEditValue(user?.dob ?? ""); }} />
          <InfoRow icon={MapPin} label="Địa chỉ văn phòng" value={user?.address ?? ""} editable onEdit={() => { setEditing("address"); setEditValue(user?.address ?? ""); }} />

          {editing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl"
            >
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-2">
                Chỉnh sửa {editing === "name" ? "Họ và tên" : editing === "email" ? "Email quản trị" : editing === "dob" ? "Ngày sinh" : "Địa chỉ văn phòng"}
              </label>
              <div className="flex gap-2.5">
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  disabled={isSaving}
                  onClick={handleSave}
                  className={`px-5 py-2 rounded-xl bg-gradient-to-r from-[#0055A5] to-blue-500 text-white font-bold text-sm shadow-md shadow-[#0055A5]/20 border-none transition-all active:scale-95 ${
                    isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {isSaving ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-sm cursor-pointer transition-all"
                >
                  Huỷ
                </button>
              </div>
            </motion.div>
          )}

          {saved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              <Check size={14} /> Đã lưu thay đổi hồ sơ Admin thành công!
            </motion.div>
          )}
        </motion.div>
      )}

      {tab === "security" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-3"
        >
          {[
            { icon: Lock, title: "Đổi mật khẩu Admin", desc: "Cập nhật mật khẩu quản trị viên", color: "#E4002B", colorBg: "bg-red-50/70", colorBorder: "border-red-100" },
            { icon: Shield, title: "Xác thực hai lớp (2FA)", desc: "Bảo vệ tài khoản quản trị bằng OTP", color: "#10B981", colorBg: "bg-emerald-50", colorBorder: "border-emerald-100", badge: "Đã kích hoạt" },
            { icon: Phone, title: "Đổi số điện thoại liên kết", desc: "Thay đổi số điện thoại nhận mã OTP hệ thống", color: "#0055A5", colorBg: "bg-blue-50/70", colorBorder: "border-blue-100" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="bg-white border border-slate-200/60 hover:border-slate-300 rounded-2xl p-4.5 flex items-center gap-4 cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <div className={`w-10 h-10 rounded-xl ${s.colorBg} border ${s.colorBorder} flex items-center justify-center shrink-0`}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-bold text-sm flex items-center gap-2">
                    {s.title}
                    {s.badge && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs font-medium mt-0.5">{s.desc}</div>
                </div>
                <ChevronRight size={15} className="text-slate-300" />
              </div>
            );
          })}
        </motion.div>
      )}

      {tab === "notifications" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-200/30"
        >
          <div className="flex flex-col gap-1.5">
            {[
              { key: "logs", label: "Nhật ký hệ thống", desc: "Nhận thông báo khi có chỉnh sửa Prompt hoặc Tri thức" },
              { key: "alerts", label: "Cảnh báo bảo mật", desc: "Nhắc nhở khi phát hiện hành vi truy cập trái phép" },
              { key: "backups", label: "Báo cáo Backup cơ sở dữ liệu", desc: "Gửi báo cáo sao lưu tự động hàng tuần về Email" },
              { key: "updates", label: "Cập nhật ứng dụng", desc: "Nhận thông báo về phiên bản cập nhật mới của hệ thống" },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-none">
                <div className="pr-4">
                  <div className="text-slate-800 font-bold text-sm mb-0.5">{n.label}</div>
                  <div className="text-slate-400 text-xs font-medium">{n.desc}</div>
                </div>
                <button
                  onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key as keyof typeof p] }))}
                  className={`w-11 h-6 rounded-full cursor-pointer relative transition-colors duration-200 shrink-0 border-none outline-none ${
                    notifications[n.key as keyof typeof notifications] ? "bg-[#0055A5]" : "bg-slate-200"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all duration-200 ${
                    notifications[n.key as keyof typeof notifications] ? "left-[22px]" : "left-0.5"
                  }`} />
                </button>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-[#0055A5] to-blue-500 hover:from-blue-500 hover:to-[#0055A5] text-white font-bold text-sm cursor-pointer shadow-md shadow-[#0055A5]/20 hover:shadow-lg transition-all border-none active:scale-98">
            Lưu cài đặt thông báo Admin
          </button>
        </motion.div>
      )}
    </div>
  );
}
