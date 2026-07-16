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
import styles from "./dashboard-overview.module.css";

const summaryCards = [
  {
    label: "Pending Visitor Requests",
    value: "12",
    detail: "+3 since 9AM",
    detailTone: "danger" as const,
    icon: Hand,
    iconTone: "danger" as const,
  },
  {
    label: "Maintenance Summary",
    value: "5 Open",
    detail: "2 High Priority",
    detailTone: "danger" as const,
    icon: Wrench,
    iconTone: "info" as const,
  },
  {
    label: "Billing Collection",
    value: "94%",
    badge: "On Target",
    badgeTone: "success" as const,
    icon: Wallet,
    iconTone: "success" as const,
  },
  {
    label: "Resident Security",
    value: "18 Active",
    detail: "Visitors Inside",
    detailTone: "muted" as const,
    icon: Shield,
    iconTone: "info" as const,
  },
];

const pendingVisitors = [
  {
    initials: "JD",
    name: "John Doe",
    unit: "Unit 402, Bldg B",
    eta: "Today 11:30 AM",
    highlighted: false,
  },
  {
    initials: "SS",
    name: "Sarah Smith",
    unit: "Unit 115, Bldg A",
    eta: "Today 12:00 PM",
    highlighted: false,
  },
  {
    initials: "MK",
    name: "Mike Johnson (Delivery)",
    unit: "Front Desk",
    eta: "Arrived",
    highlighted: true,
  },
];

const activityItems = [
  {
    title: "AI Chatbot Escalation",
    description: "User in Unit 201 asking about emergency water shutoff.",
    time: "10 mins ago",
    icon: Bot,
    tone: "info" as const,
  },
  {
    title: "Admin Login",
    description: "S. Manager logged in from 192.168.1.45",
    time: "45 mins ago",
    icon: LogIn,
    tone: "info" as const,
  },
  {
    title: "Batch Approval",
    description: "System auto-approved 5 recurring vendor passes.",
    time: "2 hrs ago",
    icon: CheckSquare,
    tone: "purple" as const,
  },
  {
    title: "Gate Sensor Offline",
    description: "North gate sensor has not reported in 15 minutes.",
    time: "3 hrs ago",
    icon: AlertTriangle,
    tone: "danger" as const,
  },
];

type DashboardOverviewProps = {
  onAddResident?: () => void;
  onGenerateReport?: () => void;
};

export default function DashboardOverview({
  onAddResident,
  onGenerateReport,
}: DashboardOverviewProps) {
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
            <span>May 19, 2026, 7:20 AM</span>
          </div>
        </div>

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
            <article key={card.label} className={styles.summaryCard}>
              <div className={styles.summaryTop}>
                <span className={styles.summaryLabel}>{card.label}</span>
                <div className={`${styles.summaryIcon} ${styles[`icon${card.iconTone}`]}`}>
                  <Icon size={18} aria-hidden="true" />
                </div>
              </div>
              <div className={styles.summaryValueRow}>
                <strong className={styles.summaryValue}>{card.value}</strong>
                {card.badge ? (
                  <span className={`${styles.badge} ${styles[`badge${card.badgeTone}`]}`}>
                    {card.badge}
                  </span>
                ) : null}
              </div>
              {card.detail ? (
                <p className={`${styles.summaryDetail} ${styles[`detail${card.detailTone}`]}`}>
                  {card.detailTone === "danger" ? "• " : ""}
                  {card.detail}
                </p>
              ) : null}
            </article>
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
            <button type="button" className={styles.menuButton} aria-label="More options">
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
                {pendingVisitors.map((visitor) => (
                  <tr
                    key={visitor.name}
                    className={visitor.highlighted ? styles.highlightedRow : undefined}
                  >
                    <td>
                      <div className={styles.visitorCell}>
                        <span className={styles.avatar}>{visitor.initials}</span>
                        <span>{visitor.name}</span>
                      </div>
                    </td>
                    <td>{visitor.unit}</td>
                    <td>{visitor.eta}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.approveButton}>
                          Approve
                        </button>
                        <button type="button" className={styles.rejectButton}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            {activityItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === activityItems.length - 1;

              return (
                <li key={item.title} className={styles.activityItem}>
                  <div className={styles.activityTimeline}>
                    <div className={`${styles.activityIcon} ${styles[`activity${item.tone}`]}`}>
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    {!isLast ? <span className={styles.timelineLine} aria-hidden="true" /> : null}
                  </div>
                  <div className={styles.activityContent}>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <span>{item.time}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </div>
  );
}
