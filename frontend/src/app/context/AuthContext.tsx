import { createContext, useContext, useState, type ReactNode, useEffect } from "react";
import axios from "axios";

export type AuthRole = "guest" | "user" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: AuthRole;
  avatar?: string;
  tier: "Silver" | "Gold" | "Diamond";
  package: string;
  packageCode: string;
  packageExpiry: string;
  dataUsedGB: number;
  dataTotalGB: number;
  voiceUsedMin: number;
  voiceTotalMin: number;
  balance: number;
  points: number;
  joinDate: string;
  address: string;
  dob: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<"user" | "admin" | "error">;
  register: (phone: string, password: string, name?: string) => Promise<"success" | "error">;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => "error",
  register: async () => "error",
  logout: () => {},
  updateUser: () => {},
});

const API_BASE = "http://localhost:3000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("mobifone_admin_token") || localStorage.getItem("mobifone_portal_token");
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedAdmin = localStorage.getItem("mobifone_admin_user");
    if (savedAdmin) {
      try { return JSON.parse(savedAdmin); } catch { return null; }
    }
    const savedUser = localStorage.getItem("mobifone_portal_user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });

  // Axios interceptor: tự động logout khi nhận 401 (ngoại trừ khi đang gọi api login)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        if (error.response?.status === 401 && !isLoginRequest) {
          // Token hết hạn hoặc không hợp lệ → logout
          localStorage.removeItem("mobifone_admin_token");
          localStorage.removeItem("mobifone_portal_token");
          localStorage.removeItem("mobifone_portal_user");
          setToken(null);
          setUser(null);
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Gắn Bearer token vào header mỗi request nếu có
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const adminToken = localStorage.getItem("mobifone_admin_token");
      const portalToken = localStorage.getItem("mobifone_portal_token");
      const activeToken = adminToken || portalToken;
      if (activeToken) config.headers.Authorization = `Bearer ${activeToken}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Đồng bộ thông tin từ backend khi ứng dụng khởi chạy nếu đã đăng nhập portal hoặc admin
  useEffect(() => {
    const fetchPortalProfile = async () => {
      const portalToken = localStorage.getItem("mobifone_portal_token");
      if (portalToken) {
        try {
          const response = await axios.get(`${API_BASE}/subscribers/me`);
          const sub = response.data;
          if (sub && sub.id) {
            setUser(prev => {
              const mappedUser: AuthUser = {
                id: sub.id,
                name: sub.name || `Thành viên ${sub.phoneNumber.slice(-4)}`,
                phone: sub.phoneNumber,
                email: sub.email || `${sub.phoneNumber}@mobifone.vn`,
                role: "user",
                tier: "Gold",
                package: sub.currentPackage ? `${sub.currentPackage} Ultra` : "Không có gói",
                packageCode: sub.currentPackage || "",
                packageExpiry: sub.packageExpiry ? new Date(sub.packageExpiry).toLocaleDateString("vi-VN") : "N/A",
                dataUsedGB: sub.dataUsedGB || 0,
                dataTotalGB: sub.dataTotalGB || 0,
                voiceUsedMin: 0,
                voiceTotalMin: sub.currentPackage ? 600 : 0,
                balance: 150000,
                points: 1200,
                joinDate: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
                address: sub.address || "Chưa cập nhật",
                dob: sub.dob || "1990-01-01",
                avatar: sub.avatar || undefined,
              };
              localStorage.setItem("mobifone_portal_user", JSON.stringify(mappedUser));
              return mappedUser;
            });
          }
        } catch (error) {
          console.warn("Không thể đồng bộ profile từ backend:", error);
        }
      }
    };

    const fetchAdminProfile = async () => {
      const adminToken = localStorage.getItem("mobifone_admin_token");
      if (adminToken) {
        try {
          const response = await axios.get(`${API_BASE}/users/me`);
          const adminData = response.data;
          if (adminData && adminData.id) {
            setUser(prev => {
              const mappedUser: AuthUser = {
                id: String(adminData.id),
                name: adminData.name || "MobiFone Administrator",
                phone: adminData.phone || "0987654321",
                email: adminData.email || "admin@mobifone.vn",
                role: "admin",
                tier: "Diamond",
                package: "Staff",
                packageCode: "STAFF",
                packageExpiry: "31/12/2026",
                dataUsedGB: 0,
                dataTotalGB: 0,
                voiceUsedMin: 0,
                voiceTotalMin: 0,
                balance: 0,
                points: 0,
                joinDate: "01/01/2020",
                address: adminData.address || "MobiFone HQ, Hà Nội",
                dob: adminData.dob || "1988-05-12",
                avatar: adminData.avatar || undefined,
              };
              localStorage.setItem("mobifone_admin_user", JSON.stringify(mappedUser));
              return mappedUser;
            });
          }
        } catch (error) {
          console.warn("Không thể đồng bộ profile admin từ backend:", error);
        }
      }
    };

    fetchPortalProfile();
    fetchAdminProfile();
  }, []);

  const login = async (identifier: string, password: string): Promise<"user" | "admin" | "error"> => {
    // Chỉ xóa các token phiên làm việc đang có
    localStorage.removeItem("mobifone_admin_token");
    localStorage.removeItem("mobifone_portal_token");
    setToken(null);
    setUser(null);

    const idLower = identifier.toLowerCase().trim();
    const isAdmin = idLower === "admin" || idLower === "admin@mobifone.vn" || idLower.includes("admin");

    if (isAdmin) {
      try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
          username: "admin",
          password: password,
        });
        const apiToken = response.data?.access_token;
        const apiUser = response.data?.user;
        if (apiToken && apiUser) {
          localStorage.setItem("mobifone_admin_token", apiToken);
          setToken(apiToken);
          const adminUser: AuthUser = {
            id: String(apiUser.id),
            name: apiUser.name || "MobiFone Administrator",
            phone: apiUser.phone || "0987654321",
            email: apiUser.email || "admin@mobifone.vn",
            role: "admin",
            tier: "Diamond",
            package: "Staff",
            packageCode: "STAFF",
            packageExpiry: "31/12/2026",
            dataUsedGB: 0,
            dataTotalGB: 0,
            voiceUsedMin: 0,
            voiceTotalMin: 0,
            balance: 0,
            points: 0,
            joinDate: "01/01/2020",
            address: apiUser.address || "MobiFone HQ, Hà Nội",
            dob: apiUser.dob || "1988-05-12",
            avatar: apiUser.avatar || undefined,
          };
          localStorage.setItem("mobifone_admin_user", JSON.stringify(adminUser));
          setUser(adminUser);
          return "admin";
        }
      } catch (error) {
        console.error("Lỗi xác thực Admin:", error);
        return "error";
      }
    }

    // Tài khoản user thường: Phải có độ dài từ 6 ký tự trở lên và không chứa chữ "admin" để tránh nhầm lẫn
    if (idLower.length >= 6 && !idLower.includes("admin")) {
      try {
        const response = await axios.post(`${API_BASE}/subscribers/login-demo`, {
          phoneNumber: identifier,
          password: password,
        });
        const { token: apiToken, subscriber: sub } = response.data;
        if (apiToken && sub) {
          localStorage.setItem("mobifone_portal_token", apiToken);
          setToken(apiToken);
          
          const mappedUser: AuthUser = {
            id: sub.id,
            name: sub.name || `Thành viên ${sub.phoneNumber.slice(-4)}`,
            phone: sub.phoneNumber,
            email: sub.email || `${sub.phoneNumber}@mobifone.vn`,
            role: "user",
            tier: "Gold",
            package: sub.currentPackage ? `${sub.currentPackage} Ultra` : "Không có gói",
            packageCode: sub.currentPackage || "",
            packageExpiry: sub.packageExpiry ? new Date(sub.packageExpiry).toLocaleDateString("vi-VN") : "N/A",
            dataUsedGB: sub.dataUsedGB || 0,
            dataTotalGB: sub.dataTotalGB || 0,
            voiceUsedMin: 0,
            voiceTotalMin: sub.currentPackage ? 600 : 0,
            balance: 150000,
            points: 1200,
            joinDate: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
            address: sub.address || "Chưa cập nhật",
            dob: sub.dob || "01/01/1990",
            avatar: sub.avatar || undefined,
          };
          localStorage.setItem("mobifone_portal_user", JSON.stringify(mappedUser));
          setUser(mappedUser);
          return "user";
        }
      } catch (error) {
        console.warn("Lỗi đăng nhập Subscriber:", error);
        return "error";
      }
    }

    return "error";
  };

  const register = async (phone: string, password: string, name?: string): Promise<"success" | "error"> => {
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: phone,
        password: password,
        name: name || `User_${phone.slice(-4)}`,
      });
      // Đăng nhập ngay sau khi đăng ký thành công
      await login(phone, password);
      return "success";
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      return "error";
    }
  };

  const logout = () => {
    localStorage.removeItem("mobifone_admin_token");
    localStorage.removeItem("mobifone_portal_token");
    // Giữ nguyên cache mobifone_admin_user và mobifone_portal_user trong localStorage
    // Để giữ lại avatar và thông tin cá nhân đã cập nhật khi logout/login lại.
    setToken(null);
    setUser(null);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...patch };
      if (updated.role === "user") {
        localStorage.setItem("mobifone_portal_user", JSON.stringify(updated));
      } else if (updated.role === "admin") {
        localStorage.setItem("mobifone_admin_user", JSON.stringify(updated));
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
