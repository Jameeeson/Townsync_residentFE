"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  FileDown,
  History,
  Download,
  Landmark,
  Zap,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { apiDownload, apiGet, apiPost, ApiError } from "@/lib/api";
import ReportInsights from "./report-insights";
import ReportTimeline from "./report-timeline";
import { useToast } from "@/components/ui/toast";
import styles from "@/components/styles/ConfigureReport.module.css";

const CATEGORIES = [
  {
    id: "financials",
    title: "Financials",
    description: "Billed vs. collected dues, outstanding balances, and payment history.",
    icon: Landmark,
    color: "#1f4a9e",
  },
  {
    id: "visitor_traffic",
    title: "Visitor Traffic",
    description: "Entry/exit logs, peak visitation times, and security trends.",
    icon: Activity,
    color: "#059669",
  },
  {
    id: "maintenance_efficiency",
    title: "Maintenance Efficiency",
    description: "Time to dispatch, repair turnaround, and technician workload.",
    icon: Zap,
    color: "#b45309",
  },
];

type ReportHistoryEntry = {
  id: number;
  category: string;
  generated_at: string;
  format: string;
  status: string;
  date_range?: string | null;
};

type ReportTab = "overview" | "timeline" | "export";

const TABS: { key: ReportTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Activity timeline" },
  { key: "export", label: "Export reports" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.title]));

type ConfigureReportViewProps = {
  onBack: () => void;
};

