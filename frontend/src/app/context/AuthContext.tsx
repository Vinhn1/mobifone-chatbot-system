import { createContext, useContext, useState, type ReactNode, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../config";

export type AuthRole = "admin" | "sales";

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: AuthRole;
  avatar?: string;
  address: string;
  dob: string;
  twoFaEnabled?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<"admin" | "sales" | "require_2fa" | "error">;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  verify2faLogin: (username: string, otpCode: string) => Promise<"admin" | "sales" | "error">;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => "error",
  logout: () => {},
  updateUser: () => {},
  verify2faLogin: async () => "error",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("mobifone_admin_token");
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("mobifone_admin_user");
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  // Axios interceptor: tự động logout khi nhận 401 (ngoại trừ khi đang gọi api login)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const isAuthRequest =
          error.config?.url?.includes("/auth/login") ||
          error.config?.url?.includes("/auth/verify-2fa");
        if (error.response?.status === 401 && !isAuthRequest) {
          // Token hết hạn hoặc không hợp lệ → logout tự động và xóa toàn bộ session
          localStorage.removeItem("mobifone_admin_token");
          localStorage.removeItem("mobifone_admin_user");
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
      if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Đồng bộ thông tin admin/sales từ backend khi ứng dụng khởi chạy
  useEffect(() => {
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
                name: adminData.name || (adminData.role === "sales" ? "Nhân viên CSKH MobiFone" : "MobiFone Administrator"),
                phone: adminData.phone || "0987654321",
                email: adminData.email || (adminData.role === "sales" ? "sales@mobifone.vn" : "admin@mobifone.vn"),
                role: (adminData.role || "admin") as AuthRole,
                address: adminData.address || "MobiFone HQ, Hà Nội",
                dob: adminData.dob || "1988-05-12",
                avatar: adminData.avatar || undefined,
                twoFaEnabled: adminData.twoFaEnabled || false,
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

    fetchAdminProfile();
  }, []);

  const login = async (identifier: string, password: string): Promise<"admin" | "sales" | "require_2fa" | "error"> => {
    localStorage.removeItem("mobifone_admin_token");
    localStorage.removeItem("mobifone_admin_user");
    setToken(null);
    setUser(null);

    const idClean = identifier.trim();
    const idLower = idClean.toLowerCase();
    let loginUsername = idClean;
    if (idLower.endsWith("@mobifone.vn")) {
      loginUsername = idClean.split("@")[0];
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        username: loginUsername,
        password: password,
      });

      if (response.data?.require2fa) {
        return "require_2fa";
      }

      const apiToken = response.data?.access_token;
      const apiUser = response.data?.user;
      if (apiToken && apiUser) {
        localStorage.setItem("mobifone_admin_token", apiToken);
        setToken(apiToken);
        const staffUser: AuthUser = {
          id: String(apiUser.id),
          name: apiUser.name || (apiUser.role === "sales" ? "Nhân viên CSKH MobiFone" : "MobiFone Administrator"),
          phone: apiUser.phone || "0987654321",
          email: apiUser.email || (apiUser.role === "sales" ? "sales@mobifone.vn" : "admin@mobifone.vn"),
          role: (apiUser.role || "sales") as AuthRole,
          address: apiUser.address || "MobiFone HQ, Hà Nội",
          dob: apiUser.dob || "1988-05-12",
          avatar: apiUser.avatar || undefined,
          twoFaEnabled: apiUser.twoFaEnabled || false,
        };
        localStorage.setItem("mobifone_admin_user", JSON.stringify(staffUser));
        setUser(staffUser);
        return apiUser.role === "sales" ? "sales" : "admin";
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
    }

    return "error";
  };

  const verify2faLogin = async (username: string, otpCode: string): Promise<"admin" | "sales" | "error"> => {
    try {
      const response = await axios.post(`${API_BASE}/auth/verify-2fa`, {
        username,
        otpCode,
      });
      const apiToken = response.data?.access_token;
      const apiUser = response.data?.user;

      if (apiToken && apiUser) {
        localStorage.setItem("mobifone_admin_token", apiToken);
        setToken(apiToken);
        const staffUser: AuthUser = {
          id: String(apiUser.id),
          name: apiUser.name || (apiUser.role === "sales" ? "Nhân viên CSKH MobiFone" : "MobiFone Administrator"),
          phone: apiUser.phone || "0987654321",
          email: apiUser.email || (apiUser.role === "sales" ? "sales@mobifone.vn" : "admin@mobifone.vn"),
          role: (apiUser.role || "admin") as AuthRole,
          address: apiUser.address || "MobiFone HQ, Hà Nội",
          dob: apiUser.dob || "1988-05-12",
          avatar: apiUser.avatar || undefined,
          twoFaEnabled: apiUser.twoFaEnabled || false,
        };
        localStorage.setItem("mobifone_admin_user", JSON.stringify(staffUser));
        setUser(staffUser);
        return apiUser.role === "sales" ? "sales" : "admin";
      }
      return "error";
    } catch (error) {
      console.error("Lỗi xác thực OTP 2FA login:", error);
      return "error";
    }
  };

  const logout = () => {
    localStorage.removeItem("mobifone_admin_token");
    localStorage.removeItem("mobifone_admin_user");
    setToken(null);
    setUser(null);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...patch };
      localStorage.setItem("mobifone_admin_user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, verify2faLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
