import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckSquare,
  ChevronRight,
  FileText,
  Hand,
  Home,
  LogIn,
  MoreVertical,
  Shield,
  UserCheck,
  UserPlus,
  Wallet,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { useToast } from "../ui/toast";
import DetailModal, { type DetailRow } from "../ui/detail-modal";
import { useRouter } from "next/navigation";
import styles from "./dashboard-overview.module.css";
import { parseServerDate } from "@/lib/datetime";

type DashboardMetrics = {
  pending_visitor_requests: number;
  open_maintenance_tickets: number;
  high_priority_tickets: number;
  billing_collection_percentage: number;
  active_visitors_inside: number;
};

type MetricKey =
  | "pending-visitors"
  | "open-maintenance"
  | "high-priority"
  | "billing"
  | "visitors-inside";

type MetricDetail = {
  metric: string;
  title: string;
  subtitle: string | null;
  count: number;
  rows: DetailRow[];
};

type VisitorRequest = {
  request_id: string;
  visitor_name: string;
  visit_purpose: string;
  scheduled_at: string;
  status: string;
  resident_name: string;
  unit_number: string;
  qr_token?: string;
};

type ActivityLogEntry = {
  id: string;
  log_type: string;
  message: string;
  severity: string;
  timestamp: string;
};

const activityIconByType: Record<string, typeof Bot> = {
  ai: Bot,
  login: LogIn,
  approval: CheckSquare,
  alert: AlertTriangle,
};

function toneForSeverity(severity: string): "info" | "purple" | "danger" {
  const value = severity.toLowerCase();
  if (value === "high" || value === "critical" || value === "danger") return "danger";
  if (value === "success") return "purple";
  return "info";
}

