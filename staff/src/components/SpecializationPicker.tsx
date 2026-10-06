"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import styles from "../app/staff/login/login.module.css";

const ADD_NEW = "__add_new__";

/**
 * Choose a specialization that already exists, or "Add a new specialization…" and type it. The chosen text is also
 * submitted in a hidden input named `specialization`, so a plain form can read it.
 */
export function SpecializationPicker() {
  const [options, setOptions] = useState<string[]>([]);
  const [choice, setChoice] = useState("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ specializations: string[] }>("/api/auth/specializations", { auth: false })
      .then((data) => {
        if (!cancelled) setOptions(data.specializations);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const adding = choice === ADD_NEW;
  const value = adding ? custom.trim() : choice;

  return (
    <>
      <select
        className={styles.roleSelect}
        value={choice}
        required
        aria-label="Specialization"
        onChange={(e) => setChoice(e.target.value)}
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
      {adding ? (
        <input
          className={styles.roleSelect}
          type="text"
          value={custom}
          maxLength={80}
          required
          placeholder="Type your specialization, e.g. Pest control"
          aria-label="New specialization"
          autoFocus
          onChange={(e) => setCustom(e.target.value)}
        />
      ) : null}
      <input type="hidden" name="specialization" value={value} />
    </>
  );
}
