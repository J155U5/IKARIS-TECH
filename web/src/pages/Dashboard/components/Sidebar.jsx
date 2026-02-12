import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  FiGrid,
  FiFileText,
  FiUsers,
  FiFolder,
  FiSettings,
  FiBox,
  FiShoppingCart,
  FiDollarSign,
  FiBriefcase,
  FiBarChart2,
  FiShield,
  FiSliders,
} from "react-icons/fi";




function Item({ icon, label, active, onClick, disabled, badge }) {
  return (
    <button
      className={`ik-sideitem ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      title={label}
      aria-disabled={disabled ? "true" : "false"}
    >
      <span className="ik-sideitem__icon">{icon}</span>

      {/* ✅ siempre existe, CSS lo oculta en collapsed */}
      <span className="ik-sideitem__label">{label}</span>
      {badge ? <span className="ik-sidebadge">{badge}</span> : null}
    </button>
  );
}


function Section({ title, children }) {
  return (
    <div className="ik-sidesection">
      <div className="ik-sidesection__title">{title}</div>
      <div className="ik-sidesection__items">{children}</div>
    </div>
  );
}


export default function Sidebar({ ctx }) {
  const role = String(ctx?.role || "POLITES").toUpperCase();
  const plan = String(ctx?.company?.plan || "free").toLowerCase();

  const isAdmin = role === "ARCHON" || role === "EPISTATES";
  const canUsers = isAdmin;
  const canSettings = isAdmin;
  const canFinance = role === "ARCHON";

  const modules = useMemo(() => {
    return [
      {
        title: "Core",
        items: [
          { key: "dashboard", label: "Dashboard", icon: <FiGrid />, path: "/dashboard" },
          { key: "forms", label: "Forms", icon: <FiFileText />, path: "/forms", soon: false },
          { key: "documents", label: "Documents", icon: <FiFolder />, path: "/documents", soon: true },
        ],
      },
      {
        title: "Operación",
        items: [
          { key: "inventory", label: "Inventario", icon: <FiBox />, path: "/inventory", soon: true },
          { key: "purchases", label: "Compras", icon: <FiShoppingCart />, path: "/purchases", soon: true },
          { key: "sales", label: "Ventas", icon: <FiBriefcase />, path: "/sales", soon: true },
        ],
      },
      {
        title: "Finanzas",
        items: [
          { key: "treasury", label: "Tesorería", icon: <FiDollarSign />, path: "/treasury", soon: true, disabled: !canFinance, badge: !canFinance ? "ARCHON" : null },
          { key: "accounting", label: "Contabilidad", icon: <FiBarChart2 />, path: "/accounting", soon: true, disabled: !canFinance, badge: !canFinance ? "ARCHON" : null },
        ],
      },
      {
        title: "Administración",
        items: [
          { key: "users", label: "Users", icon: <FiUsers />, path: "/users", soon: true, disabled: !canUsers, badge: !canUsers ? "ADMIN" : null },
          { key: "security", label: "Seguridad", icon: <FiShield />, path: "/security", soon: true, disabled: !canSettings, badge: !canSettings ? "ADMIN" : null },
          { key: "settings", label: "Settings", icon: <FiSettings />, path: "/settings", soon: true, disabled: !canSettings, badge: !canSettings ? "ADMIN" : null },
        ],
      },
    ];
  }, [canFinance, canSettings, canUsers]);

  const location = useLocation();
  const activePath = location.pathname;

  function go(path, soon) {
    if (soon) {
      alert(`Módulo en camino: ${path}`);
      return;
    }
    if (typeof ctx?.go === "function") {
      ctx.go(path);
      return;
    }
    window.location.assign(path);
  }

  return (
    <aside className="ik-sidebar ik-sidebar--hover">
      <div className="ik-sidebar__top">
        <div className="ik-sidebar__title" >Módulos</div>
      </div>

      <div className="ik-sidebar__items">
        {modules.map((sec) => (
          <Section key={sec.title} title={sec.title}>
            {sec.items.map((m) => (
              <Item
                key={m.key}
                icon={m.icon}
                label={m.label}
                active={activePath === m.path || activePath.startsWith(m.path + "/")}
                disabled={!!m.disabled}
                badge={m.badge || (m.soon ? "SOON" : null)}
                onClick={() => go(m.path, m.soon)}
              />
            ))}
            <div className="ik-sep" />
          </Section>
        ))}
      </div>

      <div className="ik-sidebar__bottom">
        <div className="ik-sidebar__foot">
          <div className="ik-foot__k">IKARIS</div>
          <div className="ik-foot__v">
            Plan: <b>{String(plan).toUpperCase()}</b> · Rol: <b>{role}</b>
          </div>
        </div>
      </div>
    </aside>
  );
}
