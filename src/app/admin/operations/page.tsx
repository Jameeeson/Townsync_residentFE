"use client";

import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import DetailModal, { type DetailRow, type DetailTone } from "@/components/ui/detail-modal";
import {
  Megaphone,
  Bot,
  ChevronDown,
  Bold,
  Italic,
  List,
  Link2,
  Calendar,
  MessageSquare,
  Smile,
  UserMinus,
  ClipboardList,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import styles from "@/components/styles/Communications.module.css";
import { parseServerDate } from "@/lib/datetime";

type TabType = "announcements" | "ai-chatbot";

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("announcements");

  return (
    <AdminShell>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Communications & AI Monitoring</h1>
            <p>Manage community announcements and review AI-driven resident interactions.</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className={styles.tabNav}>
          <button 
            className={activeTab === "announcements" ? styles.activeTab : ""} 
            onClick={() => setActiveTab("announcements")}
          >
            <Megaphone size={18} /> Announcement Management
          </button>
          <button 
            className={activeTab === "ai-chatbot" ? styles.activeTab : ""} 
            onClick={() => setActiveTab("ai-chatbot")}
          >
            <Bot size={18} /> AI Chatbot Monitoring
          </button>
        </nav>

        <main className={styles.content}>
          {activeTab === "announcements" ? (
            <AnnouncementTab />
          ) : (
            <AIChatbotTab />
          )}
        </main>
      </div>
    </AdminShell>
  );
}

/* --- VIEW: ANNOUNCEMENT MANAGEMENT --- */
type AnnouncementMetrics = {
  active_count: number;
  scheduled_count: number;
  expired_30_days_count: number;
};

type NoticeState = "active" | "scheduled" | "expired";

type NoticeItem = {
  announcement_id: number;
  title: string;
  content: string | null;
  category: string | null;
  priority: string | null;
  target_audience: string | null;
  publish_date: string | null;
  expiry_date: string | null;
  is_pinned: boolean;
  author: string | null;
  state: string;
};

type NoticeListResponse = { state: string; count: number; items: NoticeItem[] };

const NOTICE_COPY: Record<NoticeState, { title: string; subtitle: string; empty: string }> = {
  active: {
    title: "Active Notices",
    subtitle: "Published and not yet expired",
    empty: "No notices are live right now.",
  },
  scheduled: {
    title: "Scheduled Notices",
    subtitle: "Publish date is still in the future",
    empty: "Nothing is queued to publish.",
  },
  expired: {
    title: "Expired Notices (last 30 days)",
    subtitle: "Ran out within the past month",
    empty: "Nothing has expired in the last 30 days.",
  },
};

/** Backend sends SQLite "YYYY-MM-DD HH:MM:SS" strings, not ISO. */
function formatNoticeDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = parseServerDate(value);
  if (!parsed) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function noticeToRow(n: NoticeItem): DetailRow {
  const published = formatNoticeDate(n.publish_date);
  const expires = formatNoticeDate(n.expiry_date);
  const timing =
    n.state === "scheduled"
      ? `Publishes ${published ?? "-"}`
      : n.state === "expired"
        ? `Expired ${expires ?? "-"}`
        : `Published ${published ?? "-"}${expires ? ` \u00b7 until ${expires}` : " \u00b7 no end date"}`;
  const tone: DetailTone =
    n.priority === "Urgent" ? "danger" : n.state === "expired" ? "neutral" : "info";
  return {
    id: n.announcement_id,
    primary: n.is_pinned ? `\ud83d\udccc ${n.title}` : n.title,
    secondary: `${n.category ?? "General"} \u00b7 ${n.target_audience ?? "All"}${
      n.author ? ` \u00b7 by ${n.author}` : ""
    }`,
    meta: timing,
    badge: n.priority ?? null,
    tone,
  };
}

const AUDIENCE_OPTIONS: { value: "All" | "Resident" | "Staff"; label: string }[] = [
  { value: "All", label: "All Residents" },
  { value: "Resident", label: "Homeowners & Tenants" },
  { value: "Staff", label: "Staff Only" },
];

