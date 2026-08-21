"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ApiClientError } from "@/lib/apiClient";
import {
  VisitorPass as ApiVisitorPass,
  createVisitorPass,
  listVisitorPasses,
} from "@/lib/api/resident";

type UiPass = {
  id: number;
  name: string;
  purpose: string;
  scheduledAt: string;
  status: string;
  qrToken: string;
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
  };
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
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [passes, setPasses] = useState<UiPass[]>([]);
  const [usage, setUsage] = useState("0 of 5 used");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGeneratedPass, setLastGeneratedPass] = useState<UiPass | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleGenerate() {
    if (!visitorName || !startDate || !startTime) return;
    setError("");
    setSubmitting(true);

    const purpose = vehiclePlate.trim()
      ? `Contractor / Vehicle (${vehiclePlate.trim()})`
      : "Guest visit";

    try {
      const result = await createVisitorPass({
        visitor_name: visitorName.trim(),
        visit_purpose: purpose,
        scheduled_at: formatScheduledAt(startDate, startTime),
      });
      await refresh();
      const created: UiPass = {
        id: 0,
        name: visitorName.trim(),
        purpose,
        scheduledAt: formatScheduledAt(startDate, startTime),
        status: "Pending",
        qrToken: result.qr_token,
      };
      setLastGeneratedPass(created);
      setShowSuccess(true);
      setVisitorName("");
      setVehiclePlate("");
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
            <h2 style={{ marginBottom: "8px" }}>Pass Submitted!</h2>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
              {lastGeneratedPass.name}&apos;s pass was submitted
              {lastGeneratedPass.status ? ` (${lastGeneratedPass.status})` : ""}.
            </p>
            <div className={styles.qrBorder} style={{ margin: "0 auto", width: "fit-content" }}>
              <QRCodeSVG value={lastGeneratedPass.qrToken} size={150} />
            </div>
            <div style={{ marginTop: "12px", fontWeight: 700, color: "#1e3a8a" }}>
              QR: {lastGeneratedPass.qrToken}
            </div>
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

      {error ? <p style={{ color: "#b91c1c", marginBottom: 16 }}>{error}</p> : null}

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
                  selected={startTime}
                  onChange={(d: Date | null) => setStartTime(d)}
                  showTimeSelect
                  showTimeSelectOnly
                  dateFormat="h:mm aa"
                />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              <Send size={16} /> {submitting ? "Submitting…" : "Generate Pass"}
            </button>
          </form>
        </aside>

        <main>
          <div className={styles.activeHeader}>
            <div className={styles.activeTitle}>
              <ShieldCheck size={18} color="#15803d" /> Active Passes
            </div>
            <div className={styles.limitText}>{usage}</div>
          </div>

          <div className={styles.passesGrid}>
            {loading ? (
              <p style={{ color: "#94a3b8" }}>Loading passes…</p>
            ) : passes.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#94a3b8",
                  border: "1px dashed #e2e8f0",
                  borderRadius: "12px",
                }}
              >
                No active passes yet. Create one on the left.
              </div>
            ) : (
              passes.map((pass) => (
                <div key={pass.id} className={styles.passCard}>
                  <div className={styles.cardTop}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span className={styles.visitorName}>{pass.name}</span>
                      {pass.purpose.toLowerCase().includes("vehicle") ? (
                        <Car size={16} color="#94a3b8" />
                      ) : (
                        <User size={16} color="#94a3b8" />
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                      {pass.purpose} · {pass.status}
                    </div>
                    <div style={{ fontSize: "12px", display: "flex", gap: "8px", marginBottom: "4px" }}>
                      <Calendar size={14} /> {pass.scheduledAt}
                    </div>
                    <div style={{ fontSize: "12px", display: "flex", gap: "8px" }}>
                      <Clock size={14} /> QR ready
                    </div>
                  </div>
                  <div className={styles.qrContainer}>
                    <button
                      type="button"
                      onClick={() => router.push(`/resident/visitors/details?id=${pass.id}`)}
                      style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                      aria-label={`Open details for pass ${pass.id}`}
                    >
                      <div className={styles.qrBorder}>
                        <QRCodeSVG value={pass.qrToken || String(pass.id)} size={80} />
                      </div>
                    </button>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", fontSize: "10px", fontWeight: 700 }}>
                    #{pass.id}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
