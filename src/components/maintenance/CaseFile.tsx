"use client";

import { useState } from "react";
import { ChevronUp, ShieldAlert } from "lucide-react";
import styles from "@/styles/maintenance.module.css";
import type { AiSummaryState } from "@/lib/api/resident";
import type { ChatAttachment } from "@/hooks/useMaintenanceChat";
import { deriveReportFields, isUrgentSignal, reportCompletionCount } from "@/lib/maintenanceReport";
import { ReportField } from "./ReportField";

interface CaseFileProps {
  summaryState: AiSummaryState | null;
  isComplete: boolean;
  attachments: ChatAttachment[];
  onReviewSubmit: () => void;
}

export function CaseFile({ summaryState, isComplete, attachments, onReviewSubmit }: CaseFileProps) {
  const [expanded, setExpanded] = useState(false);

  // Pop the mobile sheet open automatically when the report reaches its milestone, so
  // completion isn't silently invisible behind a collapsed peek bar. Adjusted during
  // render (React's recommended pattern for resetting state on a prop transition)
  // rather than in an effect, which would cause an extra cascading render.
  const [wasComplete, setWasComplete] = useState(isComplete);
  if (isComplete !== wasComplete) {
    setWasComplete(isComplete);
    if (isComplete) setExpanded(true);
  }

  const fields = deriveReportFields(summaryState, isComplete);
  const { done, total } = reportCompletionCount(fields);
  const urgent = isUrgentSignal(fields);

  return (
    <div className={`${styles.caseFile} ${expanded ? styles.caseFileOpen : ""}`}>
      <button
        type="button"
        className={styles.casePeekHeader}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.casePeekSummary}>
          <span className={styles.casePeekLabel}>Your request</span>
          <span className={styles.casePeekMeta}>{done}/{total} complete</span>
        </span>
        <ChevronUp size={16} className={expanded ? styles.chevronOpen : undefined} />
      </button>

      <div className={styles.caseFileHeader}>
        <span className={styles.caseFileEyebrow}>Your request</span>
        <span className={styles.caseFileCount}>
          {done} / {total}
        </span>
      </div>

      <div className={`${styles.caseFileBody} ${expanded ? styles.caseFileBodyOpen : ""}`}>
        <div className={styles.caseFileBodyInner}>
          <div className={styles.fieldList}>
            {fields.map((f, i) => (
              <ReportField key={f.key} index={i + 1} label={f.label} value={f.value} collected={f.collected} />
            ))}
          </div>

          {attachments.length > 0 ? (
            <div className={styles.caseAttachments}>
              <div className={styles.caseAttachmentsLabel}>Attachments</div>
              <div className={styles.caseAttachmentsGrid}>
                {attachments.map((a) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.previewUrl} src={a.previewUrl} alt="" className={styles.caseAttachmentThumb} />
                ))}
              </div>
            </div>
          ) : null}

          {urgent ? (
            <div className={styles.safetyNote}>
              <ShieldAlert size={15} aria-hidden="true" />
              <p>
                If this is a life-threatening emergency, call emergency services immediately rather
                than waiting on this report.
              </p>
            </div>
          ) : null}

          {isComplete ? (
            <div className={`${styles.caseMilestone} ts-fade-in-up`}>
              <p className={styles.caseMilestoneText}>All required details collected.</p>
              <button type="button" className={styles.reviewBtn} onClick={onReviewSubmit}>
                Review report
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CaseFile;
