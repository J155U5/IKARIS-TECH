import React, { useEffect, useState } from "react";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";

export default function DashboardLayout({ ctx, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ theme global (light = solemne claro, iris = tornasol oscuro)
  const LS_THEME = "ik_theme";
  const [theme, setTheme] = useState("light"); // "light" | "iris"

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_THEME);
      if (t === "iris" || t === "light") setTheme(t);
    } catch (_) {}
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "iris" : "light";
      try {
        localStorage.setItem(LS_THEME, next);
      } catch (_) {}
      return next;
    });
  }

  return (
    <div className={`ik-dashboard theme-${theme}`}>
      <Topbar
        ctx={ctx}
        theme={theme}
        onToggleTheme={toggleTheme}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      />

      <div className={`ik-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <Sidebar
          ctx={ctx}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        <main className="ik-main">{children}</main>
      </div>
    </div>
  );
}
