import React, { useMemo } from "react";
import { FiArrowRight, FiCheckCircle, FiClock, FiFileText, FiUsers, FiTrendingUp, FiCalendar } from "react-icons/fi";


function Title({ icon, text, right }) {
  return (
    <div className="ik-widget__head">
      <div className="ik-widget__title">
        <span className="ik-widget__icon">{icon}</span>
        <span>{text}</span>
      </div>
      {right ? <div className="ik-widget__right">{right}</div> : null}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div className="ik-skel">
      <div className="ik-skel__line" />
      <div className="ik-skel__line short" />
      <div className="ik-skel__line" />
    </div>
  );
}

export function WidgetInbox({ ctx, stats }) {
  const companyName = ctx?.company?.name || "Empresa";

  // placeholders (luego: audit_log + approvals + tasks)
  const pendingApprovals = stats?.pendingApprovals ?? 0;
  const pendingForms = stats?.formsPending ?? 0;

  const checklist = [
    { k: "Invitar usuarios", ok: false },
    { k: "Crear primer formulario", ok: pendingForms >= 0 }, // placeholder, luego true cuando exista 1
    { k: "Subir primer documento", ok: false },
  ];

  return (
    <div className="ik-widget">
      <Title icon={<FiCheckCircle />} text="Pendientes" />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <>
            <div className="ik-kv">
              <div className="ik-kv__k">Empresa</div>
              <div className="ik-kv__v">{companyName}</div>
            </div>

            <div className="ik-metricRow">
              <div className="ik-metric">
                <div className="ik-metric__n">{pendingApprovals}</div>
                <div className="ik-metric__l">Aprobaciones</div>
              </div>
              <div className="ik-metric">
                <div className="ik-metric__n">{pendingForms}</div>
                <div className="ik-metric__l">Forms pendientes</div>
              </div>
            </div>

            <div className="ik-checklist">
              {checklist.map((c) => (
                <div key={c.k} className={`ik-check ${c.ok ? "ok" : ""}`}>
                  <span className="ik-check__dot">{c.ok ? "✓" : "•"}</span>
                  <span className="ik-check__txt">{c.k}</span>
                </div>
              ))}
            </div>

            <button className="ik-miniBtn" onClick={() => alert("Pendientes (próximo)")}>
              Ver pendientes <FiArrowRight />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function WidgetUsers({ ctx, stats }) {
  const canManageUsers = ctx?.role === "ARCHON" || ctx?.role === "EPISTATES";

  return (
    <div className="ik-widget">
      <Title
        icon={<FiUsers />}
        text="Users"
        right={canManageUsers ? <span className="ik-pill">ADMIN</span> : null}
      />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <>
            <div className="ik-metricRow">
              <div className="ik-metric">
                <div className="ik-metric__n">{stats?.usersTotal ?? 0}</div>
                <div className="ik-metric__l">Usuarios</div>
              </div>
              <div className="ik-metric">
                <div className="ik-metric__n">{canManageUsers ? "✔" : "—"}</div>
                <div className="ik-metric__l">Gestión</div>
              </div>
            </div>

            <div className="ik-empty">
              {canManageUsers
                ? "Aquí irán los últimos usuarios creados y acciones rápidas."
                : "Tu rol no administra usuarios. (ARCHON/EPISTATES sí)"}
            </div>

            {canManageUsers ? (
              <button className="ik-miniBtn" onClick={() => alert("Crear usuario (próximo)")}>
                Crear usuario <FiArrowRight />
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function WidgetMyForms({ ctx, stats }) {
  const canCreate =
    ctx?.role === "ARCHON" ||
    ctx?.role === "EPISTATES" ||
    ctx?.me?.user?.can_create_forms === true ||
    ctx?.me?.can_create_forms === true;

  return (
    <div className="ik-widget">
      <Title icon={<FiFileText />} text="My Forms" right={canCreate ? <span className="ik-pill">+</span> : null} />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <>
            <div className="ik-metricRow">
              <div className="ik-metric">
                <div className="ik-metric__n">{stats?.formsTotal ?? 0}</div>
                <div className="ik-metric__l">Total</div>
              </div>
              <div className="ik-metric">
                <div className="ik-metric__n">{stats?.formsPending ?? 0}</div>
                <div className="ik-metric__l">Pendientes</div>
              </div>
            </div>

            <div className="ik-empty">
              Aquí mostraremos tus formularios recientes + accesos rápidos.
            </div>

            {canCreate ? (
              <button className="ik-miniBtn" onClick={() => alert("Crear formulario (próximo)")}>
                Crear formulario <FiArrowRight />
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function WidgetLastMovements({ ctx }) {
  const items = useMemo(() => {
    // luego esto se conecta a audit_log
    return [
      { id: 1, icon: <FiClock />, text: "Actividad reciente (placeholder)", ts: "hoy" },
      { id: 2, icon: <FiClock />, text: "Aprobaciones / cambios / respuestas", ts: "—" },
      { id: 3, icon: <FiClock />, text: "Traza completa por auditoría", ts: "—" },
    ];
  }, []);

  return (
    <div className="ik-widget">
      <Title icon={<FiClock />} text="Last Movements" />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <div className="ik-timeline">
            {items.map((it) => (
              <div key={it.id} className="ik-timeline__item">
                <div className="ik-timeline__dot">{it.icon}</div>
                <div className="ik-timeline__txt">
                  <div className="ik-timeline__main">{it.text}</div>
                  <div className="ik-timeline__ts">{it.ts}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WidgetLastDocuments({ ctx }) {
  const docs = useMemo(() => {
    // luego conectamos a storage/tabla docs
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `Documento ${i + 1}`,
      meta: "—",
    }));
  }, []);

  return (
    <div className="ik-widget">
      <Title icon={<FiFileText />} text="Last Documents" />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <>
            <div className="ik-docgrid">
              {docs.map((d) => (
                <button key={d.id} className="ik-doc" onClick={() => alert("Abrir documento (próximo)")}>
                  <div className="ik-doc__icon">📄</div>
                  <div className="ik-doc__name">{d.name}</div>
                  <div className="ik-doc__meta">{d.meta}</div>
                </button>
              ))}
            </div>
            <button className="ik-miniBtn" onClick={() => alert("Ver todos (próximo)")}>
              Ver todos <FiArrowRight />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
export function WidgetPerformance({ ctx }) {
  // Placeholder: aquí conectaremos métricas reales (forms respondidos, docs subidos, approvals, etc.)
  const points = [18, 30, 22, 44, 28, 52, 41, 66, 58, 72, 64, 80];

  return (
    <div className="ik-widget">
      <Title icon={<FiTrendingUp />} text="Rendimiento" right={<span className="ik-pill">Mes</span>} />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <>
            <div className="ik-perf">
              <div className="ik-perf__kpis">
                <div className="ik-perf__kpi">
                  <div className="ik-perf__n">+12%</div>
                  <div className="ik-perf__l">Eficiencia</div>
                </div>
                <div className="ik-perf__kpi">
                  <div className="ik-perf__n">4</div>
                  <div className="ik-perf__l">Aprobaciones</div>
                </div>
                <div className="ik-perf__kpi">
                  <div className="ik-perf__n">9</div>
                  <div className="ik-perf__l">Movimientos</div>
                </div>
              </div>

              <div className="ik-spark">
                <div className="ik-spark__title">Tendencia</div>
                <div className="ik-spark__bars">
                  {points.map((p, i) => (
                    <div key={i} className="ik-spark__bar" style={{ height: `${p}%` }} />
                  ))}
                </div>
                <div className="ik-spark__meta">Últimos 12 días (placeholder)</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function WidgetCalendar({ ctx }) {
  // Placeholder simple (sin librerías)
  const days = Array.from({ length: 35 }).map((_, i) => i + 1);
  const today = 14;

  return (
    <div className="ik-widget">
      <Title icon={<FiCalendar />} text="Calendario" right={<span className="ik-pill">Enero</span>} />
      <div className="ik-widget__body">
        {ctx.loading ? (
          <SkeletonLines />
        ) : (
          <>
            <div className="ik-cal__week">
              {["D", "L", "M", "M", "J", "V", "S"].map((d) => (
                <div key={d} className="ik-cal__w">{d}</div>
              ))}
            </div>

            <div className="ik-cal__grid">
              {days.map((n) => (
                <button
                  key={n}
                  className={`ik-cal__day ${n === today ? "is-today" : ""} ${n > 31 ? "is-out" : ""}`}
                  onClick={() => alert(`Día ${n} (placeholder)`)}
                  type="button"
                >
                  {n <= 31 ? n : ""}
                </button>
              ))}
            </div>

            <div className="ik-cal__hint">Eventos y tareas se conectan después (audit_log / tasks).</div>
          </>
        )}
      </div>
    </div>
  );
}
