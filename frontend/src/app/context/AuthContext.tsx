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

const MOCK_USER: AuthUser = {
  id: "U001",
  name: "Nguyễn Thị Lan",
  phone: "0912 345 678",
  email: "lan.nguyen@gmail.com",
  role: "user",
  tier: "Gold",
  package: "TK135 Ultra",
  packageCode: "TK135",
  packageExpiry: "10/07/2026",
  dataUsedGB: 68,
  dataTotalGB: 120,
  voiceUsedMin: 320,
  voiceTotalMin: 600,
  balance: 125000,
  points: 4820,
  joinDate: "15/03/2021",
  address: "45 Lê Lợi, Q.1, TP.HCM",
  dob: "05/08/1994",
};

const MOCK_ADMIN: AuthUser = {
  id: "A001",
  name: "Trần Minh Tuấn",
  phone: "0987 654 321",
  email: "admin@mobifone.vn",
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
  address: "MobiFone HQ, Hà Nội",
  dob: "12/05/1988",
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("mobifone_admin_token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedToken = localStorage.getItem("mobifone_admin_token");
    if (savedToken) return MOCK_ADMIN;
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

  // Đồng bộ thông tin từ backend khi ứng dụng khởi chạy nếu đã đăng nhập portal
  useEffect(() => {
    const fetchPortalProfile = async () => {
      const portalToken = localStorage.getItem("mobifone_portal_token");
      if (portalToken) {
        try {
          const response = await axios.get(`${API_BASE}/subscribers/me`);
          const sub = response.data;
          if (sub && sub.id) {
            setUser(prev => {
              const baseUser = prev || MOCK_USER;
              const mappedUser: AuthUser = {
                ...baseUser,
                id: sub.id,
                name: sub.name || baseUser.name || `Thành viên ${sub.phoneNumber.slice(-4)}`,
                phone: sub.phoneNumber,
                email: sub.email || baseUser.email || `${sub.phoneNumber}@mobifone.vn`,
                role: "user",
                package: sub.currentPackage ? `${sub.currentPackage} Ultra` : "Không có gói",
                packageCode: sub.currentPackage || "",
                packageExpiry: sub.packageExpiry ? new Date(sub.packageExpiry).toLocaleDateString("vi-VN") : "N/A",
                dataUsedGB: sub.dataUsedGB || 0,
                dataTotalGB: sub.dataTotalGB || 0,
                address: sub.address || baseUser.address || "Chưa cập nhật",
                dob: sub.dob || baseUser.dob || "01/01/1990",
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
    fetchPortalProfile();
  }, []);

  const login = async (identifier: string, password: string): Promise<"user" | "admin" | "error"> => {
    // Clear any previous session state to prevent mix-ups
    localStorage.removeItem("mobifone_admin_token");
    localStorage.removeItem("mobifone_portal_token");
    localStorage.removeItem("mobifone_portal_user");
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
        if (apiToken) {
          localStorage.setItem("mobifone_admin_token", apiToken);
          setToken(apiToken);
          setUser(MOCK_ADMIN);
          return "admin";
        }
      } catch (error) {
        console.error("Lỗi xác thực Admin:", error);
        // Chế độ Demo Fallback: Nếu database lỗi hoặc backend chưa chạy,
        // cho phép đăng nhập làm Admin nếu mật khẩu nhập vào đúng là "admin123"
        if (password === "admin123") {
          console.log("Đăng nhập Admin ở chế độ Demo Fallback thành công!");
          localStorage.setItem("mobifone_admin_token", "demo_token_admin");
          setToken("demo_token_admin");
          setUser(MOCK_ADMIN);
          return "admin";
        }
        return "error";
      }
    }

    // Tài khoản user thường: Phải có độ dài từ 6 ký tự trở lên và không chứa chữ "admin" để tránh nhầm lẫn
    if (idLower.length >= 6 && !idLower.includes("admin")) {
      localStorage.setItem("mobifone_portal_user", JSON.stringify(MOCK_USER));
      setUser(MOCK_USER);
      return "user";
    }

    return "error";
  };

  const register = async (phone: string, password: string, name?: string): Promise<"success" | "error"> => {
    try {
      // Nếu đã xác thực OTP thành công ở bước trước và đã lưu thông tin người dùng
      const savedUser = localStorage.getItem("mobifone_portal_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.phone === phone) {
          setUser(parsed);
          return "success";
        }
      }

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
      // Nếu backend chưa chạy hoặc trả về 404/500 do chưa có endpoint register
      const isNetworkError = (error as any)?.code === "ERR_NETWORK";
      const is404 = (error as any)?.response?.status === 404;
      if (isNetworkError || is404) {
        const newUser: AuthUser = {
          ...MOCK_USER,
          id: `U${Date.now()}`,
          phone,
          name: name || `Thành viên ${phone.slice(-4)}`,
        };
        localStorage.setItem("mobifone_portal_user", JSON.stringify(newUser));
        setUser(newUser);
        return "success";
      }
      return "error";
    }
  };

  const logout = () => {
    localStorage.removeItem("mobifone_admin_token");
    localStorage.removeItem("mobifone_portal_token");
    localStorage.removeItem("mobifone_portal_user");
    setToken(null);
    setUser(null);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...patch };
      if (updated.role === "user") {
        localStorage.setItem("mobifone_portal_user", JSON.stringify(updated));
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
