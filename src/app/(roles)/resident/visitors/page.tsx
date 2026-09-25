"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/qrpass.module.css";
import {
  PlusCircle,
  ShieldCheck,
  Calendar,
  Clock,
  Car,
  User,
  Send,
  Check,
  Ticket,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ApiClientError } from "@/lib/apiClient";
import GuestListEditor, { cleanGuestNames } from "@/components/visitors/GuestListEditor";
import {
  VisitorPass as ApiVisitorPass,
  createVisitorPass,
  getGateHours,
  listVisitorPasses,
  type GateHours,
} from "@/lib/api/resident";

type UiPass = {
  id: number;
  name: string;
  purpose: string;
  scheduledAt: string;
  status: string;
  qrToken: string;
  companions: string[];
};

function normalizePasses(data: unknown): { passes: UiPass[]; usage: string } {
  if (Array.isArray(data)) {
    const passes = data.map(mapPass);
    return { passes, usage: `${passes.length} of 5 used` };
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const list = Array.isArray(obj.passes)
      ? obj.passes
      : Array.isArray(obj.items)
        ? obj.items
        : Array.isArray(obj.data)
          ? obj.data
          : [];
    const passes = (list as ApiVisitorPass[]).map(mapPass);
    const usage =
      typeof obj.usage_summary === "string"
        ? obj.usage_summary
        : `${passes.length} of 5 used`;
    return { passes, usage };
  }
  return { passes: [], usage: "0 of 5 used" };
}

function mapPass(p: ApiVisitorPass): UiPass {
  return {
    id: p.id,
    name: p.visitor_name,
    purpose: p.visit_purpose,
    scheduledAt: p.scheduled_at,
    status: p.status,
    qrToken: p.qr_token,
    companions: Array.isArray(p.companions) ? p.companions : [],
  };
}

/** Pulls a chosen arrival back inside the gate window when it falls outside. */
function clampToWindow(
  chosen: Date | null,
  opens: Date | null,
  closes: Date | null
): Date | null {
  if (!chosen || !opens || !closes) return chosen;
  const mins = chosen.getHours() * 60 + chosen.getMinutes();
  const openMins = opens.getHours() * 60 + opens.getMinutes();
  const closeMins = closes.getHours() * 60 + closes.getMinutes();
  if (mins < openMins) return new Date(opens);
  if (mins > closeMins) return new Date(closes);
  return chosen;
}