function AnnouncementTab() {
  const { toast, toastError } = useToast();
  const [metrics, setMetrics] = useState<AnnouncementMetrics | null>(null);
  const [noticeState, setNoticeState] = useState<NoticeState | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesError, setNoticesError] = useState<string | null>(null);
  const [expandedNoticeId, setExpandedNoticeId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState<"All" | "Resident" | "Staff">("All");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<"Normal" | "Important" | "Urgent">("Normal");
  const [isPinned, setIsPinned] = useState(false);
  const [effectivityDate, setEffectivityDate] = useState("");
  const [validUntilDate, setValidUntilDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMetrics = () => {
    apiGet<AnnouncementMetrics>("/api/v1/admin/operations/announcements/metrics")
      .then(setMetrics)
      .catch(() => setMetrics(null));
  };

  useEffect(loadMetrics, []);

  const handlePublish = async () => {
    if (!title || !content || !effectivityDate || !validUntilDate) {
      setFeedback("Title, message body, effectivity date, and valid-until date are required.");
      return;
    }
    if (new Date(validUntilDate) < new Date(effectivityDate)) {
      setFeedback("Valid Until must be on or after the Effectivity Date.");
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiPost("/api/v1/admin/operations/announcements", {
        title,
        content,
        target_audience: targetAudience,
        publish_date: effectivityDate,
        expiry_date: validUntilDate,
        category,
        priority,
        is_pinned: isPinned,
      });
      setFeedback("Announcement published.");
      toast("Announcement published.", "success");
      setTitle("");
      setContent("");
      setEffectivityDate("");
      setValidUntilDate("");
      setPriority("Normal");
      setIsPinned(false);
      loadMetrics();
    } catch (err) {
      toastError(err, "Could not publish the announcement.");
      setFeedback(err instanceof Error ? err.message : "Failed to publish announcement");
    } finally {
      setSubmitting(false);
    }
  };

  // Opens the notices behind a tile. The backend buckets them with the same
  // active/scheduled/expired split the metrics query counts with.
  const openNotices = async (state: NoticeState) => {
    setNoticeState(state);
    setExpandedNoticeId(null);
    setNoticesLoading(true);
    setNoticesError(null);
    try {
      const data = await apiGet<NoticeListResponse>(
        `/api/v1/admin/operations/announcements?state=${state}`,
      );
      setNotices(data.items);
    } catch (err) {
      setNoticesError(
        err instanceof Error ? err.message : "Could not load the notice list.",
      );
    } finally {
      setNoticesLoading(false);
    }
  };

  return (
    <div className={styles.tabContent}>
      <section className={styles.statsGrid}>
        <button type="button" className={`${styles.statCard} ${styles.statCardBtn}`}
          onClick={() => openNotices("active")} aria-haspopup="dialog">
          <p className={styles.statLabel}>ACTIVE NOTICES</p>
          <div className={styles.statValue}>{metrics ? metrics.active_count : "—"}</div>
          <span className={styles.statHint}>View notices →</span>
        </button>
        <button type="button" className={`${styles.statCard} ${styles.statCardBtn}`}
          onClick={() => openNotices("scheduled")} aria-haspopup="dialog">
          <p className={styles.statLabel}>SCHEDULED</p>
          <div className={styles.statValue}>{metrics ? metrics.scheduled_count : "—"}</div>
          <span className={styles.statHint}>View notices →</span>
        </button>
        <button type="button" className={`${styles.statCard} ${styles.statCardBtn}`}
          onClick={() => openNotices("expired")} aria-haspopup="dialog">
          <p className={styles.statLabel}>EXPIRED (30D)</p>
          <div className={styles.statValue}>{metrics ? metrics.expired_30_days_count : "—"}</div>
          <span className={styles.statHint}>View notices →</span>
        </button>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}><h2>Compose Announcement</h2></div>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input
              type="text"
              placeholder="e.g., Upcoming Pool Maintenance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Message Body</label>
            <div className={styles.editor}>
              <div className={styles.toolbar}>
                <Bold size={16} /> <Italic size={16} /> <List size={16} /> <Link2 size={16} />
              </div>
              <textarea
                placeholder="Write your message here..."
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <div className={styles.formGroup}>
              <label>Target Audience</label>
              <div className={styles.selectBox}>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as "All" | "Resident" | "Staff")}
                >
                  {AUDIENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16}/>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Category</label>
              <div className={styles.selectBox}>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["General", "Maintenance", "Security", "Billing", "Event"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={16}/>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Priority</label>
              <div className={styles.selectBox}>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "Normal" | "Important" | "Urgent")}
                >
                  <option value="Normal">Normal</option>
                  <option value="Important">Important</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <ChevronDown size={16}/>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />{" "}
                Pin to top of resident feed
              </label>
            </div>
            <div className={styles.formGroup}>
              <label>Effectivity Date</label>
              <div className={styles.iconInput}>
                <Calendar size={16}/>
                <input
                  type="datetime-local"
                  value={effectivityDate}
                  onChange={(e) => setEffectivityDate(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Valid Until</label>
              <div className={styles.iconInput}>
                <Calendar size={16}/>
                <input
                  type="datetime-local"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                />
              </div>
            </div>
            {feedback ? <p className={styles.subTrend}>{feedback}</p> : null}
            <button className={styles.primaryBtn} onClick={handlePublish} disabled={submitting}>
              {submitting ? "Publishing..." : "Publish Now"}
            </button>
          </div>
        </aside>
      </div>

      {noticeState ? (
        <DetailModal
          title={NOTICE_COPY[noticeState].title}
          subtitle={NOTICE_COPY[noticeState].subtitle}
          rows={notices.map((n) => ({
            ...noticeToRow(n),
            expanded:
              expandedNoticeId === n.announcement_id
                ? n.content?.trim() || "This notice has no message body."
                : null,
          }))}
          rowActionLabel={expandedNoticeId ? "Hide" : "Read"}
          onRowSelect={(row) =>
            setExpandedNoticeId((current) =>
              current === Number(row.id) ? null : Number(row.id),
            )
          }
          loading={noticesLoading}
          error={noticesError}
          emptyMessage={NOTICE_COPY[noticeState].empty}
          onRetry={() => openNotices(noticeState)}
          onClose={() => {
            setNoticeState(null);
            setNotices([]);
            setNoticesError(null);
            setExpandedNoticeId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* --- VIEW: AI CHATBOT MONITORING --- */
type AiMonitoringMetrics = {
  total_triaged_requests: number;
  avg_confidence_score: number;
  emergency_priority_count: number;
  top_suggested_categories: { category: string; count: number }[];
};

type TrendMonitoring = {
  metric_period: string;
  overall_sentiment_score: number;
  trend_data: { date: string; day_label: string; positive_percentage: number; total_conversations: number }[];
  trending_keywords: { keyword: string; count: number }[];
};

type ActivityTrends = {
  days: number;
  dates: string[];
  maintenance_created: number[];
  visitors_scheduled: number[];
  payments_collected: number[];
};

const ACTIVITY_SERIES = [
  { key: "maintenance_created", label: "Tickets", unit: "tickets" },
  { key: "visitors_scheduled", label: "Visitors", unit: "visitors" },
  { key: "payments_collected", label: "Payments", unit: "collected" },
] as const;

function ActivityTrendsCard() {
  const [data, setData] = useState<ActivityTrends | null>(null);
  const [failed, setFailed] = useState(false);
  const [series, setSeries] = useState<(typeof ACTIVITY_SERIES)[number]["key"]>("maintenance_created");

  useEffect(() => {
    apiGet<ActivityTrends>("/api/v1/admin/operations/activity-trends?days=14")
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const values = data ? data[series] : [];
  const max = Math.max(1, ...values);
  const active = ACTIVITY_SERIES.find((x) => x.key === series)!;

  return (
    <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
      <h3>Community Activity (14 days)</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {ACTIVITY_SERIES.map((x) => (
          <button
            key={x.key}
            type="button"
            className={x.key === series ? styles.tagBlue : styles.tagMuted}
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => setSeries(x.key)}
          >
            {x.label}
          </button>
        ))}
      </div>
      {failed ? (
        <p className={styles.subText}>Activity data could not be loaded.</p>
      ) : !data ? (
        <p className={styles.subText}>Loading...</p>
      ) : (
        <>
          <div className={styles.chartMock}>
            {values.map((v, i) => (
              <div
                key={data.dates[i]}
                className={styles.bar}
                style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 1, opacity: v > 0 ? 1 : 0.2 }}
                title={`${data.dates[i]}: ${v} ${active.unit}`}
              />
            ))}
          </div>
          <div className={styles.chartLabels}>
            <span>{data.dates[0]}</span>
            <span>Total: {values.reduce((a, b) => a + b, 0).toLocaleString()}</span>
            <span>{data.dates[data.dates.length - 1]}</span>
          </div>
        </>
      )}
    </div>
  );
}

function AIChatbotTab() {
  const [metrics, setMetrics] = useState<AiMonitoringMetrics | null>(null);
  const [trend, setTrend] = useState<TrendMonitoring | null>(null);

  useEffect(() => {
    apiGet<AiMonitoringMetrics>("/api/v1/admin/operations/ai-monitoring/metrics")
      .then(setMetrics)
      .catch(() => setMetrics(null));
    apiGet<TrendMonitoring>("/api/v1/admin/operations/trend-monitoring")
      .then(setTrend)
      .catch(() => setTrend(null));
  }, []);

  const topCategory = metrics?.top_suggested_categories[0];

  return (
    <div className={styles.tabContent}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Total Triaged Requests</p><div className={styles.iconBox}><MessageSquare size={18} color="#1f4a9e"/></div></div>
          <div className={styles.statValue}>{metrics ? metrics.total_triaged_requests : "—"}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Avg. Sentiment Score</p><Smile size={18} color="#10b981"/></div>
          <div className={styles.statValue}>{trend ? `${trend.overall_sentiment_score}%` : "—"}</div>
          {trend ? (
            <div className={styles.progressBase}><div className={styles.progressBar} style={{width: `${trend.overall_sentiment_score}%`, background: '#10b981'}} /></div>
          ) : null}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Emergency Priority</p><UserMinus size={18} color="#dc2626"/></div>
          <div className={styles.statValue}>{metrics ? metrics.emergency_priority_count : "—"}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIconHeader}><p className={styles.statLabel}>Top Intent</p><ClipboardList size={18} color="#92400e"/></div>
          <div className={styles.statValue} style={{fontSize: '1.25rem'}}>{topCategory?.category ?? "—"}</div>
          <p className={styles.subText}>{topCategory ? `${topCategory.count} cases` : ""}</p>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Recent Interactions</h2>
          </div>
          <p className={styles.subText}>
            The backend does not yet expose a per-conversation transcript list for admins — only aggregated metrics above.
          </p>
        </section>

        <aside className={styles.sidebar}>
          <ActivityTrendsCard />
          <div className={styles.card} style={{marginBottom: '1.5rem'}}>
            <h3>Sentiment Trends</h3>
            <div className={styles.chartMock}>
              {(trend?.trend_data ?? []).map((day, i) => (
                <div
                  key={day.date}
                  className={styles.bar}
                  style={{ height: `${day.positive_percentage}%`, opacity: i === (trend?.trend_data.length ?? 1) - 1 ? 1 : 0.2 }}
                  title={`${day.day_label}: ${day.positive_percentage}% positive (${day.total_conversations} conversations)`}
                />
              ))}
            </div>
            <div className={styles.chartLabels}><span>{trend?.metric_period ?? "Last 7 Days"}</span></div>
          </div>
          <div className={styles.card}>
            <h3>Trending Keywords</h3>
            <div className={styles.tagCloud}>
              {(trend?.trending_keywords ?? []).length === 0 ? (
                <span className={styles.tagMuted}>No keyword data yet</span>
              ) : (
                trend?.trending_keywords.map((kw) => (
                  <span key={kw.keyword} className={styles.tagBlue}>
                    {kw.keyword} ({kw.count})
                  </span>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}