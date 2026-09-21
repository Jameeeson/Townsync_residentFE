"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "@/styles/resident.module.css";

const WORDMARK = "TownSync";
const SESSION_KEY = "ts-intro-seen";
const LETTER_STAGGER_MS = 45;
const LETTER_DURATION_MS = 550;
const REST_MS = 1600;
const HOLD_MS = WORDMARK.length * LETTER_STAGGER_MS + LETTER_DURATION_MS + REST_MS;
const EXIT_MS = 500;

type Phase = "enter" | "exit" | "done";

export function IntroSequence() {
  const [phase, setPhase] = useState<Phase>("enter");
  const skipRef = useRef(false);
  const checkedRef = useRef(false);

  useLayoutEffect(() => {
    // Guard against React Strict Mode's dev-only double-invoke: without this,
    // the first pass writes SESSION_KEY and the second pass reads it right back,
    // making every mount look like a repeat visit and skipping instantly.
    if (checkedRef.current) return;
    checkedRef.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";

    if (reduceMotion || alreadySeen) {
      skipRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- runs in a layout effect before paint; sessionStorage/matchMedia are client-only so this cannot be derived during render without a hydration mismatch.
      setPhase("done");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "1");
  }, []);

  useEffect(() => {
    if (skipRef.current || phase !== "enter") return;
    const timer = setTimeout(() => setPhase("exit"), HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = setTimeout(() => setPhase("done"), EXIT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (skipRef.current || phase === "done") return;
    const skip = () => setPhase((current) => (current === "enter" ? "exit" : current));
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={`${styles.introOverlay} ${phase === "exit" ? styles.introOverlayExit : ""}`}
      onClick={() => setPhase((current) => (current === "enter" ? "exit" : current))}
      role="presentation"
      aria-hidden="true"
    >
      <div className={styles.introMark}>
        {WORDMARK.split("").map((char, i) => (
          <span
            key={`${char}-${i}`}
            className={styles.introLetter}
            style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}

export default IntroSequence;
