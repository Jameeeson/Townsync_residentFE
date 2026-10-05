"use client";

import { useEffect, useRef } from "react";
import { apiGet } from "./api";

const ACTIVITY_KEY = "townsync.lastActivity";
const CHECK_EVERY_MS = 15_000;
const POLICY_EVERY_MS = 5 * 60_000;
const EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel", "click"] as const;

function readShared(): number {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Signs the user out after the idle time set in Global Security Settings ("Automatic Logout").
 * Activity in any tab of this portal counts, and the time is re-read every few minutes, so a
 * change in the settings applies without a reload. A timeout of 0 means never.
 */
export function useIdleLogout(onIdle: () => void, enabled = true) {
  const handler = useRef(onIdle);
  useEffect(() => {
    handler.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;
    let minutes = 0;
    let last = Date.now();
    let lastWrite = 0;
    let fired = false;

    const mark = () => {
      const now = Date.now();
      last = now;
      if (now - lastWrite > 1000) {
        lastWrite = now;
        try {
          window.localStorage.setItem(ACTIVITY_KEY, String(now));
        } catch {
          /* private mode: this tab's own clock still works */
        }
      }
    };

    const loadPolicy = () =>
      apiGet<{ idle_timeout_minutes: number }>("/api/auth/session-policy")
        .then((policy) => {
          minutes = Math.max(0, Number(policy.idle_timeout_minutes) || 0);
        })
        .catch(() => undefined);

    const check = () => {
      if (fired || minutes <= 0) return;
      const idleFor = Date.now() - Math.max(last, readShared());
      if (idleFor >= minutes * 60_000) {
        fired = true;
        handler.current();
      }
    };

    mark();
    void loadPolicy();
    EVENTS.forEach((name) => window.addEventListener(name, mark, { passive: true }));
    const checkTimer = window.setInterval(check, CHECK_EVERY_MS);
    const policyTimer = window.setInterval(() => void loadPolicy(), POLICY_EVERY_MS);
    // A laptop that slept past the limit should sign out the moment it wakes.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      EVENTS.forEach((name) => window.removeEventListener(name, mark));
      window.clearInterval(checkTimer);
      window.clearInterval(policyTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
