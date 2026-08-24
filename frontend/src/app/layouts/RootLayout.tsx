import { Outlet } from "react-router";
import { Navbar } from "../components/Navbar";
import { ChatWidget } from "../components/ChatWidget";

export function RootLayout() {
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}
