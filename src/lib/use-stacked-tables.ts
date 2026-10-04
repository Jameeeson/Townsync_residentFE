"use client";

import { useEffect } from "react";

/**
 * Copies each column's header text onto its body cells as `data-label`, so the
 * phone rules in globals.css can reflow every data table into labelled rows
 * instead of a sideways-scrolling strip. Mount once in the shell; it follows
 * tables as pages, filters and modals render them.
 */
export function useStackedTableLabels() {
  useEffect(() => {
    let frame = 0;

    const label = () => {
      frame = 0;
      document.querySelectorAll("table").forEach((table) => {
        const heads = Array.from(table.querySelectorAll("thead th")).map(
          (th) => th.textContent?.trim() ?? "",
        );
        if (heads.length === 0) return;
        table.querySelectorAll("tbody tr").forEach((row) => {
          let column = 0;
          for (const cell of Array.from(row.children) as HTMLTableCellElement[]) {
            const text = heads[column] ?? "";
            if (cell.dataset.label !== text) cell.dataset.label = text;
            column += cell.colSpan || 1;
          }
        });
      });
    };

    label();
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(label);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
