import { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  role: "guest" | "user" | "admin";
}

/**
 * Bảo vệ route dựa trên role người dùng.
 * - role="admin" → chỉ cho phép admin truy cập, còn lại redirect /login
 * - role="user"  → chỉ cho phép user đã đăng nhập, còn lại redirect /login
 */
export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user } = useAuth();

  // Chưa đăng nhập → về trang login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Đăng nhập nhưng không đủ quyền
  if (role === "admin" && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (role === "user" && user.role === "guest") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
