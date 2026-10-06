"use client";

import { useState } from "react";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import styles from "./list-controls.module.css";

export type ListOption = { value: string; label: string };

export type ListFilter = {
  id: string;
  label: string;
  value: string;
  options: ListOption[];
  onChange: (value: string) => void;
};

/**
 * One toolbar for every list: a search box and a "Sort & filter" button that opens the sort order and filters.
 * The button shows how many filters are active, and "Reset" restores the defaults.
 */
export default function ListControls({
  sort,
  filters = [],
  search,
  summary,
  onReset,
}: {
  sort: { value: string; options: ListOption[]; onChange: (value: string) => void };
  filters?: ListFilter[];
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  /** e.g. "Showing 3 of 8 passes". */
  summary?: string;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeFilters = filters.filter((f) => f.value !== f.options[0]?.value).length;
  const sortChanged = sort.value !== sort.options[0]?.value;
  const active = activeFilters + (sortChanged ? 1 : 0) + (search?.value.trim() ? 1 : 0);

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        {search ? (
          <label className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search"}
              aria-label={search.placeholder ?? "Search"}
            />
          </label>
        ) : null}
        <button
          type="button"
          className={`${styles.toggle} ${open ? styles.toggleOpen : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Sort &amp; filter
          {activeFilters + (sortChanged ? 1 : 0) > 0 ? (
            <span className={styles.count}>{activeFilters + (sortChanged ? 1 : 0)}</span>
          ) : null}
        </button>
        {active > 0 ? (
          <button type="button" className={styles.reset} onClick={onReset}>
            <X size={13} aria-hidden="true" /> Reset
          </button>
        ) : null}
      </div>

      {open ? (
        <div className={styles.panel}>
          <label className={styles.field}>
            <span>
              <ArrowUpDown size={13} aria-hidden="true" /> Sort by
            </span>
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
