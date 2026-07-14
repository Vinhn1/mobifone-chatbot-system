import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserPlus, Search, Edit2, Trash2, Key, Shield, User,
  Mail, Phone, Calendar, MapPin, X, Save, ShieldAlert,
  Sparkles, CheckCircle2, UserCheck, Eye, EyeOff
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

type Staff = {
  id: number;
  username: string;
  role: "admin" | "sales";
  name: string | null;
  phone: string | null;
  email: string | null;
  dob: string | null;
  address: string | null;
  createdAt: string;
};

export function StaffManagementPage() {
  const { user } = useAuth();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // States cho modal thêm/sửa
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);

  // States cho modal đổi mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStaffId, setPasswordStaffId] = useState<number | null>(null);
  const [passwordStaffName, setPasswordStaffName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);

  // Form states cho thêm/sửa
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "sales">("sales");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");

  const [showPass, setShowPass] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast?.visible) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, visible: false } : null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load danh sách nhân viên
  const fetchStaffs = async () => {
    setLoading(true);
    try {
      const adminToken = localStorage.getItem("mobifone_admin_token");
      const res = await axios.get("http://localhost:3000/users", {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setStaffs(res.data || []);
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách nhân viên:", err);
      showToast(err.response?.data?.message || "Không thể tải danh sách nhân viên", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  // Xử lý tạo mới / cập nhật tài khoản
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const adminToken = localStorage.getItem("mobifone_admin_token");
      const payload = {
        username,
        role,
        name: name || null,
        phone: phone || null,
        email: email || null,
        dob: dob || null,
        address: address || null,
        ...(modalType === "create" ? { password } : {})
      };

      if (modalType === "create") {
        await axios.post("http://localhost:3000/users", payload, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        showToast("Tạo tài khoản nhân viên thành công!");
      } else if (modalType === "edit" && editingStaffId) {
        await axios.patch(`http://localhost:3000/users/${editingStaffId}`, payload, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        showToast("Cập nhật thông tin nhân viên thành công!");
      }

      setShowModal(false);
      fetchStaffs();
    } catch (err: any) {
      console.error("Lỗi khi lưu thông tin nhân viên:", err);
      showToast(err.response?.data?.message || "Đã xảy ra lỗi khi lưu thông tin", "error");
    }
  };

  // Mở modal thêm mới
  const handleOpenCreate = () => {
    setModalType("create");
    setEditingStaffId(null);
    setUsername("");
    setPassword("");
    setRole("sales");
    setName("");
    setPhone("");
    setEmail("");
    setDob("");
    setAddress("");
    setShowPass(false);
    setShowModal(true);
  };

  // Mở modal sửa thông tin
  const handleOpenEdit = (staff: Staff) => {
    setModalType("edit");
    setEditingStaffId(staff.id);
    setUsername(staff.username);
    setRole(staff.role);
    setName(staff.name || "");
    setPhone(staff.phone || "");
    setEmail(staff.email || "");
    setDob(staff.dob || "");
    setAddress(staff.address || "");
    setShowModal(true);
  };

  // Mở modal đổi mật khẩu
  const handleOpenChangePassword = (staff: Staff) => {
    setPasswordStaffId(staff.id);
    setPasswordStaffName(staff.name || staff.username);
    setNewPassword("");
    setShowNewPass(false);
    setShowPasswordModal(true);
  };

  // Thực hiện đổi mật khẩu
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast("Mật khẩu mới phải từ 6 ký tự trở lên.", "error");
      return;
    }
    try {
      const adminToken = localStorage.getItem("mobifone_admin_token");
      await axios.patch(`http://localhost:3000/users/${passwordStaffId}`, {
        password: newPassword
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      showToast(`Đã đổi mật khẩu cho ${passwordStaffName} thành công!`);
      setShowPasswordModal(false);
    } catch (err: any) {
      console.error("Lỗi khi đổi mật khẩu:", err);
      showToast(err.response?.data?.message || "Không thể đổi mật khẩu", "error");
    }
  };

  // Xóa nhân viên
  const handleDeleteStaff = async (id: number, staffName: string, staffUsername: string) => {
    if (staffUsername === "admin") {
      showToast("Không thể xóa tài khoản admin mặc định hệ thống.", "error");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${staffName || staffUsername}" khỏi hệ thống không?`)) {
      return;
    }
    try {
      const adminToken = localStorage.getItem("mobifone_admin_token");
      await axios.delete(`http://localhost:3000/users/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      showToast(`Đã xóa tài khoản "${staffName || staffUsername}" thành công!`);
      fetchStaffs();
    } catch (err: any) {
      console.error("Lỗi khi xóa nhân viên:", err);
      showToast(err.response?.data?.message || "Không thể xóa tài khoản", "error");
    }
  };

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredStaffs = staffs.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.username.toLowerCase().includes(term) ||
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term))
    );
  });

  // Tính toán số liệu thống kê
  const totalStaff = staffs.length;
  const adminCount = staffs.filter(s => s.role === "admin").length;
  const salesCount = staffs.filter(s => s.role === "sales").length;

  return (
    <div style={{
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      height: "100%",
      overflowY: "auto",
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast?.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: "fixed",
              top: "24px",
              right: "24px",
              zIndex: 9999,
              background: toast.type === "success" ? "rgba(16, 185, 129, 0.95)" : "rgba(239, 68, 68, 0.95)",
              backdropFilter: "blur(8px)",
              border: toast.type === "success" ? "1px solid rgba(52, 211, 153, 0.2)" : "1px solid rgba(248, 113, 113, 0.2)",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              borderRadius: "12px",
              padding: "14px 20px",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontWeight: 600,
              fontSize: "14px"
            }}
          >
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap"
      }}>
        <div>
          <h1 style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#1E293B",
            background: "linear-gradient(135deg, #0055A5, #0077D5)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0
          }}>Quản lý Nhân sự & Cấp tài khoản</h1>
          <p style={{ color: "#64748B", fontSize: "14px", margin: "4px 0 0 0" }}>
            Quản trị viên có thể thêm mới, đổi mật khẩu hoặc xóa tài khoản CSKH (Sales) và Admin trong hệ thống.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #0055A5, #0077D5)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0, 85, 165, 0.25)"
          }}
        >
          <UserPlus size={16} /> Thêm tài khoản mới
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px"
      }}>
        {/* Card 1 */}
        <div style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.02)"
        }}>
          <div style={{
            background: "rgba(0, 85, 165, 0.1)",
            color: "#0055A5",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <User size={22} />
          </div>
          <div>
            <div style={{ color: "#64748B", fontSize: "13px", fontWeight: 600 }}>Tổng số nhân sự</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1E293B", marginTop: "2px" }}>{totalStaff}</div>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.02)"
        }}>
          <div style={{
            background: "rgba(79, 70, 229, 0.1)",
            color: "#4F46E5",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ color: "#64748B", fontSize: "13px", fontWeight: 600 }}>Tài khoản Admin</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1E293B", marginTop: "2px" }}>{adminCount}</div>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.02)"
        }}>
          <div style={{
            background: "rgba(16, 185, 129, 0.1)",
            color: "#10B981",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ color: "#64748B", fontSize: "13px", fontWeight: 600 }}>Tài khoản CSKH (Sales)</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#1E293B", marginTop: "2px" }}>{salesCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table & Control Section */}
      <div style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden"
      }}>
        {/* Search Bar */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{
            position: "relative",
            flex: 1,
            maxWidth: "360px"
          }}>
            <Search size={16} style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94A3B8"
            }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username, sđt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "10px",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                background: "rgba(255, 255, 255, 0.5)",
                fontSize: "13.5px",
                outline: "none",
                fontFamily: "'Outfit', sans-serif"
              }}
            />
          </div>
        </div>

        {/* Table Area */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          {loading ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              color: "#64748B",
              gap: "12px"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                border: "3px solid #0055A5",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <span>Đang tải danh sách nhân sự...</span>
            </div>
          ) : filteredStaffs.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#64748B"
            }}>
              <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy tài khoản nhân viên nào khớp.</p>
            </div>
          ) : (
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13.5px"
            }}>
              <thead>
                <tr style={{
                  background: "rgba(0, 0, 0, 0.02)",
                  borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                  color: "#475569"
                }}>
                  <th style={{ padding: "12px 20px", fontWeight: 700 }}>Nhân viên</th>
                  <th style={{ padding: "12px 20px", fontWeight: 700 }}>Tên đăng nhập</th>
                  <th style={{ padding: "12px 20px", fontWeight: 700 }}>Vai trò</th>
                  <th style={{ padding: "12px 20px", fontWeight: 700 }}>Liên hệ</th>
                  <th style={{ padding: "12px 20px", fontWeight: 700 }}>Địa chỉ / Ngày sinh</th>
                  <th style={{ padding: "12px 20px", fontWeight: 700, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaffs.map((staff) => {
                  const initials = staff.name ? staff.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : staff.username.substring(0, 2).toUpperCase();
                  const isAdmin = staff.role === "admin";
                  const isSysAdmin = staff.username === "admin";

                  return (
                    <tr key={staff.id} style={{
                      borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
                      color: "#334155"
                    }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: isAdmin ? "linear-gradient(135deg, #4F46E5, #6366F1)" : "linear-gradient(135deg, #10B981, #34D399)",
                            color: "white",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12.5px"
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#1E293B" }}>{staff.name || "Chưa cập nhật họ tên"}</div>
                            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>ID: #{staff.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <code style={{
                          background: "rgba(0, 0, 0, 0.04)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "12.5px",
                          color: "#0F172A"
                        }}>{staff.username}</code>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          background: isAdmin ? "rgba(79, 70, 229, 0.1)" : "rgba(16, 185, 129, 0.1)",
                          color: isAdmin ? "#4F46E5" : "#10B981",
                          border: isAdmin ? "1px solid rgba(79, 70, 229, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)",
                          borderRadius: "20px",
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {isAdmin ? <Shield size={11} /> : <UserCheck size={11} />}
                          {isAdmin ? "Admin" : "Nhân viên Sales"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {staff.email ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px" }}>
                              <Mail size={12} style={{ color: "#94A3B8" }} />
                              {staff.email}
                            </span>
                          ) : null}
                          {staff.phone ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px" }}>
                              <Phone size={12} style={{ color: "#94A3B8" }} />
                              {staff.phone}
                            </span>
                          ) : null}
                          {!staff.email && !staff.phone ? <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Chưa cấu hình</span> : null}
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {staff.dob ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px" }}>
                              <Calendar size={12} style={{ color: "#94A3B8" }} />
                              {staff.dob}
                            </span>
                          ) : null}
                          {staff.address ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px" }}>
                              <MapPin size={12} style={{ color: "#94A3B8" }} />
                              {staff.address.length > 25 ? `${staff.address.substring(0, 22)}...` : staff.address}
                            </span>
                          ) : null}
                          {!staff.dob && !staff.address ? <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Chưa cập nhật</span> : null}
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          {/* Đổi mật khẩu */}
                          <button
                            onClick={() => handleOpenChangePassword(staff)}
                            title="Đổi mật khẩu tài khoản"
                            style={{
                              background: "rgba(243, 156, 18, 0.1)",
                              color: "#F39C12",
                              border: "none",
                              borderRadius: "8px",
                              width: "32px",
                              height: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            <Key size={14} />
                          </button>

                          {/* Sửa thông tin */}
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              background: "rgba(0, 85, 165, 0.1)",
                              color: "#0055A5",
                              border: "none",
                              borderRadius: "8px",
                              width: "32px",
                              height: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Xóa tài khoản */}
                          <button
                            onClick={() => handleDeleteStaff(staff.id, staff.name || "", staff.username)}
                            title={isSysAdmin ? "Tài khoản admin mặc định không thể xóa" : "Xóa tài khoản"}
                            disabled={isSysAdmin}
                            style={{
                              background: isSysAdmin ? "rgba(0, 0, 0, 0.03)" : "rgba(239, 68, 68, 0.1)",
                              color: isSysAdmin ? "#CBD5E1" : "#EF4444",
                              border: "none",
                              borderRadius: "8px",
                              width: "32px",
                              height: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: isSysAdmin ? "not-allowed" : "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Thêm / Sửa thông tin tài khoản */}
      <AnimatePresence>
        {showModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.35)",
                backdropFilter: "blur(4px)"
              }}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(30px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "500px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
                position: "relative",
                zIndex: 10,
                overflow: "hidden"
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} style={{ color: "#0055A5" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#1E293B", margin: 0 }}>
                    {modalType === "create" ? "Tạo Tài khoản Nhân sự mới" : "Chỉnh sửa Thông tin tài khoản"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: 0,
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Username */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    Tên đăng nhập (username)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalType === "edit"}
                    placeholder="Nhập tên đăng nhập duy nhất..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      fontSize: "13.5px",
                      outline: "none",
                      background: modalType === "edit" ? "rgba(0, 0, 0, 0.03)" : "white",
                      cursor: modalType === "edit" ? "not-allowed" : "text",
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  />
                </div>

                {/* Password (Chỉ khi tạo mới) */}
                {modalType === "create" && (
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                      Mật khẩu khởi tạo
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        placeholder="Nhập mật khẩu từ 6 ký tự..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 40px 10px 12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(0, 0, 0, 0.08)",
                          fontSize: "13.5px",
                          outline: "none",
                          fontFamily: "'Outfit', sans-serif"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#94A3B8",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Role */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    Vai trò cấp quyền
                  </label>
                  <select
                    disabled={modalType === "edit" && username === "admin"}
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      fontSize: "13.5px",
                      outline: "none",
                      background: "white",
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    <option value="sales">Nhân viên CSKH (Sales)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn A..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      fontSize: "13.5px",
                      outline: "none",
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  />
                </div>

                {/* Grid cho Liên hệ */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      placeholder="0912345678..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "'Outfit', sans-serif"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                      Địa chỉ Email
                    </label>
                    <input
                      type="email"
                      placeholder="name@mobifone.vn..."
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "'Outfit', sans-serif"
                      }}
                    />
                  </div>
                </div>

                {/* Ngày sinh */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      fontSize: "13.5px",
                      outline: "none",
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  />
                </div>

                {/* Địa chỉ */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    Địa chỉ làm việc/Cư trú
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      fontSize: "13.5px",
                      outline: "none",
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  />
                </div>

                {/* Submit button */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "12px"
                }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      background: "white",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      cursor: "pointer"
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #0055A5, #0077D5)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Save size={15} /> Lưu tài khoản
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Đổi mật khẩu nhanh */}
      <AnimatePresence>
        {showPasswordModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.35)",
                backdropFilter: "blur(4px)"
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(30px)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "420px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
                position: "relative",
                zIndex: 10,
                overflow: "hidden"
              }}
            >
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Key size={18} style={{ color: "#F39C12" }} />
                  <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#1E293B", margin: 0 }}>
                    Đổi mật khẩu tài khoản
                  </h2>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: 0,
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleChangePasswordSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#64748B" }}>
                    Nhân viên: <strong style={{ color: "#1E293B" }}>{passwordStaffName}</strong>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    Mật khẩu mới
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 40px 10px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        fontSize: "13.5px",
                        outline: "none",
                        fontFamily: "'Outfit', sans-serif"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94A3B8",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "8px"
                }}>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      background: "white",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 18px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #F39C12, #E67E22)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Save size={14} /> Đổi mật khẩu
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
