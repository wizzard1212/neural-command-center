import { Outlet } from "react-router-dom";
import { IconRail } from "./IconRail";
import { StatusBar } from "./StatusBar";
import { LiveStreamSidebar } from "./LiveStreamSidebar";
import { useVaultWs } from "../../lib/useVaultWs";

export function AppShell() {
  useVaultWs();

  return (
    <div className="flex h-screen min-w-[1280px] overflow-hidden">
      <IconRail />
      <div className="flex flex-1 flex-col overflow-hidden">
        <StatusBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <LiveStreamSidebar />
    </div>
  );
}
