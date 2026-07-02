import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Phone, MapPin, Calendar, Lock, Bell, Shield, Camera, Check, ChevronRight, Star, AlertCircle, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";
import axios from "axios";

const TIER_STYLE = {
  Silver: "bg-slate-50 text-slate-600 border-slate-200/60 shadow-xs",
  Gold: "bg-amber-50 text-amber-700 border-amber-200/60 shadow-xs shadow-amber-500/5",
  Diamond: "bg-purple-50 text-purple-700 border-purple-200/60 shadow-xs shadow-purple-500/5",
};

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string;
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
    </div>
  );
}

const formatDateForDisplay = (dateStr?: string | null) => {
  if (!dateStr) return "Chưa cập nhật";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }
  return dateStr;
};

export function UserProfile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [tab, setTab] = useState<"info" | "security" | "notifications">("info");
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({ name: "", email: "", dob: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    sms: true, email: true, promo: true, renewal: true, news: false, security: true
  });
  const tier = user?.tier ?? "Silver";
  const tierClass = TIER_STYLE[tier] || TIER_STYLE.Silver;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const portalToken = localStorage.getItem("mobifone_portal_token");
        if (portalToken) {
          await axios.patch(
            "http://localhost:3000/subscribers/profile",
            { avatar: base64 },
            {
              headers: {
                Authorization: `Bearer ${portalToken}`,
              },
            }
          );
          updateUser({ avatar: base64 });
        }
      } catch (error) {
        console.error("Lỗi đồng bộ avatar lên backend:", error);
        alert("Không thể cập nhật ảnh đại diện. Vui lòng thử lại!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const portalToken = localStorage.getItem("mobifone_portal_token");
      if (portalToken) {
        await axios.patch(
          "http://localhost:3000/subscribers/profile",
          formValues,
          {
            headers: {
              Authorization: `Bearer ${portalToken}`,
            },
          }
        );
      }

      updateUser(formValues);
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Lỗi đồng bộ hồ sơ lên backend:", error);
      setSaveError(error.response?.data?.message || "Không thể lưu thông tin. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto font-outfit">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-200/30 mb-6 flex flex-wrap items-center gap-5"
      >        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0055A5] to-[#E4002B] flex items-center justify-center text-white text-2xl font-black shadow-md shadow-[#0055A5]/25 border-4 border-white overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) ?? "U"
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#0055A5] hover:bg-[#00448A] border-2 border-white flex items-center justify-center cursor-pointer transition-all">
            <Camera size={12} className="text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <div className="flex-1 min-w-[200px]">
          <h2 className="text-slate-800 text-xl font-black tracking-tight mb-1">{user?.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border ${tierClass}`}>
              <Star size={11} className="fill-current" /> {tier} Member
            </span>
            <span className="text-slate-400 text-xs font-medium">Tham gia từ {user?.joinDate}</span>
          </div>
          <div className="text-slate-500 text-xs font-semibold mt-1.5">
            ID: <span className="text-slate-700 font-bold">{user?.id}</span> · Gói: <span className="text-slate-700 font-bold">{user?.package}</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
            <div className="text-emerald-700 font-extrabold text-lg leading-none mb-1">{user?.points?.toLocaleString()}</div>
            <div className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Điểm thưởng</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
            <div className="text-[#0055A5] font-extrabold text-lg leading-none mb-1">{user?.balance?.toLocaleString("vi-VN")}đ</div>
            <div className="text-[#0055A5]/70 text-[10px] font-bold uppercase tracking-wider">Số dư</div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 mb-6 w-fit">
        {[
          { key: "info", label: "👤 Thông tin" },
          { key: "security", label: "🔒 Bảo mật" },
          { key: "notifications", label: "🔔 Thông báo" },
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
          {!isEditing ? (
            <div>
              <InfoRow icon={User} label="Họ và tên" value={user?.name ?? ""} />
              <InfoRow icon={Phone} label="Số điện thoại" value={user?.phone ?? ""} />
              <InfoRow icon={Mail} label="Email" value={user?.email ?? ""} />
              <InfoRow icon={Calendar} label="Ngày sinh" value={formatDateForDisplay(user?.dob)} />
              <InfoRow icon={MapPin} label="Địa chỉ" value={user?.address ?? ""} />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setFormValues({
                      name: user?.name ?? "",
                      email: user?.email ?? "",
                      dob: user?.dob ?? "",
                      address: user?.address ?? "",
                    });
                    setSaveError(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0055A5] to-blue-500 hover:from-blue-500 hover:to-[#0055A5] text-white font-bold text-sm shadow-md shadow-[#0055A5]/25 border-none cursor-pointer transition-all active:scale-95"
                >
                  Chỉnh sửa hồ sơ
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-4 font-outfit">
              <h3 className="text-slate-800 font-extrabold text-base mb-2">Chỉnh sửa thông tin cá nhân</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Họ và tên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formValues.name}
                    onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all bg-slate-50/50"
                    placeholder="Nhập họ và tên"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={formValues.email}
                    onChange={e => setFormValues({ ...formValues, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all bg-slate-50/50"
                    placeholder="Nhập email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ngày sinh</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <input
                    type="date"
                    required
                    value={formValues.dob}
                    onChange={e => setFormValues({ ...formValues, dob: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Địa chỉ</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formValues.address}
                    onChange={e => setFormValues({ ...formValues, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all bg-slate-50/50"
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 text-xs font-bold mt-2">
                  <AlertCircle size={14} /> {saveError}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-sm cursor-pointer transition-all"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0055A5] to-blue-500 text-white font-bold text-sm shadow-md shadow-[#0055A5]/20 border-none transition-all active:scale-95 ${
                    isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          )}

          {saved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs font-bold"
            >
              <Check size={14} /> Đã lưu thay đổi thành công!
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
            { icon: Lock, title: "Đổi mật khẩu", desc: "Cập nhật mật khẩu đăng nhập của bạn", color: "#0055A5", colorBg: "bg-blue-50/70", colorBorder: "border-blue-100" },
            { icon: Shield, title: "Xác thực hai lớp (2FA)", desc: "Bảo vệ an toàn bằng OTP qua SMS", color: "#10B981", colorBg: "bg-emerald-50", colorBorder: "border-emerald-100", badge: "Đã kích hoạt" },
            { icon: Phone, title: "Đổi số điện thoại liên kết", desc: "Thay đổi số điện thoại dùng để xác thực", color: "#E4002B", colorBg: "bg-red-50", colorBorder: "border-red-100" },
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
              { key: "sms", label: "Thông báo SMS", desc: "Nhận tin nhắn về biến động số dư và giao dịch" },
              { key: "email", label: "Thông báo Email", desc: "Hóa đơn điện tử, báo cáo chi tiết hàng tháng" },
              { key: "promo", label: "Ưu đãi và khuyến mãi", desc: "Nhận thông tin Flash deals, gói cước mới hấp dẫn" },
              { key: "renewal", label: "Nhắc nhở gia hạn", desc: "Nhắc hạn thanh toán gói cước trước 7 ngày" },
              { key: "news", label: "Tin tức MobiFone", desc: "Tin công nghệ, nâng cấp mạng 5G và dịch vụ mới" },
              { key: "security", label: "Cảnh báo bảo mật", desc: "Thông báo đăng nhập thiết bị lạ, đổi mật khẩu" },
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
            Lưu cài đặt thông báo
          </button>
        </motion.div>
      )}
    </div>
  );
}