export default function ConfigureReportView({ onBack }: ConfigureReportViewProps) {
  const { toast, toastError } = useToast();
  const [tab, setTab] = useState<ReportTab>("overview");
  const [selectedCategory, setSelectedCategory] = useState("financials");
  const [format, setFormat] = useState<"PDF" | "Excel">("PDF");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateFeedback, setGenerateFeedback] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState(false);

  const [history, setHistory] = useState<ReportHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadHistory = () => {
    apiGet<ReportHistoryEntry[]>("/api/v1/admin/dashboard/reports/history")
      .then(setHistory)
      .catch((err) => setHistoryError(err instanceof Error ? err.message : "Failed to load report history"));
  };

  useEffect(loadHistory, []);

  // Reports are generated in the background: keep refreshing while any are still pending
  // (capped, so a job lost to a server restart cannot poll forever).
  const pollAttempts = useRef(0);
  useEffect(() => {
    if (!history.some((r) => r.status === "Pending")) {
      pollAttempts.current = 0;
      return;
    }
    if (pollAttempts.current >= 60) return;
    const timer = setTimeout(() => {
      pollAttempts.current += 1;
      loadHistory();
    }, 2000);
    return () => clearTimeout(timer);
  }, [history]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setGenerateFeedback("Select a start and end date before generating a report.");
      setGenerateError(true);
      return;
    }
    if (endDate < startDate) {
      setGenerateFeedback("The end date must be on or after the start date.");
      setGenerateError(true);
      return;
    }
    setGenerating(true);
    setGenerateFeedback(null);
    setGenerateError(false);
    try {
      await apiPost("/api/v1/admin/dashboard/reports/generate", {
        category: selectedCategory,
        date_start: startDate,
        date_end: endDate,
        export_format: format,
      });
      setGenerateFeedback("Report generation started. It will appear in Recent Reports shortly.");
      toast(`${CATEGORY_LABELS[selectedCategory] ?? selectedCategory} report generation started.`, "success");
      setGenerateError(false);
      loadHistory();
    } catch (err) {
      toastError(err, "Could not start report generation.");
      setGenerateFeedback(err instanceof ApiError ? err.message : "Failed to generate report.");
      setGenerateError(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: ReportHistoryEntry) => {
    setDownloadingId(report.id);
    try {
      const blob = await apiDownload(`/api/v1/admin/dashboard/download/${report.id}`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TownSync_${report.category}_Report.${report.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast(`${CATEGORY_LABELS[report.category] ?? report.category} report downloaded.`, "success");
    } catch (err) {
      toastError(err, "Could not download the report file.");
      setHistoryError(err instanceof Error ? err.message : "Failed to download report file");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} aria-label="Go back" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <div className={styles.titleArea}>
          <h1>Reports</h1>
          <p>See how requests, technicians and dues are moving, follow what happened, or export a report.</p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Report sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`report-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`report-panel-${t.key}`}
            className={tab === t.key ? styles.tabOn : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div role="tabpanel" id="report-panel-overview" aria-labelledby="report-tab-overview">
          <ReportInsights />
        </div>
      ) : null}
      {tab === "timeline" ? (
        <div role="tabpanel" id="report-panel-timeline" aria-labelledby="report-tab-timeline">
          <ReportTimeline />
        </div>
      ) : null}

      {tab === "export" ? (
      <div role="tabpanel" id="report-panel-export" aria-labelledby="report-tab-export">
      <div className={styles.configGrid}>
        <section className={styles.configCard}>
          <div className={styles.sectionTitle}>
            <BarChart3 size={18} />
            <h2>Report Category</h2>
          </div>
          <div className={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryCard} ${
                    selectedCategory === cat.id ? styles.activeCategory : ""
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className={styles.cardTop}>
                    <Icon size={20} style={{ color: cat.color }} />
                    <h3>{cat.title}</h3>
                  </div>
                  <p>{cat.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className={styles.sideOptions}>
          <section className={styles.configCard}>
            <div className={styles.sectionTitle}>
              <Calendar size={18} />
              <h2>Date Range</h2>
            </div>
            <div className={styles.dateInputs}>
              <div className={styles.inputGroup}>
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className={styles.configCard}>
            <div className={styles.sectionTitle}>
              <FileDown size={18} />
              <h2>Export Format</h2>
            </div>
            <div className={styles.formatToggle}>
              <button
                type="button"
                className={format === "PDF" ? styles.activeToggle : undefined}
                onClick={() => setFormat("PDF")}
              >
                PDF
              </button>
              <button
                type="button"
                className={format === "Excel" ? styles.activeToggle : undefined}
                onClick={() => setFormat("Excel")}
              >
                Excel
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.actionArea}>
        {generateFeedback ? (
          <p
            role={generateError ? "alert" : undefined}
            style={{
              margin: 0,
              marginRight: "1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: generateError ? "#b91c1c" : "#047857",
            }}
          >
            {generateFeedback}
          </p>
        ) : null}
        <button type="button" className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? "Compiling..." : "Compile and Generate"}
        </button>
      </div>

      <section className={styles.historySection}>
        <div className={styles.historyHeader}>
          <div className={styles.sectionTitle}>
            <History size={18} />
            <h2>Recent Reports</h2>
          </div>
          <span style={{ fontSize: "0.78rem", color: "#5b6b82" }}>
            Only the 5 most recent reports are kept; older ones are deleted automatically.
          </span>
        </div>

        {historyError ? <p style={{ color: "#b91c1c", fontSize: "0.85rem" }}>{historyError}</p> : null}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Generated On</th>
                <th>Format</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.fileName}>
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                history.map((report) => (
                  <tr key={report.id}>
                    <td className={styles.fileName}>
                      {CATEGORY_LABELS[report.category] ?? report.category}
                      {report.date_range ? (
                        <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "#5b6b82" }}>{report.date_range}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className={styles.dateTime}>
                        <span>{report.generated_at}</span>
                      </div>
                    </td>
                    <td>{report.format}</td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={
                          report.status === "Failed"
                            ? { background: "#fef2f2", color: "#b91c1c" }
                            : report.status === "Pending"
                            ? { background: "#fffbeb", color: "#b45309" }
                            : undefined
                        }
                      >
                        {report.status === "Completed" ? <CheckCircle2 size={12} /> : null}
                        {report.status === "Pending" ? "Generating…" : report.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.downloadBtn}
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id || report.status !== "Completed"}
                      >
                        <Download size={16} />
                        {downloadingId === report.id ? "Downloading..." : `${report.format} File`}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>
      ) : null}
    </div>
  );
}
