import { Outlet } from "react-router";
import { Navbar } from "../components/Navbar";
import { ChatWidget } from "../components/ChatWidget";

export function RootLayout() {
  return (
    <div style={{ height: "100vh", width: "100vw", overflowY: "auto", overflowX: "hidden" }}>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  );
}
