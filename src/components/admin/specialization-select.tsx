"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import styles from "./specialization-select.module.css";

const ADD_NEW = "__add_new__";

/**
 * Pick one of the specializations that already exist, or choose "Add a new specialization…" and type it.
 * A new one is saved with the technician and then appears in this list for everyone.
 */
export default function SpecializationSelect({
  value,
  onChange,
  disabled,
  id = "specialization",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ specializations: string[] }>("/api/v1/admin/staff/specializations")
      .then((data) => {
        if (!cancelled) setOptions(data.specializations);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // A value that is not in the list yet (typed earlier, or from an older record) still shows as selected.
  const known = options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const showCustom = adding || (value.trim() !== "" && !known && options.length > 0);

  return (
    <div className={styles.wrap}>
      <select
        id={id}
        className={styles.select}
        value={showCustom ? ADD_NEW : options.find((o) => o.toLowerCase() === value.trim().toLowerCase()) ?? ""}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === ADD_NEW) {
            setAdding(true);
            onChange("");
          } else {
            setAdding(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="" disabled>
          Choose a specialization
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={ADD_NEW}>+ Add a new specialization…</option>
      </select>
      {showCustom ? (
        <input
          type="text"
          className={styles.input}
          value={value}
          maxLength={80}
          placeholder="Type the new specialization, e.g. Pest control"
          aria-label="New specialization"
          autoFocus={adding}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}
