"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Clock3, Hourglass, Inbox, RotateCcw, Wallet } from "lucide-react";
import { apiGet } from "@/lib/api";
import {
  type Overview,
  type RangeKey,
  PRIORITY_COLORS,
  RANGE_OPTIONS,
  STAGE_COLORS,
  STAGE_ORDER,
  bucketLabel,
  hoursLabel,
  percentLabel,
  pesos,
} from "@/lib/insights";
import styles from "./report-insights.module.css";

type Selection = { range: RangeKey | "custom"; from: string; to: string };

function queryFor(selection: Selection): string | null {
  if (selection.range !== "custom") return `range=${selection.range}`;
  if (!selection.from || !selection.to || selection.to < selection.from) return null;
  return `date_from=${selection.from}&date_to=${selection.to}`;
}

const GRID = "#e8edf3";
const AXIS = { fontSize: 11, fill: "#5b6b82" } as const;
const TOOLTIP = {
  contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 14px rgba(15,23,42,.08)" },
  labelStyle: { fontWeight: 600, color: "#0b1a2d" },
} as const;

export default function ReportInsights() {
  const [selection, setSelection] = useState<Selection>({ range: "30d", from: "", to: "" });
  const query = queryFor(selection);
  // Data is kept with the query it answers, so "loading" is simply "the data is for another query".
  const [loaded, setLoaded] = useState<{ query: string; data: Overview } | { query: string; error: string } | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    apiGet<Overview>(`/api/v1/admin/insights/overview?${query}`)
      .then((data) => !cancelled && setLoaded({ query, data }))
      .catch((err) => !cancelled && setLoaded({ query, error: err instanceof Error ? err.message : "Could not load the report." }));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const current = loaded && loaded.query === query ? loaded : null;
  const data = current && "data" in current ? current.data : null;
  const error = current && "error" in current ? current.error : null;
  const loading = Boolean(query) && !current;

  const trend = useMemo(
    () => (data ? data.trend.map((p) => ({ ...p, label: bucketLabel(p.bucket, data.range.bucket) })) : []),
    [data],
  );
  const money = useMemo(
    () => (data ? data.money.map((p) => ({ ...p, label: bucketLabel(p.bucket, data.range.bucket) })) : []),
    [data],
  );
  const stagesNow = data ? STAGE_ORDER.map((name) => ({ name, value: data.stages_now[name] ?? 0 })) : [];
  const totalNow = stagesNow.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.segment} role="group" aria-label="Report period">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={selection.range === option.key}
              className={selection.range === option.key ? styles.segmentOn : undefined}
              onClick={() => setSelection((s) => ({ ...s, range: option.key }))}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={selection.range === "custom"}
            className={selection.range === "custom" ? styles.segmentOn : undefined}
            onClick={() => setSelection((s) => ({ ...s, range: "custom" }))}
          >
            Custom
          </button>
        </div>
        {selection.range === "custom" ? (
          <div className={styles.dates}>
            <label>
              <span>From</span>
              <input type="date" value={selection.from} max={selection.to || undefined} onChange={(e) => setSelection((s) => ({ ...s, from: e.target.value }))} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={selection.to} min={selection.from || undefined} onChange={(e) => setSelection((s) => ({ ...s, to: e.target.value }))} />
            </label>
          </div>
        ) : null}
        {data ? (
          <p className={styles.rangeNote}>
            {data.range.from} to {data.range.to} · by {data.range.bucket}
          </p>
        ) : null}
      </div>

      {selection.range === "custom" && !query ? <p className={styles.hint}>Pick a start and end date to see the report.</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {loading ? <div className={styles.skeleton} aria-busy="true" aria-label="Loading the report" /> : null}

      {data ? (
        <>
          <section className={styles.kpis} aria-label="Key figures">
            <Kpi icon={Inbox} tone="blue" label="Requests filed" value={String(data.kpis.filed)} note={`${data.kpis.open_queue} waiting to be dispatched`} />
            <Kpi icon={CheckCircle2} tone="green" label="Resolved" value={String(data.kpis.resolved)} note={`${data.kpis.awaiting_confirmation} awaiting the resident`} />
            <Kpi icon={Clock3} tone="amber" label="Average time to resolve" value={hoursLabel(data.kpis.avg_resolution_hours)} note="from filing to the work report" />
            <Kpi icon={Hourglass} tone="blue" label="Finished by the deadline" value={percentLabel(data.kpis.on_time_rate)} note={`${data.kpis.in_progress} jobs in progress now`} />
            <Kpi icon={RotateCcw} tone={data.kpis.reopened_now > 0 ? "red" : "slate"} label="Reopened rate" value={percentLabel(data.kpis.reopen_rate)} note={`${data.kpis.reopened_now} reopened right now`} />
            <Kpi icon={Wallet} tone="green" label="Dues collected" value={pesos(data.kpis.collected)} note={`${percentLabel(data.kpis.collection_rate)} of ${pesos(data.kpis.invoiced)} billed`} />
          </section>

          <section className={styles.card} aria-label="Where every request stands">
            <header className={styles.cardHead}>
              <h2>Where every request stands</h2>
              <span>{totalNow} in total</span>
            </header>
            <div className={styles.stageBar} role="img" aria-label={stagesNow.map((s) => `${s.name} ${s.value}`).join(", ")}>
              {stagesNow.filter((s) => s.value > 0).map((s) => (
                <span key={s.name} style={{ flexGrow: s.value, background: STAGE_COLORS[s.name] }} title={`${s.name}: ${s.value}`} />
              ))}
            </div>
            <ul className={styles.legend}>
              {stagesNow.map((s) => (
                <li key={s.name}>
                  <i style={{ background: STAGE_COLORS[s.name] }} />
                  <span>{s.name}</span>
                  <b>{s.value}</b>
                </li>
              ))}
            </ul>
            {data.stages_now.Reopened > 0 ? (
              <p className={styles.alertLine}>
                <AlertTriangle size={14} /> {data.stages_now.Reopened} request{data.stages_now.Reopened === 1 ? "" : "s"} reopened by residents and waiting for a technician.
              </p>
            ) : null}
          </section>

          <div className={styles.grid}>
            <section className={`${styles.card} ${styles.wide}`}>
              <header className={styles.cardHead}>
                <h2>Requests filed vs resolved</h2>
                <span>{data.kpis.filed} filed · {data.kpis.resolved} resolved</span>
              </header>
              <div className={styles.chart}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gFiled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1f4a9e" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#1f4a9e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                    <Tooltip {...TOOLTIP} />
                    <Area type="monotone" dataKey="filed" name="Filed" stroke="#1f4a9e" strokeWidth={2} fill="url(#gFiled)" />
                    <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" strokeWidth={2} fill="url(#gResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.keys}>
                <span><i style={{ background: "#1f4a9e" }} /> Filed</span>
                <span><i style={{ background: "#059669" }} /> Resolved</span>
              </div>
            </section>

            <section className={styles.card}>
              <header className={styles.cardHead}>
                <h2>Status of requests filed</h2>
                <span>in this period</span>
              </header>
              <div className={styles.donut}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={STAGE_ORDER.map((name) => ({ name, value: data.stages_in_range[name] ?? 0 })).filter((s) => s.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="86%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {STAGE_ORDER.filter((name) => (data.stages_in_range[name] ?? 0) > 0).map((name) => (
                        <Cell key={name} fill={STAGE_COLORS[name]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <b>{data.kpis.filed}</b>
                  <span>filed</span>
                </div>
              </div>
              {data.kpis.filed === 0 ? <p className={styles.empty}>No requests were filed in this period.</p> : null}
            </section>

            <section className={styles.card}>
              <header className={styles.cardHead}>
                <h2>By category</h2>
                <span>{data.by_category.length} categories</span>
              </header>
              <HorizontalBars rows={data.by_category} color="#1f4a9e" />
            </section>

            <section className={styles.card}>
              <header className={styles.cardHead}>
                <h2>By priority</h2>
                <span>as rated</span>
              </header>
              <HorizontalBars rows={data.by_priority} color="#b45309" colorFor={(label) => PRIORITY_COLORS[label]} />
            </section>

            <section className={`${styles.card} ${styles.wide}`}>
              <header className={styles.cardHead}>
                <h2>Dues billed vs collected</h2>
                <span>{pesos(data.kpis.collected)} of {pesos(data.kpis.invoiced)}</span>
              </header>
              <div className={styles.chart}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={money} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip {...TOOLTIP} formatter={(value) => pesos(Number(value))} />
                    <Bar dataKey="invoiced" name="Billed" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.keys}>
                <span><i style={{ background: "#cbd5e1" }} /> Billed</span>
                <span><i style={{ background: "#059669" }} /> Collected</span>
              </div>
            </section>
          </div>

          <section className={styles.card}>
            <header className={styles.cardHead}>
              <h2>Technicians</h2>
              <span>work reported in this period</span>
            </header>
            {data.technicians.length === 0 ? (
              <p className={styles.empty}>No maintenance technicians yet.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Technician</th>
                      <th>Specialization</th>
                      <th>Active now</th>
                      <th>Resolved</th>
                      <th>Average time</th>
                      <th>Sent back</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.technicians.map((t) => (
                      <tr key={t.staff_id}>
                        <td className={styles.strong}>{t.name}</td>
                        <td>{t.specialization || "—"}</td>
                        <td>{t.active_tasks}</td>
                        <td>{t.resolved}</td>
                        <td>{hoursLabel(t.avg_hours)}</td>
                        <td>{t.reopened > 0 ? <span className={styles.pillRed}>{t.reopened}</span> : "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof Inbox;
  tone: "blue" | "green" | "amber" | "red" | "slate";
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className={`${styles.kpi} ${styles[`tone_${tone}`]}`}>
      <span className={styles.kpiIcon}><Icon size={18} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function HorizontalBars({
  rows,
  color,
  colorFor,
}: {
  rows: { label: string; count: number }[];
  color: string;
  colorFor?: (label: string) => string | undefined;
}) {
  if (rows.length === 0) return <p className={styles.empty}>Nothing to show in this period.</p>;
  const height = Math.max(rows.length * 34 + 16, 120);
  return (
    <div style={{ height }} className={styles.barsWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={92} />
          <Tooltip {...TOOLTIP} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="count" name="Requests" radius={[0, 4, 4, 0]} barSize={16} label={{ position: "right", fontSize: 11, fill: "#334155" }}>
            {rows.map((row) => (
              <Cell key={row.label} fill={colorFor?.(row.label) ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
