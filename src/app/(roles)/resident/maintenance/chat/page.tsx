"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Messages open as a pop-up on the ticket page. Old links (notifications, bookmarks) land here and are forwarded. */
function ForwardToTicket() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  useEffect(() => {
    router.replace(id ? `/resident/maintenance/ticket?id=${encodeURIComponent(id)}&chat=1` : "/resident/maintenance");
  }, [id, router]);

  return <p aria-live="polite" style={{ padding: "2rem", color: "var(--color-text-secondary)" }}>Opening your messages…</p>;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <ForwardToTicket />
    </Suspense>
  );
}