/** "HH:MM" from the gate policy -> a Date today at that time, for the picker. */
function timeStringToDate(value: string | null): Date | null {
  if (!value) return null;
  const [hh, mm] = value.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function prettyTime(value: string | null): string {
  const d = timeStringToDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatScheduledAt(date: Date, time: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function PassesPage() {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [passes, setPasses] = useState<UiPass[]>([]);
  const [usage, setUsage] = useState("0 of 5 used");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGeneratedPass, setLastGeneratedPass] = useState<UiPass | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gateHours, setGateHours] = useState<GateHours | null>(null);

  async function refresh() {
    const data = await listVisitorPasses();
    const normalized = normalizePasses(data);
    setPasses(normalized.passes);
    setUsage(normalized.usage);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The gate refuses arrivals outside these hours, so the picker is
        // constrained to them rather than letting the request fail on submit.
        const hours = await getGateHours();
        if (!cancelled) setGateHours(hours);
      } catch {
        // Non-fatal: the server still enforces the window on submit.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load passes."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const gateOpens = gateHours?.enforced ? timeStringToDate(gateHours.opens) : null;
  const gateCloses = gateHours?.enforced ? timeStringToDate(gateHours.closes) : null;

  // Derived, not stored: if the chosen arrival sits outside the window we show
  // and submit the opening time instead, so the form is never in a state the
  // server would reject. Computing it during render avoids an effect that would
  // set state on every policy load.
  const arrivalTime = clampToWindow(startTime, gateOpens, gateCloses);

  async function handleGenerate() {
    if (!visitorName || !startDate || !arrivalTime) return;
    setError("");
    setSubmitting(true);

    const purpose = vehiclePlate.trim()
      ? `Contractor / Vehicle (${vehiclePlate.trim()})`
      : "Guest visit";

    const companions = cleanGuestNames(guests);

    try {
      const result = await createVisitorPass({
        visitor_name: visitorName.trim(),
        visit_purpose: purpose,
        scheduled_at: formatScheduledAt(startDate, arrivalTime),
        companions,
      });
      await refresh();
      const created: UiPass = {
        id: 0,
        name: visitorName.trim(),
        purpose,
        scheduledAt: formatScheduledAt(startDate, arrivalTime),
        status: "Pending",
        qrToken: result.qr_token,
        companions: result.companions ?? companions,
      };
      setLastGeneratedPass(created);
      setShowSuccess(true);
      setVisitorName("");
      setVehiclePlate("");
      setGuests([]);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create pass."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      {showSuccess && lastGeneratedPass ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.successIcon}>
              <Check size={28} />
            </div>
            <h2>Pass Submitted!</h2>
            <p className={styles.modalDesc}>
              {lastGeneratedPass.name}&apos;s pass was submitted
              {lastGeneratedPass.status ? ` (${lastGeneratedPass.status})` : ""}.
            </p>
            {lastGeneratedPass.companions.length > 0 ? (
              <p className={styles.modalDesc}>
                Also covers {lastGeneratedPass.companions.length} guest
                {lastGeneratedPass.companions.length === 1 ? "" : "s"}:{" "}
                {lastGeneratedPass.companions.join(", ")}.
              </p>
            ) : null}
            <div className={styles.qrBorder} style={{ margin: "0 auto", width: "fit-content" }}>
              <QRCodeSVG value={lastGeneratedPass.qrToken} size={150} />
            </div>
            <div className={styles.modalQrToken}>QR: {lastGeneratedPass.qrToken}</div>
            <button className={styles.closeBtn} onClick={() => setShowSuccess(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Visitor Passes</h1>
        <p className={styles.pageDesc}>Manage access for your guests and view active passes.</p>
      </header>

      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      <div className={styles.layout}>
        <aside className={styles.formCard}>
          <div className={styles.formHeader}>
            <PlusCircle size={20} /> Request New Pass
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleGenerate();
            }}
          >
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Visitor Name</label>
              <input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className={styles.input}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vehicle Plate (optional)</label>
              <input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className={styles.input}
                placeholder="ABC-123"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Additional Guests (optional)</label>
              <GuestListEditor value={guests} onChange={setGuests} disabled={submitting} />
            </div>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={(d: Date | null) => setStartDate(d)}
                  dateFormat="MM/dd/yyyy"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Arrival</label>
                <DatePicker
                  selected={arrivalTime}
                  onChange={(d: Date | null) => setStartTime(d)}
                  showTimeSelect
                  showTimeSelectOnly
                  dateFormat="h:mm aa"
                  minTime={gateOpens ?? undefined}
                  maxTime={gateCloses ?? undefined}
                />
              </div>
            </div>
            {gateHours?.enforced ? (
              <p className={styles.helperText}>
                Gate hours: {prettyTime(gateHours.opens)} – {prettyTime(gateHours.closes)}.
                Visitors cannot be admitted outside this window.
              </p>
            ) : null}
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              <Send size={16} /> {submitting ? "Submitting…" : "Generate Pass"}
            </button>
          </form>
        </aside>

        <main>
          <div className={styles.activeHeader}>
            <div className={styles.activeTitle}>
              <ShieldCheck size={18} /> Active Passes
            </div>
            <div className={styles.limitText}>{usage}</div>
          </div>

          <div className={`${styles.passesGrid} ${passes.length > 0 ? "ts-stagger" : ""}`}>
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className={styles.passCardSkeleton} aria-hidden="true">
                  <div className="ts-skeleton" style={{ height: 18, width: "55%", marginBottom: 8 }}>Loading</div>
                  <div className="ts-skeleton" style={{ height: 12, width: "35%", marginBottom: 18 }}>Loading</div>
                  <div className="ts-skeleton" style={{ height: 12, width: "70%", marginBottom: 8 }}>Loading</div>
                  <div className="ts-skeleton" style={{ height: 12, width: "50%", marginBottom: 20 }}>Loading</div>
                  <div className="ts-skeleton" style={{ height: 120 }}>Loading</div>
                </div>
              ))
            ) : passes.length === 0 ? (
              <div className={styles.emptyState}>
                <Ticket size={28} className={styles.emptyIcon} aria-hidden="true" />
                <p>No active passes yet. Create one on the left.</p>
              </div>
            ) : (
              passes.map((pass, i) => (
                <div
                  key={pass.id}
                  className={styles.passCard}
                  style={{ "--ts-stagger-i": i } as CSSProperties}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitleRow}>
                      <span className={styles.visitorName}>{pass.name}</span>
                      {pass.purpose.toLowerCase().includes("vehicle") ? (
                        <Car size={16} />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <div className={styles.visitorMeta}>
                      {pass.purpose} · {pass.status}
                    </div>
                    <div className={styles.cardDetail}>
                      <Calendar size={14} /> {pass.scheduledAt}
                    </div>
                    <div className={styles.cardDetail}>
                      <Clock size={14} /> QR ready
                    </div>
                    {pass.companions.length > 0 ? (
                      <div className={styles.cardDetail} title={pass.companions.join(", ")}>
                        <Users size={14} /> +{pass.companions.length} guest
                        {pass.companions.length === 1 ? "" : "s"}: {pass.companions.join(", ")}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.qrContainer}>
                    <button
                      type="button"
                      onClick={() => router.push(`/resident/visitors/details?id=${pass.id}`)}
                      className={styles.qrButton}
                      aria-label={`Open details for pass ${pass.id}`}
                    >
                      <div className={styles.qrBorder}>
                        <QRCodeSVG value={pass.qrToken || String(pass.id)} size={80} />
                      </div>
                    </button>
                  </div>
                  <div className={styles.cardFooter}>#{pass.id}</div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
