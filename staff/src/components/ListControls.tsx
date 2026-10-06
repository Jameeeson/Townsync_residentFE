"use client";

import { useState } from "react";
import styles from "./ListControls.module.css";

export type ListOption = { value: string; label: string };

export type ListFilter = {
  id: string;
  label: string;
  value: string;
  options: ListOption[];
  onChange: (value: string) => void;
};

/** One toolbar for list pages: search plus a "Sort & filter" button. "Reset" restores the defaults. */
export function ListControls({
  sort,
  filters = [],
  search,
  summary,
  onReset,
}: {
  sort: { value: string; options: ListOption[]; onChange: (value: string) => void };
  filters?: ListFilter[];
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  summary?: string;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeFilters = filters.filter((f) => f.value !== f.options[0]?.value).length;
  const sortChanged = sort.value !== sort.options[0]?.value;
  const chosen = activeFilters + (sortChanged ? 1 : 0);
  const active = chosen + (search?.value.trim() ? 1 : 0);

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        {search ? (
          <input
            type="search"
            className={styles.search}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search"}
            aria-label={search.placeholder ?? "Search"}
          />
        ) : null}
        <button
          type="button"
          className={`${styles.toggle} ${open ? styles.toggleOpen : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Sort &amp; filter {chosen > 0 ? <span className={styles.count}>{chosen}</span> : null}
        </button>
        {active > 0 ? (
          <button type="button" className={styles.reset} onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>

      {open ? (
        <div className={styles.panel}>
          <label className={styles.field}>
            <span>Sort by</span>
            <select value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
              {sort.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {filters.map((f) => (
            <label key={f.id} className={styles.field}>
              <span>{f.label}</span>
              <select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {summary ? <p className={styles.summary}>{summary}</p> : null}
    </div>
  );
}