function iconForLogType(logType: string) {
  const value = logType.toLowerCase();
  for (const key of Object.keys(activityIconByType)) {
    if (value.includes(key)) return activityIconByType[key];
  }
  return Bot;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatTime(iso: string): string {
  const date = parseServerDate(iso);
  if (!date) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type DashboardOverviewProps = {
  onAddResident?: () => void;
  onGenerateReport?: () => void;
};

export default function DashboardOverview({
  onAddResident,
  onGenerateReport,
}: DashboardOverviewProps) {
  const router = useRouter();
  const { toast, toastError } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [detail, setDetail] = useState<MetricDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [openMetric, setOpenMetric] = useState<MetricKey | null>(null);
  const [pendingVisitors, setPendingVisitors] = useState<VisitorRequest[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    apiGet<DashboardMetrics>("/api/v1/admin/dashboard/metrics")
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load metrics"));
    apiGet<VisitorRequest[]>("/api/v1/admin/visitor-management/requests?status_filter=Pending")
      .then(setPendingVisitors)
      .catch(() => setPendingVisitors([]));
    apiGet<ActivityLogEntry[]>("/api/v1/admin/dashboard/system-activity")
      .then(setActivity)
      .catch(() => setActivity([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVisitorAction = async (requestId: string, action: "Approved" | "Rejected") => {
    try {
      await apiPost(`/api/v1/admin/visitor-management/requests/${requestId}/action`, { action });
      toast(
        `Visitor request #${requestId} ${action === "Approved" ? "approved" : "rejected"}.`,
        action === "Approved" ? "success" : "info",
      );
      loadData();
    } catch (err) {
      toastError(err, "Could not update this visitor request.");
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  // Each tile opens the rows the backend counted for it, so the list can never
  // disagree with the number on the card.
  const openDetail = async (metric: MetricKey) => {
    setOpenMetric(metric);
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(
        await apiGet<MetricDetail>(`/api/v1/admin/dashboard/metrics/${metric}/details`),
      );
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "Could not load the details for this card.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // Each drill-down row opens the record on the page that owns it.
  const rowDestination = (metric: MetricKey, row: DetailRow): string => {
    switch (metric) {
      case "pending-visitors":
        return `/admin/visitor-management?tab=approvals&request=${row.id}`;
      case "open-maintenance":
      case "high-priority":
        return `/admin/maintenance?ticket=${row.id}`;
      case "billing":
        return `/admin/finance?invoice=${row.id}`;
      case "visitors-inside":
        return "/admin/visitor-management?tab=monitoring";
    }
  };

  const summaryCards = [
    {
      label: "Pending Visitor Requests",
      value: metrics ? String(metrics.pending_visitor_requests) : "—",
      icon: Hand,
      iconTone: "danger" as const,
      metric: "pending-visitors" as MetricKey,
    },
    {
      label: "Maintenance Summary",
      value: metrics ? `${metrics.open_maintenance_tickets} Open` : "—",
      detail: metrics ? `${metrics.high_priority_tickets} High or Emergency` : undefined,
      detailTone: "danger" as const,
      icon: Wrench,
      iconTone: "info" as const,
      metric: "open-maintenance" as MetricKey,
    },
    {
      label: "Billing Collection",
      value: metrics ? `${metrics.billing_collection_percentage}%` : "—",
      icon: Wallet,
      iconTone: "success" as const,
      metric: "billing" as MetricKey,
    },
    {
      label: "Resident Security",
      value: metrics ? `${metrics.active_visitors_inside} Active` : "—",
      detail: "Visitors Inside",
      detailTone: "muted" as const,
      icon: Shield,
      iconTone: "info" as const,
      metric: "visitors-inside" as MetricKey,
    },
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Home size={14} aria-hidden="true" />
          <span>/</span>
          <span>TownSync</span>
          <span>/</span>
          <span className={styles.breadcrumbCurrent}>Dashboard</span>
        </nav>

        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Operations Overview</h1>
          <div className={styles.dateBadge}>
            <Calendar size={16} aria-hidden="true" />
            <span>
              {new Date().toLocaleString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {error ? <p className={styles.summaryDetail}>{error}</p> : null}

        <div className={styles.actionRow}>
          <Link href="/admin/visitor-management" className={styles.primaryAction}>
            <UserCheck size={18} aria-hidden="true" />
            Approve Visitors
          </Link>
          <button type="button" className={styles.secondaryAction} onClick={onGenerateReport}>
            <FileText size={18} aria-hidden="true" />
            Generate Report
          </button>
          <button type="button" className={styles.secondaryAction} onClick={onAddResident}>
            <UserPlus size={18} aria-hidden="true" />
            Add Resident
          </button>
        </div>
      </div>

      <section className={styles.summaryGrid} aria-label="Summary metrics">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.label}
              type="button"
              className={styles.summaryCard}
              onClick={() => openDetail(card.metric)}
              aria-haspopup="dialog"
            >
              <div className={styles.summaryTop}>
                <span className={styles.summaryLabel}>{card.label}</span>
                <div className={`${styles.summaryIcon} ${styles[`icon${card.iconTone}`]}`}>
                  <Icon size={18} aria-hidden="true" />
                </div>
              </div>
              <div className={styles.summaryValueRow}>
                <strong className={styles.summaryValue}>{card.value}</strong>
              </div>
              {card.detail ? (
                <p className={`${styles.summaryDetail} ${styles[`detail${card.detailTone}`]}`}>
                  {card.detailTone === "danger" ? "• " : ""}
                  {card.detail}
                </p>
              ) : null}
              <span className={styles.summaryHint}>View breakdown →</span>
            </button>
          );
        })}
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.tableCard}>
          <header className={styles.tableHeader}>
            <div className={styles.tableTitleWrap}>
              <h2 className={styles.sectionTitle}>Pending Visitor Approvals</h2>
              <span className={styles.actionBadge}>Action Required</span>
            </div>
            <button
              type="button"
              className={styles.menuButton}
              aria-label="More options"
              disabled
              title="No additional actions available yet."
            >
              <MoreVertical size={18} />
            </button>
          </header>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Visitor Name</th>
                  <th>Target Unit</th>
                  <th>Arrival ETA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.summaryDetail}>
                      No pending visitor requests.
                    </td>
                  </tr>
                ) : (
                  pendingVisitors.map((visitor) => (
                    <tr key={visitor.request_id}>
                      <td>
                        <div className={styles.visitorCell}>
                          <span className={styles.avatar}>{initialsFor(visitor.visitor_name)}</span>
                          <span>{visitor.visitor_name}</span>
                        </div>
                      </td>
                      <td>{visitor.unit_number}</td>
                      <td>{formatTime(visitor.scheduled_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.approveButton}
                            onClick={() => handleVisitorAction(visitor.request_id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={styles.rejectButton}
                            onClick={() => handleVisitorAction(visitor.request_id, "Rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className={styles.tableFooter}>
            <Link href="/admin/visitor-management" className={styles.viewAllLink}>
              View all pending requests
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </footer>
        </article>

        <article className={styles.activityCard}>
          <header className={styles.activityHeader}>
            <div className={styles.activityTitleWrap}>
              <span className={styles.activityClock} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <h2 className={styles.sectionTitle}>System Activity</h2>
            </div>
          </header>

          <ul className={styles.activityList}>
            {activity.length === 0 ? (
              <li className={styles.activityItem}>
                <div className={styles.activityContent}>
                  <p>No recent activity.</p>
                </div>
              </li>
            ) : (
              activity.map((item, index) => {
                const Icon = iconForLogType(item.log_type);
                const isLast = index === activity.length - 1;
                const tone = toneForSeverity(item.severity);

                return (
                  <li key={item.id} className={styles.activityItem}>
                    <div className={styles.activityTimeline}>
                      <div className={`${styles.activityIcon} ${styles[`activity${tone}`]}`}>
                        <Icon size={16} aria-hidden="true" />
                      </div>
                      {!isLast ? <span className={styles.timelineLine} aria-hidden="true" /> : null}
                    </div>
                    <div className={styles.activityContent}>
                      <strong>{item.log_type}</strong>
                      <p>{item.message}</p>
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </article>
      </section>

      {openMetric ? (
        <DetailModal
          title={detail?.title ?? "Details"}
          subtitle={detail?.subtitle ?? undefined}
          rows={detail?.rows ?? []}
          loading={detailLoading}
          error={detailError}
          emptyMessage="Nothing in this category right now."
          rowActionLabel="Open"
          onRowSelect={(row) => router.push(rowDestination(openMetric, row))}
          onRetry={() => openDetail(openMetric)}
          onClose={() => {
            setOpenMetric(null);
            setDetail(null);
            setDetailError(null);
          }}
        />
      ) : null}
    </div>
  );
}
