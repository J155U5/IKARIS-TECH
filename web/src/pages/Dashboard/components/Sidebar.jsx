import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  FiGrid,
  FiFileText,
  FiUsers,
  FiFolder,
  FiSettings,
  FiMenu,
  FiBox,
  FiShoppingCart,
  FiDollarSign,
  FiBriefcase,
  FiBarChart2,
  FiShield,
  FiSliders,
} from "react-icons/fi";



function Item({ icon, label, active, collapsed, onClick, disabled, badge }) {
  return (
    <button
      className={`ik-sideitem ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      title={collapsed ? label : undefined}
      aria-disabled={disabled ? "true" : "false"}
    >
      <span className="ik-sideitem__icon">{icon}</span>
      {!collapsed ? (
        <>
          <span className="ik-sideitem__label">{label}</span>
          {badge ? <span className="ik-sidebadge">{badge}</span> : null}
        </>
      ) : null}
    </button>
  );
}

function Section({ title, collapsed, children }) {
  return (
    <div className="ik-sidesection">
      {!collapsed ? <div className="ik-sidesection__title">{title}</div> : null}
      <div className="ik-sidesection__items">{children}</div>
    </div>
  );
}

export default function Sidebar({ ctx, collapsed, onToggle }) {
  const role = String(ctx?.role || "POLITES").toUpperCase();
  const plan = String(ctx?.company?.plan || "free").toLowerCase();

  const isAdmin = role === "ARCHON" || role === "EPISTATES";

  // 🚦 gating base (luego lo hacemos fino)
  const canUsers = isAdmin;
  const canSettings = isAdmin;
  const canFinance = role === "ARCHON"; // contabilidad/tesorería solo ARCHON por ahora

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
          {
            key: "treasury",
            label: "Tesorería",
            icon: <FiDollarSign />,
            path: "/treasury",
            soon: true,
            disabled: !canFinance,
            badge: !canFinance ? "ARCHON" : null,
          },
          {
            key: "accounting",
            label: "Contabilidad",
            icon: <FiBarChart2 />,
            path: "/accounting",
            soon: true,
            disabled: !canFinance,
            badge: !canFinance ? "ARCHON" : null,
          },
        ],
      },
      {
        title: "Administración",
        items: [
          {
            key: "users",
            label: "Users",
            icon: <FiUsers />,
            path: "/users",
            soon: true,
            disabled: !canUsers,
            badge: !canUsers ? "ADMIN" : null,
          },
          {
            key: "security",
            label: "Seguridad",
            icon: <FiShield />,
            path: "/security",
            soon: true,
            disabled: !canSettings,
            badge: !canSettings ? "ADMIN" : null,
          },
          {
            key: "settings",
            label: "Settings",
            icon: <FiSettings />,
            path: "/settings",
            soon: true,
            disabled: !canSettings,
            badge: !canSettings ? "ADMIN" : null,
          },
        ],
      },
    ];
  }, [canFinance, canSettings, canUsers]);

  const location = useLocation();

  function go(path, soon) {
    if (soon) {
      // eslint-disable-next-line no-alert
      alert(`Módulo en camino: ${path}`);
      return;
    }

    // ✅ SPA navigation (sin recargar)
    if (typeof ctx?.go === "function") {
      ctx.go(path);
      return;
    }

    // fallback (por si algo raro pasa)
    window.location.assign(path);
  }

  // ✅ active real basado en la URL
  const activePath = location.pathname;


  return (
    <aside className={`ik-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="ik-sidebar__top">
        <div className="ik-sidebar__title">{collapsed ? " " : "Módulos"}</div>

<button className="ik-iconbtn" onClick={onToggle} title={collapsed ? "Abrir menú" : "Cerrar menú"}>
  <FiMenu />
</button>

      </div>

      <div className="ik-sidebar__items">
        {modules.map((sec) => (
          <Section key={sec.title} title={sec.title} collapsed={collapsed}>
            {sec.items.map((m) => (
              <Item
                key={m.key}
                icon={m.icon}
                label={m.label}
                collapsed={collapsed}
                active={activePath === m.path || activePath.startsWith(m.path + "/")}
                disabled={!!m.disabled}
                badge={m.badge || (m.soon ? "SOON" : null)}
                onClick={() => go(m.path, m.soon)}
              />

            ))}
            {!collapsed ? <div className="ik-sep" /> : null}
          </Section>
        ))}
      </div>

      <div className="ik-sidebar__bottom">
        {!collapsed ? (
          <div className="ik-sidebar__foot">
            <div className="ik-foot__k">IKARIS</div>
            <div className="ik-foot__v">
              Plan: <b>{String(plan).toUpperCase()}</b> · Rol: <b>{role}</b>
            </div>
          </div>
        ) : (
          <div className="ik-sidebar__foot ik-sidebar__foot--mini">
            <FiSliders />
          </div>
        )}
      </div>
    </aside>
  );
}
