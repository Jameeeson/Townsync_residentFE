"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, History, Search, User, X, XCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatServerDateTime, formatServerFull } from "@/lib/datetime";
import AuthImageGallery from "@/components/ui/auth-image-gallery";
import styles from "./maintenance-history-view.module.css";

type HistoryStatus = "All" | "Completed" | "Cancelled";

export type HistoryTicket = {
  id: number;
  subject: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: "Completed" | "Cancelled";
  unit_number: string | null;
  resident_name: string | null;
  resident_deleted?: boolean;
  tech_deleted?: boolean;
  created_at: string | null;
  assigned_at: string | null;
  deadline: string | null;
  tech_name: string | null;
  completed_at: string | null;
  closed_at: string | null;
  work_done: string | null;
  completion_image_url: string | null;
  image_urls: string[];
  resolution_confirmed_at: string | null;
  reopen_count: number;
  admin_notes: string | null;
  turnaround_hours: number | null;
  met_deadline: boolean | null;
};

type HistoryResponse = {
  items: HistoryTicket[];
  total: number;
  page: number;
  page_size: number;
  counts: { completed: number; cancelled: number };
};

const PAGE_SIZE = 15;

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

/** Past maintenance tickets (completed or cancelled) with search, filters and a detail panel. */
export default function MaintenanceHistoryView({ initialSearch = "" }: { initialSearch?: string }) {
  const [status, setStatus] = useState<HistoryStatus>("All");
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<HistoryTicket | null>(null);

  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ status, page: String(page), page_size: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    apiGet<HistoryResponse>(`/api/v1/admin/maintenance/history?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load ticket history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, search, dateFrom, dateTo, page]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const counts = data?.counts ?? { completed: 0, cancelled: 0 };
  const filtersActive = Boolean(search || dateFrom || dateTo || status !== "All");

  const changeFilter = (fn: () => void) => {
    setLoading(true);
    fn();
    setPage(1);
  };

  return (
    <section className={styles.wrap} aria-labelledby="history-title">
      <div className={styles.head}>
        <div>
          <h2 id="history-title">
            <History size={18} aria-hidden="true" /> Ticket History
          </h2>
          <p>Completed and cancelled maintenance tickets, newest first.</p>
        </div>
        <div className={styles.segment} role="radiogroup" aria-label="Ticket status">
          {(
            [
              ["All", `All (${counts.completed + counts.cancelled})`],
              ["Completed", `Completed (${counts.completed})`],
              ["Cancelled", `Cancelled (${counts.cancelled})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              className={status === value ? styles.segmentActive : ""}
              onClick={() => changeFilter(() => setStatus(value))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filters}>
        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <input
            placeholder="Search ticket #, subject, unit, resident, or technician…"
            value={searchInput}
            onChange={(e) => {
              setLoading(true);
              setSearchInput(e.target.value);
            }}
            aria-label="Search ticket history"
          />
        </label>
        <label className={styles.dateField}>
          <span>Reported from</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => changeFilter(() => setDateFrom(e.target.value))}
          />
        </label>
        <label className={styles.dateField}>
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => changeFilter(() => setDateTo(e.target.value))}
          />
        </label>
        {filtersActive ? (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() =>
              changeFilter(() => {
                setStatus("All");
                setSearchInput("");
                setSearch("");
                setDateFrom("");
                setDateTo("");
              })
            }
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.tableWrap} aria-busy={loading}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Unit / Resident</th>
              <th>Technician</th>
              <th>Closed</th>
              <th>Turnaround</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!data && loading ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Loading history…
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {filtersActive ? "No past tickets match these filters." : "No completed or cancelled tickets yet."}
                </td>
              </tr>
            ) : (
              data?.items.map((t) => (
                <tr
                  key={t.id}
                  className={styles.row}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ticket ${t.id}: ${t.subject}`}
                  onClick={() => setSelected(t)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(t);
                    }
                  }}
                >
                  <td>
                    <strong className={styles.subject}>
                      #{t.id} · {t.subject}
                    </strong>
                    <span className={styles.sub}>
                      {t.category ?? "General"}
                      {t.priority ? ` · ${t.priority} priority` : ""}
                    </span>
                  </td>
                  <td>
                    <span className={styles.cellMain}>{t.unit_number ?? "Common area"}</span>
                    <span className={styles.sub}>{t.resident_name ?? "Staff-reported"}{t.resident_deleted ? " (account deleted)" : ""}</span>
                  </td>
                  <td>{t.tech_name ? `${t.tech_name}${t.tech_deleted ? " (account deleted)" : ""}` : <span className={styles.sub}>Not dispatched</span>}</td>
                  <td>{formatServerDateTime(t.closed_at)}</td>
                  <td>
                    {formatHours(t.turnaround_hours)}
                    {t.met_deadline === false ? <span className={styles.late}>Late</span> : null}
                  </td>
                  <td>
                    <span className={t.status === "Completed" ? styles.badgeDone : styles.badgeCancelled}>
                      {t.status === "Completed" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {t.status}
                    </span>
                    {t.status === "Completed" && t.resolution_confirmed_at ? (
                      <span className={styles.sub}>Confirmed by resident</span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > PAGE_SIZE ? (
        <div className={styles.pager}>
          <span>
            Page {page} of {pages} · {data.total} tickets
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setLoading(true);
                setPage((p) => p - 1);
              }}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {selected ? <HistoryDetail ticket={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function HistoryDetail({ ticket: t, onClose }: { ticket: HistoryTicket; onClose: () => void }) {
  const timeline = [
    { label: "Reported", at: t.created_at, by: t.resident_name ?? "Staff" },
    { label: "Dispatched", at: t.assigned_at, by: t.tech_name ? `${t.tech_name}${t.tech_deleted ? " (account deleted)" : ""}` : t.tech_name },
    t.status === "Completed"
      ? { label: "Completed", at: t.completed_at ?? t.closed_at, by: t.tech_name }
      : { label: "Cancelled", at: t.closed_at, by: null },
    ...(t.resolution_confirmed_at ? [{ label: "Confirmed fixed", at: t.resolution_confirmed_at, by: t.resident_name }] : []),
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.dialogHead}>
          <div>
            <span className={t.status === "Completed" ? styles.badgeDone : styles.badgeCancelled}>
              {t.status === "Completed" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {t.status}
            </span>
            <h3 id="history-detail-title">
              #{t.id} · {t.subject}
            </h3>
            <p>
              {t.category ?? "General"}
              {t.priority ? ` · ${t.priority} priority` : ""} · {t.unit_number ?? "Common area"}
              {t.resident_name ? ` · ${t.resident_name}${t.resident_deleted ? " (account deleted)" : ""}` : ""}
            </p>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className={styles.dialogBody}>
          <div className={styles.facts}>
            <div>
              <span>Technician</span>
              <strong>
                <User size={14} aria-hidden="true" /> {t.tech_name ? `${t.tech_name}${t.tech_deleted ? " (account deleted)" : ""}` : "Not dispatched"}
              </strong>
            </div>
            <div>
              <span>Turnaround</span>
              <strong>
                <Clock size={14} aria-hidden="true" /> {formatHours(t.turnaround_hours)}
              </strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>
                {formatServerDateTime(t.deadline)}
                {t.met_deadline === true ? <em className={styles.onTime}>On time</em> : null}
                {t.met_deadline === false ? <em className={styles.late}>Late</em> : null}
              </strong>
            </div>
            <div>
              <span>Reopened</span>
              <strong>{t.reopen_count ? `${t.reopen_count} time(s)` : "Never"}</strong>
            </div>
          </div>

          <ol className={styles.timeline}>
            {timeline.map((step) => (
              <li key={step.label} className={step.at ? styles.stepDone : ""}>
                <strong>{step.label}</strong>
                <span>
                  {step.at ? formatServerFull(step.at) : "—"}
                  {step.at && step.by ? ` · ${step.by}` : ""}
                </span>
              </li>
            ))}
          </ol>

          {t.description ? (
            <section className={styles.block}>
              <h4>Resident&apos;s report</h4>
              <p>{t.description}</p>
            </section>
          ) : null}

          {t.work_done ? (
            <section className={styles.block}>
              <h4>Technician&apos;s work report</h4>
              <p>{t.work_done}</p>
            </section>
          ) : null}

          {t.admin_notes ? (
            <section className={styles.block}>
              <h4>Internal notes</h4>
              <p>{t.admin_notes}</p>
            </section>
          ) : null}

          <AuthImageGallery paths={t.image_urls} label="Photos from resident" emptyText="No resident photos" />
          {t.completion_image_url ? (
            <AuthImageGallery paths={[t.completion_image_url]} label="Completion photo" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
