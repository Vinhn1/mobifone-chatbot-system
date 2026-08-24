import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { LeadsPage } from "./pages/admin/LeadsPage";
import { ConversationsPage } from "./pages/admin/ConversationsPage";
import { KnowledgeBasePage } from "./pages/admin/KnowledgeBasePage";
import { ChatMiningPage } from "./pages/admin/ChatMiningPage";
import { PromptPlaygroundPage } from "./pages/admin/PromptPlaygroundPage";
import { BotConfigPage } from "./pages/admin/BotConfigPage";
import { AdminProfilePage } from "./pages/admin/AdminProfilePage";
import { StaffManagementPage } from "./pages/admin/StaffManagementPage";
import { EmbedChatPage } from "./pages/EmbedChatPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
    ],
  },
  {
    path: "/embed",
    Component: EmbedChatPage,
  },
  {
    path: "/widget",
    Component: EmbedChatPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin", "sales"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: DashboardPage },
      { path: "leads", Component: LeadsPage },
      { path: "conversations", Component: ConversationsPage },
      {
        path: "knowledge",
        element: (
          <ProtectedRoute allowedRoles={["admin", "sales"]}>
            <KnowledgeBasePage />
          </ProtectedRoute>
        )
      },
      {
        path: "chat-mining",
        element: (
          <ProtectedRoute allowedRoles={["admin", "sales"]}>
            <ChatMiningPage />
          </ProtectedRoute>
        )
      },
      {
        path: "playground",
        element: (
          <ProtectedRoute allowedRoles={["admin", "sales"]}>
            <PromptPlaygroundPage />
          </ProtectedRoute>
        )
      },
      {
        path: "bot-config",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <BotConfigPage />
          </ProtectedRoute>
        )
      },
      {
        path: "staff",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <StaffManagementPage />
          </ProtectedRoute>
        )
      },
      { path: "profile", Component: AdminProfilePage },
    ],
  },
  // Fallback 404 → trang đăng nhập
  { path: "*", element: <Navigate to="/login" replace /> },
]);
