import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Shell() {
  return (
    <div className="mdx-root app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
