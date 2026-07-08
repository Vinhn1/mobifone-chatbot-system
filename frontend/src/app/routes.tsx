import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { UserLayout } from "./layouts/UserLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ESIMPage } from "./pages/portal/ESIMPage";
import { PackagesPage } from "./pages/portal/PackagesPage";
import { PromotionsPage } from "./pages/portal/PromotionsPage";
import { SupportPage } from "./pages/portal/SupportPage";
import { UserDashboard } from "./pages/user/UserDashboard";
import { UserPackages } from "./pages/user/UserPackages";
import { UserProfile } from "./pages/user/UserProfile";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { LeadsPage } from "./pages/admin/LeadsPage";
import { ConversationsPage } from "./pages/admin/ConversationsPage";
import { KnowledgeBasePage } from "./pages/admin/KnowledgeBasePage";
import { PromptPlaygroundPage } from "./pages/admin/PromptPlaygroundPage";
import { BotConfigPage } from "./pages/admin/BotConfigPage";
import { AdminProfilePage } from "./pages/admin/AdminProfilePage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "esim", Component: ESIMPage },
      { path: "packages", Component: PackagesPage },
      { path: "promotions", Component: PromotionsPage },
      { path: "support", Component: SupportPage },
    ],
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute role="user">
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: UserDashboard },
      { path: "packages", Component: UserPackages },
      { path: "profile", Component: UserProfile },
    ],
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
          <ProtectedRoute allowedRoles={["admin"]}>
            <KnowledgeBasePage />
          </ProtectedRoute>
        )
      },
      {
        path: "playground",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
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
      { path: "profile", Component: AdminProfilePage },
    ],
  },
  // Fallback 404 → trang chủ
  { path: "*", element: <Navigate to="/" replace /> },
]);
