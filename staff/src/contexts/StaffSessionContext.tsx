"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { isSignedIn, logout as authLogout } from "@/lib/auth";
import { getStaffProfile, type StaffProfile } from "@/lib/services/staff";

export type StaffSession = {
  profile: StaffProfile;
  displayName: string;
  initials: string;
  firstName: string;
};

type StaffSessionContextValue = {
  session: StaffSession | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  logout: () => Promise<void>;
};

const StaffSessionContext = createContext<StaffSessionContextValue | null>(null);

function deriveName(profile: StaffProfile) {
  const displayName = profile.full_name?.trim() || profile.email;
  const firstName = displayName.split(" ")[0] || displayName;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";
  return { displayName, firstName, initials };
}

export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSignedIn()) {
        router.replace("/staff/login");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const profile = await getStaffProfile();
        if (cancelled) return;
        const { displayName, firstName, initials } = deriveName(profile);
        setSession({ profile, displayName, firstName, initials });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/staff/login");
          return;
        }
        setError(e instanceof ApiError ? e.message : "Could not load your staff profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, tick]);

  const value = useMemo<StaffSessionContextValue>(
    () => ({
      session,
      loading,
      error,
      refresh: () => setTick((t) => t + 1),
      logout: async () => {
        await authLogout();
        router.replace("/staff/login");
      },
    }),
    [session, loading, error, router],
  );

  return (
    <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>
  );
}

export function useStaffSession() {
  const ctx = useContext(StaffSessionContext);
  if (!ctx) throw new Error("useStaffSession must be used within StaffSessionProvider");
  return ctx;
}
