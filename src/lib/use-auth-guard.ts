"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated } from "./auth";

export function useAuthGuard() {
  const router = useRouter();
  // Starts false on both server and the first client render so hydration matches;
  // the real check only happens after mount, once `window`/localStorage exist.
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe auth check must run post-mount
      setAuthenticated(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  return authenticated;
}
