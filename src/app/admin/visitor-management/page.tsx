"use client";

import React, { Suspense, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Activity,
  Settings,
  Filter,
  CheckCircle2,
  Phone,
  Clock,
  Calendar,
  ShieldAlert,
  Car,
  Monitor,
  Radio,
  Save,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Mail,
  Info,
  Search,
  Bell,
} from "lucide-react";
import styles from "@/components/styles/VisitorManagement.module.css";
import AdminShell from "../../../components/admin/admin-shell";
import { parseServerDate } from "@/lib/datetime";

type TabType = "approvals" | "monitoring" | "policy";

type VisitorRequest = {
  request_id: string;
  visitor_name: string;
  visit_purpose: string;
  scheduled_at: string;
  status: string;
  resident_name: string;
  unit_number: string;
  qr_token?: string;
  companions?: string[];
  party_size?: number;
  resident_deleted?: boolean;
};

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Expired"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const PAGE_SIZE = 50;

type StatusCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
};

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

function parseTab(value: string | null): TabType {
  return value === "monitoring" || value === "policy" ? value : "approvals";
}

function VisitorManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The tab is known at mount, so it seeds state directly — no effect needed.
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    parseTab(searchParams.get("tab")),
  );
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);
  const deepLinkRequestId = searchParams.get("request");

  const handleSelectVisitor = (visitor: VisitorRequest) => {
    setSelectedVisitor(visitor);
    if (deepLinkRequestId) router.replace("/admin/visitor-management", { scroll: false });
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedVisitor(null);
    if (searchParams.toString()) {
      router.replace("/admin/visitor-management", { scroll: false });
    }
  };

  return (
    <AdminShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Visitor & Security Management</h1>
            <p>Monitor facility access and manage guest approvals.</p>
          </div>
        </header>

        <nav className={styles.tabNav} aria-label="Management Sections">
          <button
            type="button"
            className={activeTab === "approvals" ? styles.activeTab : undefined}
            onClick={() => switchTab("approvals")}
          >
            <Users size={18} /> Visitor Approvals
          </button>
          <button
            type="button"
            className={activeTab === "monitoring" ? styles.activeTab : undefined}
            onClick={() => switchTab("monitoring")}
          >
            <Activity size={18} /> Active Monitoring
          </button>
          <button
            type="button"
            className={activeTab === "policy" ? styles.activeTab : undefined}
            onClick={() => switchTab("policy")}
          >
            <Settings size={18} /> Policy Settings
          </button>
        </nav>

        <div className={styles.content}>
          {activeTab === "approvals" &&
            (selectedVisitor ? (
              <VisitorDetail visitor={selectedVisitor} onBack={() => setSelectedVisitor(null)} />
            ) : (
              <VisitorApprovalsTable
                onSelect={handleSelectVisitor}
                deepLinkRequestId={deepLinkRequestId}
              />
            ))}
          {activeTab === "monitoring" && <ActiveMonitoringView />}
          {activeTab === "policy" && <PolicySettingsView />}
        </div>
      </div>
    </AdminShell>
  );
}

