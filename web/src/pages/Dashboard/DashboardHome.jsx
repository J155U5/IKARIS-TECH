import React, { useMemo } from "react";
import {
  WidgetInbox,
  WidgetUsers,
  WidgetMyForms,
  WidgetLastMovements,
  WidgetLastDocuments,
  WidgetCalendar,
  WidgetPerformance,
} from "./widgets/Widgets";


export default function DashboardHome({ ctx }) {
  const companyName = ctx?.company?.name || "Empresa";
  const plan = ctx?.company?.plan || "free";

  // ✅ rol real del ctx (ya viene arreglado desde Dashboard.jsx)
  const role = String(ctx?.role || "POLITES").toUpperCase();
  const canManageUsers = role === "ARCHON" || role === "EPISTATES";

  const stats = useMemo(() => {
    return {
      formsTotal: 0,
      formsPending: 0,
      usersTotal: 0,
      docsTotal: 0,
      pendingApprovals: 0,
    };
  }, []);

  function go(path) {
    // placeholder por ahora
    alert(`Ir a: ${path} (próximo)`);
  }

  return (
    <div className="ik-home">
      <div className="ik-actions">
        <button className="ik-actionBtn" onClick={() => go("/forms/new")}>
          + Nuevo formulario
        </button>
        <button className="ik-actionBtn" onClick={() => go("/documents/new")}>
          + Subir documento
        </button>
        {canManageUsers ? (
          <button className="ik-actionBtn" onClick={() => go("/users/new")}>
            + Crear usuario
          </button>
        ) : null}
        <button className="ik-actionBtn ghost" onClick={() => go("/audit")}>
          Ver auditoría
        </button>
      </div>

      <div className="ik-kpis">
        <div className="ik-kpi">
          <div className="ik-kpi__n">{stats.formsTotal}</div>
          <div className="ik-kpi__l">Formularios</div>
        </div>
        <div className="ik-kpi">
          <div className="ik-kpi__n">{stats.formsPending}</div>
          <div className="ik-kpi__l">Pendientes</div>
        </div>
        <div className="ik-kpi">
          <div className="ik-kpi__n">{stats.pendingApprovals}</div>
          <div className="ik-kpi__l">Aprobaciones</div>
        </div>
        <div className="ik-kpi">
          <div className="ik-kpi__n">{stats.docsTotal}</div>
          <div className="ik-kpi__l">Documentos</div>
        </div>
      </div>
<div className="ik-grid">
  <section className="ik-card ik-card--myforms">
    <WidgetMyForms ctx={ctx} stats={stats} />
  </section>

  <section className="ik-card ik-card--movements">
    <WidgetLastMovements ctx={ctx} />
  </section>

  <section className="ik-card ik-card--inbox">
    <WidgetInbox ctx={ctx} stats={stats} />
  </section>

  <section className="ik-card ik-card--performance">
    <WidgetPerformance ctx={ctx} />
  </section>

  <section className="ik-card ik-card--calendar">
    <WidgetCalendar ctx={ctx} />
  </section>

  <section className="ik-card ik-card--users">
    <WidgetUsers ctx={ctx} stats={stats} />
  </section>

  <section className="ik-card ik-card--docs">
    <WidgetLastDocuments ctx={ctx} stats={stats} />
  </section>
</div>

    </div>
  );
}
