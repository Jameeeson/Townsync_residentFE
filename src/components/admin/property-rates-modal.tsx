"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, RotateCcw, Search, X } from "lucide-react";
import { apiDelete, apiGet, apiPut } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import styles from "./property-rates-modal.module.css";

type PropertyRate = {
  unit_number: string;
  monthly_due: number | null;
  effective_due: number;
  due_day: number | null;
  effective_due_day: number;
  next_due_date: string;
  last_due_date: string | null;
  last_status: string | null;
  residents: string[];
};

type PropertyRatesResponse = {
  default_monthly_due: number;
  default_due_day: number;
  properties: PropertyRate[];
};

type Draft = { amount?: string; day?: string };

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export function peso(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ordinal(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function parseAmount(raw: string): number | null {
  const value = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(value) && value > 0 && value <= 1_000_000 ? Math.round(value * 100) / 100 : null;
}

function statusClass(status: string | null): string {
  if (status === "Paid") return styles.statusPaid;
  if (status === "Overdue") return styles.statusOverdue;
  return styles.statusOpen;
}

/**
 * Monthly HOA dues and due days per property. Properties without their own
 * values use the defaults. Changes apply to statements generated afterwards;
 * invoices that already exist keep their amount and due date.
 */
export default function PropertyRatesModal({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const { toast, toastError } = useToast();
  const [data, setData] = useState<PropertyRatesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [defaultDay, setDefaultDay] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<PropertyRatesResponse>("/api/v1/admin/finance/property-rates")
      .then((res) => {
        setData(res);
        setDefaultAmount(String(res.default_monthly_due));
        setDefaultDay(String(res.default_due_day));
        setDrafts({});
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load property rates."));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = data?.properties ?? [];
    if (!term) return rows;
    return rows.filter(
      (p) => p.unit_number.toLowerCase().includes(term) || p.residents.some((r) => r.toLowerCase().includes(term)),
    );
  }, [data, search]);

  const defaultsChanged =
    !!data &&
    (parseAmount(defaultAmount) !== data.default_monthly_due || Number(defaultDay) !== data.default_due_day);

  const saveDefaults = async () => {
    if (!data) return;
    const amount = parseAmount(defaultAmount);
    if (amount === null) {
      toast("Enter a default amount greater than zero.", "warning");
      return;
    }
    setBusy("__default__");
    try {
      await apiPut("/api/v1/admin/finance/property-rates/default", {
        monthly_due: amount,
        due_day: Number(defaultDay),
      });
      toast(`Default set to ${peso(amount)}, due every ${ordinal(Number(defaultDay))}.`, "success");
      load();
      onChanged?.();
    } catch (err) {
      toastError(err, "Could not save the defaults.");
    } finally {
      setBusy(null);
    }
  };

  const saveProperty = async (p: PropertyRate) => {
    const draft = drafts[p.unit_number] ?? {};
    const body: { unit_number: string; monthly_due?: number; due_day?: number } = { unit_number: p.unit_number };
    if (draft.amount) {
      const amount = parseAmount(draft.amount);
      if (amount === null) {
        toast("Enter an amount greater than zero.", "warning");
        return;
      }
      body.monthly_due = amount;
    }
    if (draft.day && Number(draft.day) !== p.effective_due_day) body.due_day = Number(draft.day);
    if (body.monthly_due === undefined && body.due_day === undefined) return;
    setBusy(p.unit_number);
    try {
      const res = await apiPut<{ message: string }>("/api/v1/admin/finance/property-rates", body);
      toast(res.message, "success");
      load();
      onChanged?.();
    } catch (err) {
      toastError(err, "Could not save this property.");
    } finally {
      setBusy(null);
    }
  };

  const resetProperty = async (unit: string) => {
    setBusy(unit);
    try {
      await apiDelete(`/api/v1/admin/finance/property-rates?unit_number=${encodeURIComponent(unit)}`);
      toast(`${unit} now uses the default amount and due day.`, "success");
      load();
      onChanged?.();
    } catch (err) {
      toastError(err, "Could not reset this property.");
    } finally {
      setBusy(null);
    }
  };

  const setDraft = (unit: string, patch: Draft) => setDrafts((d) => ({ ...d, [unit]: { ...d[unit], ...patch } }));
  const customCount = data?.properties.filter((p) => p.monthly_due !== null || p.due_day !== null).length ?? 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-rates-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="property-rates-title">
              <Home size={18} aria-hidden="true" /> Property Rates &amp; Due Dates
            </h2>
            <p>
              Set each property&apos;s monthly HOA due and the day of the month it falls due. Properties without their
              own values use the defaults. Changes apply to statements generated from now on.
            </p>
          </div>
          <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <section className={styles.defaultRow}>
          <div className={styles.defaultLabel}>
            <strong>Defaults</strong>
            <span>Used by every property without its own amount or due day</span>
          </div>
          <div className={styles.editRow}>
            <div className={styles.inputGroup}>
              <span className={styles.prefix}>₱</span>
              <input
                inputMode="decimal"
                aria-label="Default monthly due"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
              />
            </div>
            <label className={styles.daySelect}>
              <span>Due every</span>
              <select aria-label="Default due day" value={defaultDay} onChange={(e) => setDefaultDay(e.target.value)}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {ordinal(d)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.saveBtn}
              disabled={busy !== null || !defaultsChanged}
              onClick={saveDefaults}
            >
              {busy === "__default__" ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <input
              placeholder="Search unit or resident…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search properties"
            />
          </div>
          <span className={styles.count}>
            {customCount} customised · {data?.properties.length ?? 0} properties
          </span>
        </div>

        <div className={styles.body}>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : !data ? (
            <p className={styles.muted}>Loading properties…</p>
          ) : visible.length === 0 ? (
            <p className={styles.muted}>No properties match.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Monthly due</th>
                  <th>Due date</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const draft = drafts[p.unit_number] ?? {};
                  const dayValue = draft.day ?? String(p.effective_due_day);
                  const dirty =
                    !!draft.amount || (draft.day !== undefined && Number(draft.day) !== p.effective_due_day);
                  return (
                    <tr key={p.unit_number}>
                      <td>
                        <strong>{p.unit_number}</strong>
                        <span className={styles.sub}>
                          {p.residents.length ? p.residents.join(", ") : "No resident yet"}
                        </span>
                      </td>
                      <td>
                        <span className={p.monthly_due !== null ? styles.customAmount : styles.defaultAmount}>
                          {peso(p.effective_due)}
                        </span>
                        <span className={styles.tag}>{p.monthly_due !== null ? "Custom" : "Default"}</span>
                      </td>
                      <td>
                        <span className={p.due_day !== null ? styles.customAmount : styles.defaultAmount}>
                          Every {ordinal(p.effective_due_day)}
                        </span>
                        {p.due_day !== null ? <span className={styles.tag}>Custom</span> : null}
                        <span className={styles.sub}>Next: {formatDay(p.next_due_date)}</span>
                        {p.last_due_date ? (
                          <span className={styles.sub}>
                            Latest: {formatDay(p.last_due_date)}{" "}
                            <span className={`${styles.status} ${statusClass(p.last_status)}`}>{p.last_status}</span>
                          </span>
                        ) : (
                          <span className={styles.sub}>No statement yet</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.editRow}>
                          <div className={styles.inputGroup}>
                            <span className={styles.prefix}>₱</span>
                            <input
                              inputMode="decimal"
                              placeholder={String(p.effective_due)}
                              value={draft.amount ?? ""}
                              aria-label={`Monthly due for ${p.unit_number}`}
                              onChange={(e) => setDraft(p.unit_number, { amount: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && dirty) void saveProperty(p);
                              }}
                            />
                          </div>
                          <select
                            className={styles.compactSelect}
                            aria-label={`Due day for ${p.unit_number}`}
                            value={dayValue}
                            onChange={(e) => setDraft(p.unit_number, { day: e.target.value })}
                          >
                            {DAYS.map((d) => (
                              <option key={d} value={d}>
                                {ordinal(d)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={styles.saveBtn}
                            disabled={busy !== null || !dirty}
                            onClick={() => saveProperty(p)}
                          >
                            {busy === p.unit_number ? "…" : "Save"}
                          </button>
                          {p.monthly_due !== null || p.due_day !== null ? (
                            <button
                              type="button"
                              className={styles.resetBtn}
                              disabled={busy !== null}
                              title="Use the defaults again"
                              aria-label={`Reset ${p.unit_number} to the defaults`}
                              onClick={() => resetProperty(p.unit_number)}
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