function VisitorApprovalsTable({
  onSelect,
  deepLinkRequestId,
}: {
  onSelect: (v: VisitorRequest) => void;
  deepLinkRequestId?: string | null;
}) {
  const { toast, toastError } = useToast();
  const [requests, setRequests] = useState<VisitorRequest[]>([]);
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const visibleRequests = requests;
  // Status now lives in the always-visible chip row; the filter icon only
  // covers the date range, so only that counts toward "filters active".
  const activeFilterCount = (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      status_filter: statusFilter,
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("sort", sortBy);
    apiGet<VisitorRequest[]>(`/api/v1/admin/visitor-management/requests?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setRequests(data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load requests");
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, debouncedSearch, dateFrom, dateTo, sortBy, page, reloadKey]);

  // Powers the number on each status chip. Reuses the same date/search scope
  // as the list (but not status_filter, since it asks for every status at
  // once) and the same query the list runs, so a chip's count can never
  // disagree with what clicking it shows.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    apiGet<StatusCounts>(`/api/v1/admin/visitor-management/requests/counts?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
        // Non-critical: the chips still work as filters without their counts.
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, dateFrom, dateTo, reloadKey]);

  // Arriving from a dashboard drill-down: open that request as soon as the list
  // containing it has loaded. onSelect clears the query param, so this cannot
  // re-fire and drag the admin back after they navigate away.
  useEffect(() => {
    if (!deepLinkRequestId) return;
    const match = requests.find((r) => String(r.request_id) === deepLinkRequestId);
    if (match) onSelect(match);
  }, [deepLinkRequestId, requests, onSelect]);

  const handleAction = async (requestId: string, action: "Approved" | "Rejected") => {
    try {
      await apiPost(`/api/v1/admin/visitor-management/requests/${requestId}/action`, { action });
      toast(
        `Visitor request #${requestId} ${action === "Approved" ? "approved" : "rejected"}.`,
        action === "Approved" ? "success" : "info",
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastError(err, "Could not update this visitor request.");
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>{statusFilter === "All" ? "All Visitor Requests" : `${statusFilter} Visitor Requests`}</h2>
        <div className={styles.cardActions}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search visitors..."
              value={searchTerm}
              maxLength={100}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Sort and filter"
            aria-expanded={showFilters}
            title={activeFilterCount + (sortBy !== "newest" ? 1 : 0) ? "Sort or filter is active" : "Sort and filter by date"}
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Approved and Rejected requests were previously only reachable behind
          the filter icon's hidden dropdown. Every status is now one click
          away, with the count it actually holds, so nothing here is a request
          the admin has to go hunting for. */}
      <div className={styles.statusChips} role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((s) => {
          const key = s.toLowerCase() as keyof StatusCounts;
          const count = counts ? counts[key] : null;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={statusFilter === s}
              data-tone={s.toLowerCase()}
              className={styles.statusChip}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s}
              <span className={styles.statusChipCount}>{count ?? "·"}</span>
            </button>
          );
        })}
      </div>

      {showFilters ? (
        <div className={styles.filterPanel}>
          <div className={styles.inputGroup}>
            <label htmlFor="visitor-sort">Sort by</label>
            <select
              id="visitor-sort"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest request first</option>
              <option value="oldest">Oldest request first</option>
              <option value="visit_soon">Visit date: soonest</option>
              <option value="visit_late">Visit date: latest</option>
              <option value="name">Visitor name (A-Z)</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="visitor-date-from">Scheduled from</label>
            <input
              id="visitor-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="visitor-date-to">Scheduled to</label>
            <input
              id="visitor-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={activeFilterCount === 0}
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      ) : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Visitor Name</th>
              <th>Resident Requesting</th>
              <th>Target Unit</th>
              <th>Date/Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRequests.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  {searchTerm.trim() || activeFilterCount > 0
                    ? "No visitor requests match your filters."
                    : statusFilter === "All"
                      ? "No visitor requests yet."
                      : `No ${statusFilter.toLowerCase()} visitor requests.`}
                </td>
              </tr>
            ) : (
              visibleRequests.map((req) => (
                <tr
                  key={req.request_id}
                  className={styles.clickableRow}
                  onClick={() => onSelect(req)}
                >
                  <td>
                    <div className={styles.visitorCell}>
                      <div className={styles.avatar}>{initialsFor(req.visitor_name)}</div>
                      <div className={styles.visitorName}>
                        <strong>{req.visitor_name}</strong>
                        <span>{req.visit_purpose}</span>
                        {req.companions && req.companions.length > 0 ? (
                          <span title={req.companions.join(", ")}>
                            +{req.companions.length} guest{req.companions.length === 1 ? "" : "s"}:{" "}
                            {req.companions.join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    {req.resident_name}
                    {req.resident_deleted ? <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 999, background: "#e2e8f0", color: "#475569", fontSize: "0.68rem", fontWeight: 700 }}>Account deleted</span> : null}
                  </td>
                  <td>{req.unit_number}</td>
                  <td>{formatTime(req.scheduled_at)}</td>
                  <td>
                    <span
                      className={
                        req.status === "Approved"
                          ? styles.badgeApproved
                          : req.status === "Rejected"
                            ? styles.badgeRejected
                            : req.status === "Expired"
                              ? styles.badgeMuted
                              : styles.badgePending
                      }
                    >
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                      {req.status === "Pending" ? (
                        <>
                          <button
                            type="button"
                            className={styles.approveBtnAction}
                            onClick={() => handleAction(req.request_id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={styles.rejectBtnAction}
                            onClick={() => handleAction(req.request_id, "Rejected")}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button type="button" className={styles.secondaryBtn} onClick={() => onSelect(req)}>
                          View
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.pager}>
        <span>Page {page}</span>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={requests.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

type VisitorDetailApi = {
  request_id: number;
  visitor_name: string;
  visit_purpose: string;
  scheduled_at: string;
  status: string;
  resident_name: string;
  unit_number: string;
  resident_phone: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  vehicle_plate: string | null;
  vehicle_type: string | null;
  access_expires_at: string | null;
  companions?: string[];
  party_size?: number;
  estimated_duration_minutes?: number | null;
  estimated_duration_label?: string | null;
  estimated_departure_at?: string | null;
  duration_source?: "actual" | "policy_max_stay" | null;
};

type AccessLogEntry = {
  log_id: string;
  visitor_name: string;
  time_in: string;
  time_out: string | null;
  resident_destination: string;
  unit_number: string;
  verified_by: string | null;
};

function VisitorDetail({
  visitor,
  onBack,
}: {
  visitor: VisitorRequest;
  onBack: () => void;
}) {
  const { toast, toastError } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<VisitorDetailApi | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  useEffect(() => {
    apiGet<VisitorDetailApi>(`/api/v1/admin/visitor-management/requests/${visitor.request_id}`)
      .then(setDetail)
      .catch(() => setDetail(null));
    apiGet<AccessLogEntry[]>(`/api/v1/admin/visitor-management/requests/${visitor.request_id}/access-logs`)
      .then(setAccessLogs)
      .catch(() => setAccessLogs([]));
  }, [visitor.request_id]);

  const handleAction = async (action: "Approved" | "Rejected") => {
    try {
      await apiPost(`/api/v1/admin/visitor-management/requests/${visitor.request_id}/action`, {
        action,
      });
      toast(
        `${visitor.visitor_name} ${action === "Approved" ? "approved" : "rejected"}.`,
        action === "Approved" ? "success" : "info",
      );
      onBack();
    } catch (err) {
      toastError(err, "Could not update this visitor request.");
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <div className={styles.detailView}>
      <nav className={styles.breadcrumb}>
        <button type="button" onClick={onBack}>
          Visitors
        </button>
        <ChevronRight size={14} />
        <button type="button" onClick={onBack}>
          Pending Requests
        </button>
        <ChevronRight size={14} />
        <span className={styles.activeBreadcrumb}>{visitor.visitor_name}</span>
      </nav>

      <div className={styles.detailHeader}>
        <button type="button" onClick={onBack} className={styles.backBtn}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>Visitor Profile</h1>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <div className={styles.statusBanner}>
        <div className={styles.statusInfo}>
          <div className={styles.statusIconBox}>
            <Clock size={20} color="#f59e0b" />
          </div>
          <div>
            <p className={styles.kicker}>CURRENT STATUS</p>
            <h3>{visitor.status}</h3>
          </div>
        </div>
        {visitor.status === "Pending" ? (
          <div className={styles.bannerActions}>
            <button type="button" className={styles.rejectBtnOutline} onClick={() => handleAction("Rejected")}>
              Reject Request
            </button>
            <button type="button" className={styles.confirmBtn} onClick={() => handleAction("Approved")}>
              <CheckCircle2 size={18} /> Confirm Approval
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.card}>
          <div className={styles.profileHeader}>
            <div className={styles.largeAvatar}>{initialsFor(visitor.visitor_name)}</div>
            <div className={styles.profileMeta}>
              <h3>{visitor.visitor_name}</h3>
              <p>{visitor.visit_purpose}</p>
              <div className={styles.badgeRow}>
                <span className={styles.badgeMuted}>{visitor.status}</span>
              </div>
            </div>
          </div>
          <div className={styles.contactInfo}>
            <div className={styles.infoField}>
              <label>Phone Number</label>
              <p>
                <Phone size={14} /> {detail?.visitor_phone || "Not provided"}
              </p>
            </div>
            <div className={styles.infoField}>
              <label>Email Address</label>
              <p>
                <Mail size={14} /> {detail?.visitor_email || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Party ({detail?.party_size ?? visitor.party_size ?? 1})
          </h3>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Users size={18} />
            </div>
            <div>
              <label>Named visitor</label>
              <p>{visitor.visitor_name}</p>
            </div>
          </div>
          {(detail?.companions ?? visitor.companions ?? []).length > 0 ? (
            (detail?.companions ?? visitor.companions ?? []).map((guest) => (
              <div key={guest} className={styles.infoRow}>
                <div className={styles.infoIcon}>
                  <Users size={18} />
                </div>
                <div>
                  <label>Additional guest</label>
                  <p>{guest}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No additional guests on this pass.</p>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Host Information</h3>
          <div className={styles.hostBox}>
            <div className={styles.hostAvatar} />
            <div className={styles.hostMeta}>
              <strong>{visitor.resident_name}</strong>
              <p>{visitor.unit_number}</p>
            </div>
          </div>
          {detail?.resident_phone ? (
            <a href={`tel:${detail.resident_phone}`} className={styles.secondaryBtn} style={{ textDecoration: "none", display: "inline-flex" }}>
              <MessageSquare size={16} /> Contact Resident ({detail.resident_phone})
            </a>
          ) : (
            <button type="button" className={styles.secondaryBtn} disabled title="No phone number on file for this resident.">
              <MessageSquare size={16} /> Contact Resident
            </button>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Vehicle Details</h3>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Car size={18} />
            </div>
            <div>
              <label>Make & Model</label>
              <p>{detail?.vehicle_type || "Not provided"}</p>
            </div>
          </div>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>
              <Radio size={18} />
            </div>
            <div>
              <label>License Plate</label>
              <p>{detail?.vehicle_plate || "Not provided"}</p>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Schedule Details</h3>
          <div className={styles.infoRow}>
            <Calendar size={18} color="#2563eb" />
            <div>
              <label>Expected Arrival</label>
              <p>{formatTime(visitor.scheduled_at)}</p>
            </div>
          </div>
          <div className={styles.infoRow}>
            <Clock size={18} color="#2563eb" />
            <div>
              <label>Estimated Duration</label>
              {detail?.estimated_duration_label ? (
                <p
                  title={
                    detail.duration_source === "actual"
                      ? "Actual time on-site from gate check-in/check-out."
                      : "Upper bound from the maximum-stay security policy."
                  }
                >
                  {detail.duration_source === "actual"
                    ? detail.estimated_duration_label
                    : `Up to ${detail.estimated_duration_label}`}
                  {detail.estimated_departure_at
                    ? ` (${detail.duration_source === "actual" ? "left" : "until"} ${formatTime(detail.estimated_departure_at)})`
                    : ""}
                </p>
              ) : (
                <p>Not available</p>
              )}
            </div>
          </div>
          <div className={styles.infoRow}>
            <ShieldAlert size={18} color="#dc2626" />
            <div>
              <label>Access Expiration</label>
              <p>{detail?.access_expires_at ? formatTime(detail.access_expires_at) : "Not available"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: "1.5rem" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Previous Access Logs</h3>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Unit Visited</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.length === 0 ? (
                <tr>
                  <td colSpan={5}>No data available.</td>
                </tr>
              ) : (
                accessLogs.map((log) => (
                  <tr key={log.log_id}>
                    <td>{formatTime(log.time_in).split(",")[0]}</td>
                    <td>{formatTime(log.time_in)}</td>
                    <td>{log.time_out ? formatTime(log.time_out) : "Still on-site"}</td>
                    <td>{log.unit_number}</td>
                    <td>{log.time_out ? "Completed" : "On-site"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type LiveMonitoring = {
  visitors_currently_inside: number;
  system_logins_last_hour: number;
  latest_system_activity: string | null;
};

type EntryLog = {
  log_id: string;
  visitor_name: string;
  time_in: string;
  time_out: string | null;
  resident_destination: string;
  unit_number: string;
  verified_by: string | null;
};

function ActiveMonitoringView() {
  const [live, setLive] = useState<LiveMonitoring | null>(null);
  const [logs, setLogs] = useState<EntryLog[]>([]);

  useEffect(() => {
    apiGet<LiveMonitoring>("/api/v1/admin/visitor-management/live-monitoring")
      .then(setLive)
      .catch(() => setLive(null));
    apiGet<EntryLog[]>("/api/v1/admin/visitor-management/entry-logs?page=1&page_size=10")
      .then(setLogs)
      .catch(() => setLogs([]));
  }, []);

  return (
    <div className={styles.monitoringLayout}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Monitor size={24} color="#1f4a9e" />
            <span className={styles.liveIndicator}>LIVE</span>
          </div>
          <p>Active Visitors</p>
          <h2>{live ? live.visitors_currently_inside : "—"}</h2>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Radio size={24} color="#f59e0b" />
            <span className={styles.recentIndicator}>RECENT</span>
          </div>
          <p>System Logins</p>
          <h2>
            {live ? live.system_logins_last_hour : "—"} <small>in last hour</small>
          </h2>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <CheckCircle2 size={24} color="#10b981" />
            <span className={styles.liveIndicator}>LIVE</span>
          </div>
          <p>Latest Activity</p>
          <p className={styles.smallMuted}>{live?.latest_system_activity ?? "No recent activity"}</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Live Access Logs</h2>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Visitor Name</th>
              <th>Resident/Unit</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4}>No entry logs available.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.log_id}>
                  <td className={styles.timeCell}>{formatTime(log.time_in)}</td>
                  <td className={styles.timeCell}>{log.time_out ? formatTime(log.time_out) : "—"}</td>
                  <td>{log.visitor_name}</td>
                  <td>
                    {log.unit_number} - {log.resident_destination}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SecurityPolicy = {
  operating_hours: string;
  max_stay_hours: number;
  concurrent_unit_limit: number;
  auto_approve_trusted_providers: boolean;
  auto_approve_recurring_guests: boolean;
  alert_subscriptions: string[];
};

const ALERT_OPTIONS: { value: string; label: string }[] = [
  { value: "overstay", label: "Overstayed Visitors" },
  { value: "unauthorized_entry", label: "Unauthorized Entry Attempts" },
  { value: "gate_malfunction", label: "Gate Malfunctions" },
];

function splitHours(hours: string): [string, string] {
  const [open = "", close = ""] = hours.split("-");
  return [open, close];
}

function PolicySettingsView() {
  const { toast, toastError } = useToast();
  const [saved, setSaved] = useState<SecurityPolicy | null>(null);
  const [draft, setDraft] = useState<SecurityPolicy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiGet<SecurityPolicy>("/api/v1/admin/visitor-management/policy")
      .then((data) => {
        setSaved(data);
        setDraft(data);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load the security policy."));
  }, []);

  if (loadError) {
    return <p className={styles.errorText}>{loadError}</p>;
  }
  if (!draft || !saved) {
    return <p className={styles.note}>Loading policy...</p>;
  }

  const [openTime, closeTime] = splitHours(draft.operating_hours);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = (changes: Partial<SecurityPolicy>) => {
    setDraft({ ...draft, ...changes });
    setMessage(null);
  };
  const toggleAlert = (value: string) =>
    patch({
      alert_subscriptions: draft.alert_subscriptions.includes(value)
        ? draft.alert_subscriptions.filter((a) => a !== value)
        : [...draft.alert_subscriptions, value],
    });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiPut<SecurityPolicy>("/api/v1/admin/visitor-management/policy", draft);
      setSaved(result);
      setDraft(result);
      setMessage({ ok: true, text: "Security policy saved." });
      toast("Security policy saved.", "success");
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not save the policy." });
      toastError(err, "Could not save the policy.");
    } finally {
      setSaving(false);
    }
  };

  const numberField = (
    label: string,
    value: number,
    min: number,
    max: number,
    key: "max_stay_hours" | "concurrent_unit_limit",
  ) => (
    <div className={styles.inputGroup}>
      <label>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => patch({ [key]: Math.min(max, Math.max(min, Number(e.target.value) || min)) })}
      />
    </div>
  );

  return (
    <div className={styles.policyLayout}>
      <div className={styles.policyGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}>
              <Clock size={18} />
            </div>
            <h2>Gate Operating Hours</h2>
          </div>
          <div className={styles.timeInputs}>
            <div className={styles.inputGroup}>
              <label>Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => e.target.value && patch({ operating_hours: `${e.target.value}-${closeTime}` })}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => e.target.value && patch({ operating_hours: `${openTime}-${e.target.value}` })}
              />
            </div>
          </div>
          <div className={styles.timeInputs}>
            {numberField("Max Stay (hours)", draft.max_stay_hours, 1, 72, "max_stay_hours")}
            {numberField("Active Passes per Unit", draft.concurrent_unit_limit, 1, 50, "concurrent_unit_limit")}
          </div>
          <p className={styles.note}>
            <Info size={14} /> Emergency access is always granted regardless of these hours. The per-unit limit is
            enforced when residents request passes.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}>
              <ShieldAlert size={18} />
            </div>
            <h2>Auto-Approval Rules</h2>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <strong>Trusted Service Providers</strong>
              <p>Allow priority verified utility and courier staff.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.auto_approve_trusted_providers}
              aria-label="Trusted Service Providers"
              className={`${styles.switch} ${draft.auto_approve_trusted_providers ? "" : styles.switchOff}`}
              onClick={() => patch({ auto_approve_trusted_providers: !draft.auto_approve_trusted_providers })}
            >
              <div className={styles.switchHandle} />
            </button>
          </div>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <strong>Recurring Family Guests</strong>
              <p>Approve passes for frequent visitors automatically.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.auto_approve_recurring_guests}
              aria-label="Recurring Family Guests"
              className={`${styles.switch} ${draft.auto_approve_recurring_guests ? "" : styles.switchOff}`}
              onClick={() => patch({ auto_approve_recurring_guests: !draft.auto_approve_recurring_guests })}
            >
              <div className={styles.switchHandle} />
            </button>
          </div>
          <p className={styles.note}>
            <Info size={14} /> These preferences are saved; approvals are still processed manually until an
            auto-approval job is enabled.
          </p>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}>
              <Bell size={18} />
            </div>
            <h2>Security Notifications</h2>
          </div>
          <div className={styles.checkboxList}>
            {ALERT_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={draft.alert_subscriptions.includes(opt.value)}
                  onChange={() => toggleAlert(opt.value)}
                />{" "}
                {opt.label}
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.fixedFooter}>
        <p className={message && !message.ok ? styles.errorText : undefined}>
          {message ? message.text : dirty ? "You have unsaved changes." : "Policy is up to date."}
        </p>
        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.discardBtn}
            disabled={!dirty || saving}
            onClick={() => {
              setDraft(saved);
              setMessage(null);
            }}
          >
            Discard Changes
          </button>
          <button type="button" className={styles.saveBtn} disabled={!dirty || saving} onClick={handleSave}>
            <Save size={18} /> {saving ? "Saving..." : "Save Security Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}


// useSearchParams needs a Suspense boundary for this route to prerender.
export default function VisitorManagementPage() {
  return (
    <Suspense fallback={null}>
      <VisitorManagement />
    </Suspense>
  );
}
