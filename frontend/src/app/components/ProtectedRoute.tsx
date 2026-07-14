import { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: "guest" | "user" | "admin" | "sales";
  allowedRoles?: string[];
}

/**
 * Bảo vệ route dựa trên role người dùng.
 * Hỗ trợ cả thuộc tính role đơn lẻ (tương thích ngược) và mảng allowedRoles mới.
 */
export function ProtectedRoute({ children, role, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  // Chưa đăng nhập → về trang login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra phân quyền theo allowedRoles mới (Ưu tiên)
  if (allowedRoles) {
    const isAllowed = allowedRoles.includes(user.role);
    if (!isAllowed) {
      // Nếu là sales agent cố truy cập các trang admin khác, redirect về admin dashboard chính
      if (user.role === "sales") {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  // Kiểm tra role kiểu cũ (cho tương thích ngược)
  if (role) {
    if (role === "admin" && user.role !== "admin" && user.role !== "sales") {
      return <Navigate to="/" replace />;
    }
    if (role === "user" && user.role !== "user") {
      if (user.role === "admin" || user.role === "sales") {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
