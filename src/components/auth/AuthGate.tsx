"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RESIDENT_ROLE, fetchMe, logout } from "@/lib/api/auth";
import { hasSession } from "@/lib/apiClient";

/**
 * Keeps the resident shell from rendering for signed-out visitors or for accounts
 * with another role. The backend still enforces access on every request; this only
 * avoids showing app chrome (and firing doomed API calls) before that happens.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!hasSession()) {
      router.replace("/login");
      return;
    }

    fetchMe()
      .then(async (me) => {
        if (cancelled) return;
        if (me.role !== RESIDENT_ROLE) {
          await logout();
          router.replace("/login");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading your account"
        style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}
      >
        <span className="ts-skeleton" style={{ width: 160, height: 16 }}>Loading</span>
      </div>
    );
  }

  return <>{children}</>;
}
